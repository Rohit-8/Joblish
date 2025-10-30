import React from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

async function fetchJob(id: string) {
  const res = await fetch(`${API_BASE}/jobs/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await fetchJob(params.id);
  console.log(job);
  console.log(job.raw?.['job_listing:company']);
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
          <div className="meta-item"><strong>Company</strong><br/>{job.raw?.['job_listing:company']?.[0] || '—'}</div>
          <div className="meta-item"><strong>Type</strong><br/>{job.raw?.['job_listing:job_type']?.[0] || '—'}</div>
          <div className="meta-item"><strong>Location</strong><br/>{job.raw?.['job_listing:location']?.[0] || '—'}</div>
          {job.imageUrl && (
            <div className="meta-item" style={{ textAlign:'center' }}>
              <strong>Image</strong><br/>
              <img src={job.imageUrl} alt={job.title || 'job image'} style={{ maxWidth:'100%', maxHeight:80, objectFit:'cover', borderRadius:4, marginTop:4 }} />
            </div>
          )}
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
