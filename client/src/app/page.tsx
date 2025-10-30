'use client';
import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
const EVENTS_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000');

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface ImportLog {
  runId: string;
  sourceUrls: string[];
  startedAt: string;
  finishedAt?: string;
  totalFetched: number;
  totalImported: number;
  newJobs: number;
  updatedJobs: number;
  failedJobs: number;
  failures: { externalId: string; reason: string; at: string }[];
}

export default function Home() {
  const { data, mutate, isLoading } = useSWR<ImportLog[]>(`${API_BASE}/imports/logs?limit=25`, fetcher, { refreshInterval: 15000 });
  const [events, setEvents] = useState<any[]>([]);
  const evtRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${EVENTS_BASE}/events`);
    evtRef.current = es;
    es.addEventListener('job', (e: MessageEvent) => {
      setEvents(prev => [JSON.parse(e.data), ...prev.slice(0, 49)]);
      mutate();
    });
    es.addEventListener('importRunStarted', () => mutate());
    return () => { es.close(); };
  }, [mutate]);

  const triggerImport = async () => {
    await fetch(`${API_BASE}/imports/run`, { method: 'POST' });
    mutate();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={triggerImport} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 4 }}>Run Import</button>
        {isLoading && <span>Loading...</span>}
      </div>
      <h2>Recent Import Runs</h2>
      <table>
        <thead>
          <tr>
            <th>Run ID</th>
            <th>Started</th>
            <th>Total Fetched</th>
            <th>Total Enqueued</th>
            <th>New</th>
            <th>Updated</th>
            <th>Failed</th>
          </tr>
        </thead>
        <tbody>
          {data?.map(log => (
            <tr key={log.runId}>
              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.runId}</td>
              <td>{new Date(log.startedAt).toLocaleString()}</td>
              <td>{log.totalFetched}</td>
              <td>{log.totalImported}</td>
              <td style={{ color: '#10b981' }}>{log.newJobs}</td>
              <td style={{ color: '#fbbf24' }}>{log.updatedJobs}</td>
              <td style={{ color: log.failedJobs ? '#ef4444' : undefined }}>{log.failedJobs}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Live Events (last 50)</h2>
      <ul style={{ listStyle: 'none', padding: 0, fontSize: 12 }}>
        {events.map((e, i) => (
          <li key={i}>{e.type} - {e.externalId} {e.wasNew === true ? '(new)' : e.wasNew === false ? '(updated)' : ''}</li>
        ))}
      </ul>
    </div>
  );
}
