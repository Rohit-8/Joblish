import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config.js';

export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const queues = {
  jobImport: new Queue('jobImport', { connection: redisConnection }),
};

export function createWorker(processor: any) {
  return new Worker('jobImport', processor, { connection: redisConnection, concurrency: config.queue.concurrency });
}
