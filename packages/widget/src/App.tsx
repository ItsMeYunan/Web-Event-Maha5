import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionData } from './lib/types';
import { LiveVotingWSClient } from './lib/ws';
import { WidgetOverlay } from './components/WidgetOverlay';
import { DashboardOverlay } from './components/DashboardOverlay';
import { ControlsPanel } from './components/ControlsPanel';

function getRouteMode(): 'widget' | 'dashboard' | 'both' {
  if (typeof window === 'undefined') return 'both';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const viewQuery = params.get('view')?.toLowerCase();

  if (path.startsWith('/widget') || hash.includes('widget') || viewQuery === 'widget') {
    return 'widget';
  }
  if (
    path.startsWith('/webui') ||
    hash.includes('webui') ||
    viewQuery === 'webui' ||
    viewQuery === 'dashboard'
  ) {
    return 'dashboard';
  }
  return 'both';
}

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'widget' | 'dashboard' | 'both'>(getRouteMode());
  const [showFloatingDevTools, setShowFloatingDevTools] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  // Initial State matching SDD v1.2.0 spec
  const [session, setSession] = useState<SessionData>({
    sessionId: 'sess_live2026',
    title: 'Voting: Best Streamer & Mascot 2026',
    status: 'ACTIVE',
    voteMode: 'ONE_TIME',
    isStageGated: true,
    stageName: '#live-stage',
    durationSeconds: 300,
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    formattedTime: '04:32',
    remainingSeconds: 272,
    totalVotes: 39,
    candidates: [
      {
        id: 'c1',
        keyCode: '1',
        name: 'MR. ALPHA',
        colorHex: '#06B6D4',
        votes: 18,
        percentage: 48.6,
        latestVoterName: 'Alex_Gamer',
        latestVoterAvatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop&crop=faces',
      },
      {
        id: 'c2',
        keyCode: '2',
        name: 'MR. BRAVO',
        colorHex: '#FACC15',
        votes: 13,
        percentage: 35.1,
        latestVoterName: 'Bobby123',
        latestVoterAvatar:
          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=96&h=96&fit=crop&crop=faces',
      },
      {
        id: 'c3',
        keyCode: '3',
        name: 'MR. CHARLIE',
        colorHex: '#FB923C',
        votes: 6,
        percentage: 16.2,
        latestVoterName: 'CharlieFox',
        latestVoterAvatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces',
      },
      {
        id: 'c4',
        keyCode: '4',
        name: 'MR. DELTA',
        colorHex: '#A855F7',
        votes: 2,
        percentage: 5.4,
        latestVoterName: 'DeltaForce',
      },
    ],
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync route on popstate / hashchange
  useEffect(() => {
    const handleRouteChange = () => {
      setViewMode(getRouteMode());
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    // Initialize Real WebSocket Client silently in background
    const wsClient = new LiveVotingWSClient();
    wsClient.connect();

    wsClient.onInit = (initData) => {
      setSession(initData);
      setIsSessionEnded(initData.status === 'CLOSED');
    };

    wsClient.onVoteUpdate = (candidates, totalVotes) => {
      setSession((prev) => ({
        ...prev,
        candidates,
        totalVotes,
      }));
    };

    wsClient.onTimerUpdate = (remainingSeconds, formattedTime) => {
      setSession((prev) => ({
        ...prev,
        remainingSeconds,
        formattedTime,
      }));
    };

    wsClient.onSessionEnd = (_reason, finalResults) => {
      setSession((prev) => ({
        ...prev,
        candidates: finalResults,
        status: 'CLOSED',
        remainingSeconds: 0,
        formattedTime: '00:00',
      }));
      setIsSessionEnded(true);
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
      wsClient.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const recalculatePercentages = useCallback((candidates: typeof session.candidates) => {
    const total = candidates.reduce((sum, c) => sum + c.votes, 0);
    return {
      totalVotes: total,
      candidates: candidates.map((c) => ({
        ...c,
        percentage: total > 0 ? Number(((c.votes / total) * 100).toFixed(1)) : 0,
      })),
    };
  }, []);

  const handleVote = useCallback(
    (candidateId: string, username?: string, avatarUrl?: string) => {
      if (isSessionEnded) return;
      setSession((prev) => {
        const updated = prev.candidates.map((c) => {
          if (c.id === candidateId) {
            return {
              ...c,
              votes: c.votes + 1,
              latestVoterName: username || c.latestVoterName,
              latestVoterAvatar: avatarUrl !== undefined ? avatarUrl : c.latestVoterAvatar,
            };
          }
          return c;
        });
        const recalculated = recalculatePercentages(updated);
        return {
          ...prev,
          totalVotes: recalculated.totalVotes,
          candidates: recalculated.candidates,
        };
      });
    },
    [isSessionEnded, recalculatePercentages]
  );

  const handleSessionEnd = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSession((prev) => ({
      ...prev,
      remainingSeconds: 0,
      formattedTime: '00:00',
      status: 'CLOSED',
    }));
    setIsSessionEnded(true);
  }, []);

  const handleToggleTimer = useCallback(() => {
    if (isSessionEnded) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    } else {
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          if (prev.remainingSeconds > 0) {
            const nextSecs = prev.remainingSeconds - 1;
            const mins = Math.floor(nextSecs / 60);
            const secs = nextSecs % 60;
            const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            return {
              ...prev,
              remainingSeconds: nextSecs,
              formattedTime: formatted,
            };
          } else {
            handleSessionEnd();
            return prev;
          }
        });
      }, 1000);
    }
  }, [isSessionEnded, handleSessionEnd]);

  const handleTestEnding = useCallback(() => {
    setIsSessionEnded(false);
    setSession((prev) => ({
      ...prev,
      remainingSeconds: 9,
      formattedTime: '00:09',
    }));
    if (!timerRef.current) handleToggleTimer();
  }, [handleToggleTimer]);

  const handleReset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSessionEnded(false);
    setSession({
      sessionId: 'sess_live2026',
      title: 'Voting: Best Streamer & Mascot 2026',
      status: 'ACTIVE',
      voteMode: 'ONE_TIME',
      isStageGated: true,
      stageName: '#live-stage',
      durationSeconds: 300,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      formattedTime: '04:32',
      remainingSeconds: 272,
      totalVotes: 39,
      candidates: [
        {
          id: 'c1',
          keyCode: '1',
          name: 'MR. ALPHA',
          colorHex: '#06B6D4',
          votes: 18,
          percentage: 48.6,
          latestVoterName: 'Alex_Gamer',
          latestVoterAvatar:
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop&crop=faces',
        },
        {
          id: 'c2',
          keyCode: '2',
          name: 'MR. BRAVO',
          colorHex: '#FACC15',
          votes: 13,
          percentage: 35.1,
          latestVoterName: 'Bobby123',
          latestVoterAvatar:
            'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=96&h=96&fit=crop&crop=faces',
        },
        {
          id: 'c3',
          keyCode: '3',
          name: 'MR. CHARLIE',
          colorHex: '#FB923C',
          votes: 6,
          percentage: 16.2,
          latestVoterName: 'CharlieFox',
          latestVoterAvatar:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces',
        },
        {
          id: 'c4',
          keyCode: '4',
          name: 'MR. DELTA',
          colorHex: '#A855F7',
          votes: 2,
          percentage: 5.4,
          latestVoterName: 'DeltaForce',
        },
      ],
    });
  }, []);

  const switchView = useCallback((mode: 'widget' | 'dashboard' | 'both') => {
    setViewMode(mode);
    const url = mode === 'widget' ? '/widget' : mode === 'dashboard' ? '/webui' : '/';
    if (window.history.pushState) {
      window.history.pushState(null, '', url);
    } else {
      window.location.hash = mode;
    }
  }, []);

  // 1. Clean OBS Stream Overlay View
  if (viewMode === 'widget') {
    return (
      <main style={{ width: '100vw', minHeight: '100vh', background: 'transparent', padding: 0 }}>
        <div style={{ width: '320px', margin: '0 auto', background: 'transparent' }}>
          <WidgetOverlay session={session} isSessionEnded={isSessionEnded} />
        </div>
        {renderFloatingNav(viewMode, switchView, showFloatingDevTools, setShowFloatingDevTools, {
          handleVote,
          handleToggleTimer,
          handleTestEnding,
          handleSessionEnd,
          handleReset,
        })}
      </main>
    );
  }

  // 2. Clean Web UI Dashboard View
  if (viewMode === 'dashboard') {
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
        {renderFloatingNav(viewMode, switchView, showFloatingDevTools, setShowFloatingDevTools, {
          handleVote,
          handleToggleTimer,
          handleTestEnding,
          handleSessionEnd,
          handleReset,
        })}
      </main>
    );
  }

  // 3. Split Showcase View
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0B0F19',
        color: '#F8FAFC',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          marginBottom: '8px',
        }}
      >
        {/* Left: Web UI Dashboard */}
        <section
          style={{
            background: '#FFFFFF',
            color: '#000000',
            borderRadius: '12px',
            border: '1px solid #1F2937',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: '#F3F4F6',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#111827',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <span>📊 Web UI Dashboard</span>
          </div>
          <DashboardOverlay session={session} isSessionEnded={isSessionEnded} />
        </section>

        {/* Right: OBS Stream Overlay */}
        <section
          style={{
            background: '#0F172A',
            borderRadius: '12px',
            border: '1px solid #1F2937',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              background: '#1F2937',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#F8FAFC',
              borderBottom: '1px solid #374151',
            }}
          >
            <span>📺 OBS Stream Overlay</span>
          </div>
          <div style={{ padding: '16px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <WidgetOverlay session={session} isSessionEnded={isSessionEnded} />
          </div>
        </section>
      </div>

      {/* Interactive Controls Bar */}
      <ControlsPanel
        viewMode={viewMode}
        onVote={handleVote}
        onToggleTimer={handleToggleTimer}
        onTestEnding={handleTestEnding}
        onSessionEnd={handleSessionEnd}
        onReset={handleReset}
        onSwitchView={switchView}
      />
    </main>
  );
};

function renderFloatingNav(
  viewMode: 'widget' | 'dashboard' | 'both',
  switchView: (mode: 'widget' | 'dashboard' | 'both') => void,
  showDev: boolean,
  setShowDev: React.Dispatch<React.SetStateAction<boolean>>,
  actions: {
    handleVote: (id: string, name?: string, avatar?: string) => void;
    handleToggleTimer: () => void;
    handleTestEnding: () => void;
    handleSessionEnd: () => void;
    handleReset: () => void;
  }
) {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '30px',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
          zIndex: 9999,
          opacity: 0.3,
          transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
      >
        <button
          style={navBtnStyle(viewMode === 'dashboard')}
          onClick={() => switchView('dashboard')}
        >
          📊 Web UI
        </button>
        <button
          style={navBtnStyle(viewMode === 'widget')}
          onClick={() => switchView('widget')}
        >
          📺 OBS Widget
        </button>
        <button style={navBtnStyle(false)} onClick={() => switchView('both')}>
          🔀 Split
        </button>
        <button
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px' }}
          title="Toggle Simulator"
          onClick={() => setShowDev((prev) => !prev)}
        >
          ⚙️
        </button>
      </div>

      {showDev && (
        <div
          style={{
            position: 'fixed',
            bottom: '64px',
            right: '16px',
            maxWidth: '600px',
            width: 'calc(100vw - 32px)',
            zIndex: 9998,
          }}
        >
          <ControlsPanel
            viewMode={viewMode}
            onVote={actions.handleVote}
            onToggleTimer={actions.handleToggleTimer}
            onTestEnding={actions.handleTestEnding}
            onSessionEnd={actions.handleSessionEnd}
            onReset={actions.handleReset}
            onSwitchView={switchView}
          />
        </div>
      )}
    </>
  );
}

function navBtnStyle(isActive: boolean): React.CSSProperties {
  return {
    background: isActive ? '#0284C7' : 'transparent',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '11px',
    fontWeight: 700,
    padding: '5px 10px',
    borderRadius: '20px',
    cursor: 'pointer',
  };
}
