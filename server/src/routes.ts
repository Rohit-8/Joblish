import { Router } from 'express';
import { runImport } from './services/feeds.js';
import { ImportLog } from './models/ImportLog.js';
import { Job } from './models/Job.js';

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
