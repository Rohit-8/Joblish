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
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const jobs = await Job.find().sort({ updatedAt: -1 }).limit(limit).lean();
    res.json(jobs);
  } catch (e) { next(e); }
});
