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
  const guid = item.guid?.[0]?._ || item.guid?.[0] || item.link?.[0];
  if (!guid) return null;
  const title = (item.title?.[0] || '').toString();
  const description = (item.description?.[0] || item['content:encoded']?.[0] || '').toString();
  return {
    externalId: guid,
    title,
    description,
    company: item['dc:creator']?.[0] || item.creator?.[0],
    location: item.location?.[0] || item['job:location']?.[0],
    categories: (item.category || []).map((c: any) => c._ || c).filter(Boolean),
    employmentType: item['job:job_type']?.[0],
    publishDate: item.pubDate ? new Date(item.pubDate[0]) : undefined,
    sourceUrl,
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

async function enqueueBatch(runId: string, batch: RawJobItem[], sourceUrl: string) {
  await Promise.all(batch.map(job => queues.jobImport.add('import', { runId, sourceUrl, job }, { jobId: `${job.externalId}` })));
  await ImportLog.updateOne({ runId }, { $inc: { totalImported: batch.length } });
}
