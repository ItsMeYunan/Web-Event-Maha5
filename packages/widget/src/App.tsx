import React, { useEffect, useState } from 'react';
import type { SessionData } from './lib/types';
import { resolveView } from './lib/route';
import { LiveVotingWSClient } from './lib/ws';
import { WidgetView, WidgetPending } from './views/WidgetView';
import { WebUiView, WebUiPending } from './views/WebUiView';
import { DashboardView } from './views/DashboardView';

const HANDLERS = {
  widget: { View: WidgetView, Pending: WidgetPending },
  webui: { View: WebUiView, Pending: WebUiPending },
} as const;

const view = resolveView();

/** Dispatches the current URI to its handler and feeds it the live session. */
export const App: React.FC = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  useEffect(() => {
    if (!view) return;

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

  if (!view) {
    return (
      <main style={{ padding: '32px', color: '#64748B', fontSize: '14px' }}>
        Halaman tidak ditemukan. Gunakan <code>/widget</code> (OBS overlay) atau{' '}
        <code>/webui</code> (dashboard).
      </main>
    );
  }

  // The dashboard renders with or without a live session, so it sits ahead of
  // the session gate the two overlay handlers share.
  if (view === 'dashboard') {
    return <DashboardView session={session} isSessionEnded={isSessionEnded} />;
  }

  const { View, Pending } = HANDLERS[view];
  return session ? <View session={session} isSessionEnded={isSessionEnded} /> : <Pending />;
};
