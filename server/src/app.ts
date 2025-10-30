import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { sseHandler } from './sse.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.get('/events', sseHandler);
  app.use('/api', router);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ error: err.message || 'Internal Error' });
  });
  return app;
}
