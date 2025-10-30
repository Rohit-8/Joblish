import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/joblish',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  },
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    importBatchSize: parseInt(process.env.IMPORT_BATCH_SIZE || '50', 10)
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  enableSse: (process.env.ENABLE_SSE || 'true') === 'true'
};
