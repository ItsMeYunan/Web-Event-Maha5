import React from 'react';
import type { SessionData } from '../lib/types';
import { DashboardOverlay } from '../components/DashboardOverlay';

/**
 * Handler for /webui — the browser dashboard.
 * Page shell as of 9220c00: light page, one centred 800px white card.
 */
export const WebUiView: React.FC<{ session: SessionData; isSessionEnded: boolean }> = ({
  session,
  isSessionEnded,
}) => (
  <main
    style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      color: '#0F172A',
      padding: '32px 16px',
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: '800px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
      }}
    >
      <DashboardOverlay session={session} isSessionEnded={isSessionEnded} />
    </div>
  </main>
);

/** Shown on /webui before the server has sent INIT. */
export const WebUiPending: React.FC = () => (
  <main style={{ padding: '32px', color: '#64748B', fontSize: '14px' }}>
    Menghubungkan ke sesi voting…
  </main>
);
