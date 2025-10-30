import React from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, Arial, sans-serif', margin: 0, padding: 20, background: '#0f1115', color: '#f5f7fa' }}>
        <h1 style={{ marginTop: 0 }}>Joblish Admin</h1>
        {children}
      </body>
    </html>
  );
}
