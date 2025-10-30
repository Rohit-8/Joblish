import { createApp } from './app.js';
import { config } from './config.js';
import { connectMongo } from './db.js';
import { logger } from './logger.js';
import { startJobWorker } from './worker/jobWorker.js';
import { broadcast } from './sse.js';
import cron from 'node-cron';
import { runImport } from './services/feeds.js';
import { ImportLog } from './models/ImportLog.js';

async function bootstrap() {
  await connectMongo();
  startJobWorker((evt) => {
    broadcast('job', evt);
  });
  const app = createApp();
  app.listen(config.port, () => logger.info(`Server listening on ${config.port}`));
  cron.schedule('0 * * * *', async () => {
    const runId = await runImport();
    broadcast('importRunStarted', { runId });
  });
  // Periodic finalize of finished runs (if no active jobs?) could be implemented here.
  setInterval(async () => {
    // Mark runs older than 2h without finish time as finished
    const threshold = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await ImportLog.updateMany({ finishedAt: { $exists: false }, startedAt: { $lt: threshold } }, { $set: { finishedAt: new Date() } });
  }, 30 * 60 * 1000);
}

bootstrap().catch(err => {
  logger.error(err, 'Fatal bootstrap error');
  process.exit(1);
});
