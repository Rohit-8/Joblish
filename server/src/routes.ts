import { Router } from 'express';
import { runImport } from './services/feeds.js';
import { ImportLog } from './models/ImportLog.js';
import { Job } from './models/Job.js';
import { logger } from './logger.js';

export const router = Router();

router.post('/imports/run', async (req, res, next) => {
  try {
    const runId = await runImport();
    res.json({ runId });
  } catch (e) { next(e); }
});

router.get('/imports/logs', async (req, res, next) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const logs = await ImportLog.find().sort({ startedAt: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (e) { next(e); }
});

router.get('/jobs', async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = Math.min(parseInt((req.query.pageSize as string) || '25', 10), 100);
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      Job.find().sort({ updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
      Job.countDocuments()
    ]);
    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (e) { next(e); }
});

router.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json(job);
  } catch (e) { next(e); }
});

// Backfill route: populate newly added fields for existing jobs from their raw content
router.post('/jobs/backfill', async (_req, res, next) => {
  try {
    const cursor = Job.find({ $or: [
      { company: { $exists: false } },
      { location: { $exists: false } },
      { employmentType: { $exists: false } },
      { imageUrl: { $exists: false } },
      { link: { $exists: false } }
    ] }).cursor();
    let updated = 0;
    for await (const doc of cursor) {
      const raw: any = doc.raw || {};
      const mediaContent = raw['media:content']?.[0];
      const imageUrl = mediaContent ? (Array.isArray(mediaContent.url) ? mediaContent.url[0] : mediaContent.url) : undefined;
      const patch: any = {};
      if (!doc.company) patch.company = raw['job_listing:company']?.[0] || raw['dc:creator']?.[0] || raw.creator?.[0];
      if (!doc.location) patch.location = raw['job_listing:location']?.[0] || raw.location?.[0] || raw['job:location']?.[0];
      if (!doc.employmentType) patch.employmentType = raw['job_listing:job_type']?.[0] || raw['job:job_type']?.[0];
      if (!doc.link) patch.link = raw.link?.[0];
      if (!doc.imageUrl && imageUrl) patch.imageUrl = imageUrl;
      if (Object.keys(patch).length) {
        await Job.updateOne({ _id: doc._id }, { $set: patch });
        updated++;
      }
    }
    logger.info({ updated }, 'Backfill completed');
    res.json({ updated });
  } catch (e) { next(e); }
});
