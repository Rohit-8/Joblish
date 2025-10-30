import { Request, Response } from 'express';
import { config } from './config.js';

type Client = { id: string; res: Response };
const clients: Client[] = [];

export function sseHandler(req: Request, res: Response) {
  if (!config.enableSse) {
    res.status(503).json({ error: 'SSE disabled' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  const id = Date.now().toString();
  clients.push({ id, res });
  res.write(`event: connected\ndata: {"id":"${id}"}\n\n`);
  req.on('close', () => {
    const idx = clients.findIndex(c => c.id === id);
    if (idx >= 0) clients.splice(idx, 1);
  });
}

export function broadcast(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.res.write(payload);
  }
}
