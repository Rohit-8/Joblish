import { createWorker } from '../queue/connection.js';
import { Job as JobModel } from '../models/Job.js';
import { ImportLog } from '../models/ImportLog.js';
import { logger } from '../logger.js';
import type { ImportJobData } from '../types.js';
import type { Job as BullJob } from 'bullmq';

export function startJobWorker(onEvent?: (e: any) => void) {
  const worker = createWorker(async (job: BullJob) => {
    const data = job.data as ImportJobData;
    try {
      // Try update first
      const updateResult = await JobModel.updateOne(
        { externalId: data.job.externalId, sourceUrl: data.job.sourceUrl },
        { $set: { ...data.job } },
        { upsert: true }
      );
      const wasNew = (updateResult.upsertedCount && updateResult.upsertedCount > 0) ? true : false;
      await ImportLog.updateOne({ runId: data.runId }, { $inc: wasNew ? { newJobs: 1 } : { updatedJobs: 1 } });
      onEvent?.({ type: 'jobProcessed', runId: data.runId, externalId: data.job.externalId, wasNew });
    } catch (err: any) {
      logger.error({ err }, 'Job import failed');
      await ImportLog.updateOne({ runId: data.runId }, { $inc: { failedJobs: 1 }, $push: { failures: { externalId: data.job.externalId, reason: err.message } } });
      onEvent?.({ type: 'jobFailed', runId: data.runId, externalId: data.job.externalId, reason: err.message });
    }
  });
  worker.on('completed', (_job: BullJob) => {
    // Optionally log
  });
  worker.on('failed', (job: BullJob | undefined, err: Error) => {
    logger.error({ err, jobId: job?.id }, 'Worker job failed');
  });
  return worker;
}
