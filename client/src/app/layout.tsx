import React from 'react';
import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-root">
        <header className="topbar">
          <div className="brand">Joblish Admin</div>
          <nav className="nav">
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/jobs" className="nav-link">Jobs</Link>
          </nav>
        </header>
        <main className="main-container">
          {children}
        </main>
      </body>
    </html>
  );
}
