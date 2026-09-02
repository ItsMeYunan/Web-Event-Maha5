import React, { useEffect, useState } from 'react';
import type { SessionData } from './lib/types';
import { LiveVotingWSClient } from './lib/ws';
import { WidgetOverlay } from './components/WidgetOverlay';
import { DashboardOverlay } from './components/DashboardOverlay';

// /widget -> transparent OBS browser source. Anything else -> the dashboard.
const isWidgetRoute = window.location.pathname.toLowerCase().startsWith('/widget');

export const App: React.FC = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  useEffect(() => {
    const client = new LiveVotingWSClient();

    // Handlers first, then connect: nothing can arrive before they exist.
    client.onInit = (initData) => {
      setSession(initData);
      setIsSessionEnded(initData.status === 'CLOSED');
    };

    client.onVoteUpdate = (candidates, totalVotes) => {
      setSession((prev) => (prev ? { ...prev, candidates, totalVotes } : prev));
    };

    client.onTimerUpdate = (remainingSeconds, formattedTime) => {
      setSession((prev) => (prev ? { ...prev, remainingSeconds, formattedTime } : prev));
    };

    client.onSessionEnd = (_reason, finalResults) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              candidates: finalResults,
              status: 'CLOSED',
              remainingSeconds: 0,
              formattedTime: '00:00',
            }
          : prev
      );
      setIsSessionEnded(true);
    };

    client.connect();

    // Mirrors the setup, so StrictMode's setup -> cleanup -> setup is a no-op.
    return () => {
      client.close();
    };
  }, []);

  // Until the server sends INIT there is no session to draw. The overlay stays
  // fully transparent so an unconnected OBS source shows nothing at all.
  if (!session) {
    return isWidgetRoute ? null : (
      <main style={{ padding: '32px', color: '#64748B', fontSize: '14px' }}>
        Menghubungkan ke sesi voting…
      </main>
    );
  }

  if (isWidgetRoute) {
    return (
      <main style={{ width: '100vw', minHeight: '100vh', background: 'transparent' }}>
        <WidgetOverlay session={session} isSessionEnded={isSessionEnded} />
      </main>
    );
  }

  return (
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
};
