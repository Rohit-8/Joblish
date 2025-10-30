import React from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

async function fetchJob(id: string) {
  const res = await fetch(`${API_BASE}/jobs/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await fetchJob(params.id);
  if (!job) return <div className="panel"><h2>Not Found</h2></div>;
  return (
    <div>
      <div className="panel" style={{ marginBottom:24 }}>
        <a href="/jobs" className="link" style={{ fontSize:12 }}>&larr; Back</a>
        <h1 style={{ marginTop:8, fontSize:24 }}>{job.title || job.externalId}</h1>
        <div className="meta-grid">
          <div className="meta-item"><strong>Published</strong><br/>{job.publishDate ? new Date(job.publishDate).toLocaleDateString() : '—'}</div>
          <div className="meta-item"><strong>Updated</strong><br/>{job.updatedAt ? new Date(job.updatedAt).toLocaleString() : '—'}</div>
          <div className="meta-item"><strong>Source</strong><br/><a href={job.sourceUrl} className="link" target="_blank" rel="noopener noreferrer">feed</a></div>
          <div className="meta-item"><strong>Categories</strong><br/>{(job.categories || []).join(', ') || '—'}</div>
        </div>
      </div>
      <div className="panel">
        <h3 style={{ marginTop:0 }}>Description</h3>
        <div className="scroll-box" style={{ whiteSpace:'pre-wrap' }}>{job.description || 'No description.'}</div>
      </div>
      <div className="panel">
        <h3 style={{ marginTop:0 }}>Raw Item JSON</h3>
        <div className="scroll-box"><pre style={{ margin:0 }}>{JSON.stringify(job.raw, null, 2)}</pre></div>
      </div>
    </div>
  );
}
