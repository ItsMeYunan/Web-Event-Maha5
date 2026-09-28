import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionData, ViewMode } from './lib/types';
import { LiveVotingWSClient } from './lib/ws';
import { WidgetOverlay } from './components/WidgetOverlay';
import { DashboardOverlay } from './components/DashboardOverlay';
import { CagakOverlay } from './components/CagakOverlay';
import { ControlsPanel } from './components/ControlsPanel';

function getRouteMode(): ViewMode {
  if (typeof window === 'undefined') return 'both';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const viewQuery = params.get('view')?.toLowerCase();

  if (path.startsWith('/cagak') || hash.includes('cagak') || viewQuery === 'cagak') {
    return 'cagak';
  }
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
  const [viewMode, setViewMode] = useState<ViewMode>(getRouteMode());
  const [showFloatingDevTools, setShowFloatingDevTools] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isLiveSession, setIsLiveSession] = useState(false);

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

    wsClient.onStatusChange = setConnectionStatus;

    wsClient.onInit = (initData) => {
      setSession(initData);
      setIsSessionEnded(initData.status === 'CLOSED');
      setIsLiveSession(true);
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

  const switchView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    const url = mode === 'widget' ? '/widget' : mode === 'dashboard' ? '/webui' : mode === 'cagak' ? '/cagak' : '/';
    if (window.history.pushState) {
      window.history.pushState(null, '', url);
    } else {
      window.location.hash = mode;
    }
  }, []);

  // 1. Clean OBS Stream Overlay View
  if (viewMode === 'widget') {
    return (
      <main className="w-screen min-h-screen bg-transparent pb-[84px]">
        <div className="mx-auto w-[min(320px,100vw)] bg-transparent">
          <WidgetOverlay
            session={session}
            isSessionEnded={isSessionEnded}
            connectionStatus={connectionStatus}
            isLiveSession={isLiveSession}
          />
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

  if (viewMode === 'cagak') {
    return (
      <main className="grid h-svh min-h-[320px] w-screen place-items-center overflow-hidden bg-transparent">
        <div className="@container/cagak relative aspect-[3602/3676] w-[min(100vw,98svh)] shrink-0">
          <CagakOverlay
            session={session}
            isSessionEnded={isSessionEnded}
            connectionStatus={connectionStatus}
            isLiveSession={isLiveSession}
          />
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
      <main className="relative isolate flex min-h-screen w-full flex-col items-center overflow-x-clip bg-wine-deep px-[clamp(12px,3vw,42px)] pt-[10px] pb-[104px] text-paper bg-[linear-gradient(var(--color-stage-wash),var(--color-dark-wash)),url('/uas/background-stage.png')] bg-center bg-cover bg-no-repeat max-[720px]:px-[10px] max-[460px]:pt-[6px]">
        <header className="mx-auto mb-[clamp(8px,1.4vh,16px)] flex w-full justify-center p-0 max-[460px]:mb-[5px]">
          <img className="block max-h-[22vh] w-[clamp(220px,24vw,350px)] object-contain drop-shadow-[0_7px_12px_var(--color-wine-deep)] max-[720px]:max-h-none max-[720px]:w-[min(245px,70vw)] max-[460px]:w-[min(210px,62vw)]" src="/uas/logo-uas.png" alt="UAS Show, Ujian Antar Streamer" />
        </header>
        <div className="mx-auto flex aspect-[3237/1851] w-[min(1080px,100%)] items-center justify-center bg-[url('/uas/papan.png')] bg-center bg-no-repeat bg-[length:100%_100%] px-[6.2%] pt-[5.2%] pb-[4%] max-[720px]:aspect-[2698/3164] max-[720px]:w-[min(440px,100%)] max-[720px]:bg-[url('/uas/papan-vote.png')] max-[720px]:px-[8%] max-[720px]:pt-[9%] max-[720px]:pb-[6%]">
          <DashboardOverlay
            session={session}
            isSessionEnded={isSessionEnded}
            connectionStatus={connectionStatus}
            isLiveSession={isLiveSession}
          />
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
    <main className="relative isolate min-h-screen overflow-x-clip bg-wine-deep px-[clamp(12px,3vw,42px)] pt-[10px] pb-[104px] text-paper [background-image:linear-gradient(var(--color-dark-wash),var(--color-dark-wash)),url('/uas/background-batik.png')] [background-position:center,center] [background-size:auto,min(900px,100vw)_auto] [background-repeat:no-repeat,repeat] max-[720px]:px-[10px] max-[460px]:px-[10px] max-[460px]:pt-[6px]">
      <header className="mx-auto mb-2 flex w-full justify-center p-0 max-[460px]:mb-[5px]">
        <img className="block max-h-[16vh] w-[clamp(175px,18vw,240px)] object-contain drop-shadow-[0_7px_12px_var(--color-wine-deep)] max-[820px]:w-[205px] max-[720px]:max-h-none max-[720px]:w-[min(245px,70vw)] max-[460px]:w-[min(210px,62vw)]" src="/uas/logo-uas.png" alt="UAS Show, Ujian Antar Streamer" />
      </header>
      <div className="mx-auto grid w-[min(1380px,100%)] grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] items-stretch gap-[clamp(12px,2vw,24px)] max-[940px]:max-w-[660px] max-[940px]:grid-cols-[minmax(0,1fr)]">
        {/* Left: Web UI Dashboard */}
        <section className="flex min-w-0 flex-col">
          <div className="min-h-10 border-b-2 border-red px-[10px] pt-[6px] pb-2 font-display text-xl font-bold uppercase leading-[1.15] text-paper">
            <span>Web UI Dashboard</span>
          </div>
          <div className="mx-auto flex aspect-[3237/1851] w-full items-center justify-center bg-[url('/uas/papan.png')] bg-center bg-no-repeat bg-[length:100%_100%] px-[6.2%] pt-[5.4%] pb-[4%] max-[720px]:aspect-[2698/3164] max-[720px]:w-[min(440px,100%)] max-[720px]:bg-[url('/uas/papan-vote.png')] max-[720px]:px-[8%] max-[720px]:pt-[9%] max-[720px]:pb-[6%]">
            <DashboardOverlay
              session={session}
              isSessionEnded={isSessionEnded}
              connectionStatus={connectionStatus}
              isLiveSession={isLiveSession}
              compact
            />
          </div>
        </section>

        {/* Right: OBS Stream Overlay */}
        <section className="flex min-w-0 flex-col">
          <div className="mt-2 min-h-10 border-b-2 border-red px-[10px] pt-[6px] pb-2 font-display text-xl font-bold uppercase leading-[1.15] text-paper max-[940px]:mt-0">
            <span>OBS Stream Overlay</span>
          </div>
          <div className="flex w-full justify-center pt-2 max-[820px]:pt-2.5">
            <WidgetOverlay
              session={session}
              isSessionEnded={isSessionEnded}
              connectionStatus={connectionStatus}
              isLiveSession={isLiveSession}
            />
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
  viewMode: ViewMode,
  switchView: (mode: ViewMode) => void,
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
  const navButtonClass = (isActive: boolean) =>
    `min-w-[82px] rounded-[3px] border px-[10px] py-[6px] text-[11px] font-bold text-paper max-[720px]:min-w-0 max-[720px]:px-1 max-[720px]:text-[10px] ${isActive ? 'border-gold bg-red' : 'border-transparent bg-transparent hover:border-gold hover:bg-red'}`;

  return (
    <>
      <nav className="fixed right-4 bottom-4 z-[9999] grid grid-cols-[repeat(5,auto)] gap-1 rounded-[5px] border border-gold-deep bg-wine-deep p-[5px] max-[720px]:right-2 max-[720px]:bottom-[calc(8px+env(safe-area-inset-bottom))] max-[720px]:left-2 max-[720px]:grid-cols-[repeat(5,minmax(0,1fr))] max-[720px]:gap-[3px] max-[720px]:p-1" aria-label="Tampilan widget">
        <button
          className={navButtonClass(viewMode === 'dashboard')}
          onClick={() => switchView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={navButtonClass(viewMode === 'cagak')}
          onClick={() => switchView('cagak')}
        >
          CAGAK
        </button>
        <button
          className={navButtonClass(viewMode === 'widget')}
          onClick={() => switchView('widget')}
        >
          OBS Widget
        </button>
        <button
          className={navButtonClass(viewMode === 'both')}
          onClick={() => switchView('both')}
        >
          Split view
        </button>
        <button
          title="Toggle Simulator"
          aria-expanded={showDev}
          className="min-w-[82px] rounded-[3px] border border-transparent bg-transparent px-[10px] py-[6px] text-[11px] font-bold text-paper hover:border-gold hover:bg-red max-[720px]:min-w-0 max-[720px]:px-1 max-[720px]:text-[10px]"
          onClick={() => setShowDev((prev) => !prev)}
        >
          Simulator
        </button>
      </nav>

      {showDev && (
        <div className="fixed right-4 bottom-[74px] z-[9998] w-[min(600px,calc(100vw-32px))] max-[720px]:right-2 max-[720px]:bottom-[calc(64px+env(safe-area-inset-bottom))] max-[720px]:w-[calc(100vw-16px)]">
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
