import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { queues } from '../queue/connection.js';
import { ImportLog } from '../models/ImportLog.js';
import { randomUUID } from 'crypto';
import type { RawJobItem } from '../types.js';

export const FEED_URLS: string[] = [
  'https://jobicy.com/?feed=job_feed',
  'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
  'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
  'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
  'https://jobicy.com/?feed=job_feed&job_categories=data-science',
  'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
  'https://jobicy.com/?feed=job_feed&job_categories=business',
  'https://jobicy.com/?feed=job_feed&job_categories=management',
  'https://www.higheredjobs.com/rss/articleFeed.cfm'
];

function mapItem(sourceUrl: string, item: any): RawJobItem | null {
  const guid = item.guid?.[0]?._ || item.guid?.[0] || item.link?.[0] || item.id?.[0];
  if (!guid) return null;
  const title = (item.title?.[0] || '').toString();
  const description = (item.description?.[0] || item['content:encoded']?.[0] || '').toString();
  const mediaContent = item['media:content']?.[0];
  const imageUrl = Array.isArray(mediaContent?.url) ? mediaContent.url[0] : (mediaContent?.url || undefined);
  return {
    externalId: guid,
    title,
    description,
    company: item['job_listing:company']?.[0] || item['dc:creator']?.[0] || item.creator?.[0],
    location: item['job_listing:location']?.[0] || item.location?.[0] || item['job:location']?.[0],
    categories: (item.category || []).map((c: any) => c._ || c).filter(Boolean),
    employmentType: item['job_listing:job_type']?.[0] || item['job:job_type']?.[0],
    publishDate: item.pubDate ? new Date(item.pubDate[0]) : undefined,
    sourceUrl,
    link: item.link?.[0],
    imageUrl,
    raw: item
  };
}

export async function runImport(feeds: string[] = FEED_URLS) {
  const runId = randomUUID();
  const log = await ImportLog.create({ runId, sourceUrls: feeds });
  logger.info({ runId }, 'Started import run');
  for (const feedUrl of feeds) {
    try {
      const res = await axios.get(feedUrl, { timeout: 30000 });
      const xml = res.data;
      const json = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: true });
      const channel = json.rss?.channel?.[0] || json.feed || json;
      const items = channel.item || channel.entry || [];
      let batch: any[] = [];
      let fetchedCount = 0;
      for (const item of items) {
        const mapped = mapItem(feedUrl, item);
        if (!mapped) continue;
        batch.push(mapped);
        fetchedCount++;
        if (batch.length >= config.queue.importBatchSize) {
          await enqueueBatch(runId, batch, feedUrl);
          batch = [];
        }
      }
      if (batch.length) await enqueueBatch(runId, batch, feedUrl);
      await ImportLog.updateOne({ runId }, { $inc: { totalFetched: fetchedCount } });
    } catch (err: any) {
      logger.error({ err, feedUrl }, 'Feed fetch failed');
      await ImportLog.updateOne({ runId }, { $inc: { failedJobs: 1 }, $push: { failures: { externalId: feedUrl, reason: err.message } } });
    }
  }
  return runId;
}

function sanitizeId(id: string) {
  // Remove characters potentially problematic for BullMQ (e.g., colon used internally for redis key namespaces)
  const cleaned = id.replace(/[:\s\n\r\t]/g, '_').slice(0, 160);
  return cleaned.length === 0 ? `job_${Date.now()}` : cleaned;
}

async function enqueueBatch(runId: string, batch: RawJobItem[], sourceUrl: string) {
  let success = 0;
  for (const job of batch) {
    try {
      const jobId = sanitizeId(job.externalId);
      await queues.jobImport.add('import', { runId, sourceUrl, job }, { jobId });
      success++;
    } catch (err: any) {
      await ImportLog.updateOne({ runId }, { $inc: { failedJobs: 1 }, $push: { failures: { externalId: job.externalId, reason: `enqueue: ${err.message}` } } });
    }
  }
  if (success) {
    await ImportLog.updateOne({ runId }, { $inc: { totalImported: success } });
  }
}
