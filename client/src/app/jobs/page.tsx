'use client';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

interface JobListItem {
  _id: string;
  title?: string;
  externalId: string;
  sourceUrl: string;
  publishDate?: string;
  updatedAt?: string;
  company?: string;
  employmentType?: string;
  location?: string;
  imageUrl?: string;
}

interface JobsResponse {
  items: JobListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function JobsPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/jobs?page=${p}&pageSize=25`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== 'object') throw new Error('Malformed response');
      // If legacy array response used, wrap
      const wrapped: JobsResponse = Array.isArray(json) ? {
        items: json as JobListItem[],
        page: 1,
        pageSize: (json as JobListItem[]).length,
        total: (json as JobListItem[]).length,
        totalPages: 1
      } : {
        items: Array.isArray(json.items) ? json.items : [],
        page: json.page || 1,
        pageSize: json.pageSize || (json.items?.length || 0),
        total: json.total || (json.items?.length || 0),
        totalPages: json.totalPages || 1
      };
      setData(wrapped);
    } catch (e: any) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!query.trim()) return data.items;
    const q = query.toLowerCase();
    return data.items.filter((j: JobListItem) => (j.title || j.externalId).toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize:22 }}>Jobs</h1>
      <div className="toolbar">
  <input className="input" placeholder="Search title..." value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{ setQuery(e.target.value); }} />
        <button className="btn-secondary btn" onClick={()=>load(page)} disabled={loading}>Reload</button>
        <span className="muted" style={{ fontSize:12 }}>{loading ? 'Loading...' : `${filtered.length} shown / ${data?.total ?? 0} total`}</span>
      </div>
      {error && <p style={{ color: 'tomato', fontSize:13 }}>Error: {error}</p>}
      <table>
        <thead>
          <tr>
            <th style={{ minWidth: '220px' }}>Title</th>
            <th>Company</th>
            <th>Type</th>
            <th>Location</th>
            <th>Source</th>
            <th>External</th>
            <th>Published</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((j: JobListItem) => (
            <tr key={j._id}>
              <td><Link href={`/jobs/${j._id}`}>{j.title || j.externalId.slice(0,60)}</Link></td>
              <td>{j.company || '—'}</td>
              <td>{j.employmentType || '—'}</td>
              <td>{j.location || '—'}</td>
              <td><a href={j.sourceUrl} target="_blank" rel="noopener noreferrer">feed</a></td>
              <td>{(j as any).link ? <a href={(j as any).link} target="_blank" rel="noopener noreferrer">open</a> : '—'}</td>
              <td>{j.publishDate ? new Date(j.publishDate).toLocaleDateString() : ''}</td>
              <td>{j.updatedAt ? new Date(j.updatedAt).toLocaleString() : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <button className="btn-secondary" disabled={page<=1 || loading} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <span className="muted" style={{ fontSize:12 }}>Page {data?.page ?? '-'} / {data?.totalPages ?? '-'} </span>
        <button className="btn-secondary" disabled={!data || page>= (data.totalPages || 1) || loading} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>
    </div>
  );
}
