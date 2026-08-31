<script lang="ts">
  import { onMount } from 'svelte';
  import type { SessionData, Candidate } from './lib/types';
  import { LiveVotingWSClient } from './lib/ws';
  import WidgetOverlay from './components/WidgetOverlay.svelte';
  import DashboardOverlay from './components/DashboardOverlay.svelte';
  import ControlsPanel from './components/ControlsPanel.svelte';

  // Determine initial view from URL path or hash or query (?view=widget | webui | split)
  function getRouteMode(): 'widget' | 'dashboard' | 'both' {
    if (typeof window === 'undefined') return 'both';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const viewQuery = params.get('view')?.toLowerCase();

    if (path.startsWith('/widget') || hash.includes('widget') || viewQuery === 'widget') {
      return 'widget';
    }
    if (path.startsWith('/webui') || hash.includes('webui') || viewQuery === 'webui' || viewQuery === 'dashboard') {
      return 'dashboard';
    }
    return 'both';
  }

  let viewMode = $state<'widget' | 'dashboard' | 'both'>(getRouteMode());
  let showFloatingDevTools = $state(false);
  let isSessionEnded = $state(false);

  // Initial State matching SDD v1.2.0 spec
  let session = $state<SessionData>({
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
        latestVoterAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop&crop=faces',
      },
      {
        id: 'c2',
        keyCode: '2',
        name: 'MR. BRAVO',
        colorHex: '#FACC15',
        votes: 13,
        percentage: 35.1,
        latestVoterName: 'Bobby123',
        latestVoterAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=96&h=96&fit=crop&crop=faces',
      },
      {
        id: 'c3',
        keyCode: '3',
        name: 'MR. CHARLIE',
        colorHex: '#FB923C',
        votes: 6,
        percentage: 16.2,
        latestVoterName: 'CharlieFox',
        latestVoterAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces',
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

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let wsClient: LiveVotingWSClient | null = null;

  onMount(() => {
    // Listen for hash/popstate routing
    const handleRouteChange = () => {
      viewMode = getRouteMode();
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    // Initialize Real WebSocket Client silently in background
    wsClient = new LiveVotingWSClient();

    wsClient.onInit = (initData) => {
      session = initData;
      isSessionEnded = initData.status === 'CLOSED';
    };

    wsClient.onVoteUpdate = (updatedCandidates, totalVotes) => {
      session.candidates = updatedCandidates;
      session.totalVotes = totalVotes;
    };

    wsClient.onTimerSync = (remainingSeconds, formattedTime) => {
      session.remainingSeconds = remainingSeconds;
      session.formattedTime = formattedTime;
    };

    wsClient.onSessionEnd = (finalResults) => {
      session.candidates = finalResults.candidates;
      session.totalVotes = finalResults.totalVotes;
      session.status = 'CLOSED';
      session.remainingSeconds = 0;
      session.formattedTime = '00:00';
      isSessionEnded = true;
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
      if (timerInterval) clearInterval(timerInterval);
      if (wsClient) wsClient.disconnect();
    };
  });

  function recalculatePercentages() {
    const total = session.candidates.reduce((sum, c) => sum + c.votes, 0);
    session.totalVotes = total;
    session.candidates = session.candidates.map(c => ({
      ...c,
      percentage: total > 0 ? Number(((c.votes / total) * 100).toFixed(1)) : 0,
    }));
  }

  function handleVote(candidateId: string, username?: string, avatarUrl?: string) {
    if (isSessionEnded) return;
    const target = session.candidates.find(c => c.id === candidateId);
    if (target) {
      target.votes += 1;
      if (username) target.latestVoterName = username;
      if (avatarUrl !== undefined) target.latestVoterAvatar = avatarUrl;
      recalculatePercentages();
    }
  }

  function handleToggleTimer() {
    if (isSessionEnded) return;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    } else {
      timerInterval = setInterval(() => {
        if (session.remainingSeconds > 0) {
          session.remainingSeconds -= 1;
          const mins = Math.floor(session.remainingSeconds / 60);
          const secs = session.remainingSeconds % 60;
          session.formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else {
          handleSessionEnd();
        }
      }, 1000);
    }
  }

  function handleTestEnding() {
    isSessionEnded = false;
    session.remainingSeconds = 9;
    session.formattedTime = '00:09';
    if (!timerInterval) handleToggleTimer();
  }

  function handleSessionEnd() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    session.remainingSeconds = 0;
    session.formattedTime = '00:00';
    session.status = 'CLOSED';
    isSessionEnded = true;
  }

  function handleReset() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isSessionEnded = false;
    session.remainingSeconds = 272;
    session.formattedTime = '04:32';
    session.status = 'ACTIVE';
    session.candidates = [
      { id: 'c1', keyCode: '1', name: 'MR. ALPHA', colorHex: '#06B6D4', votes: 18, percentage: 48.6, latestVoterName: 'Alex_Gamer', latestVoterAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop&crop=faces' },
      { id: 'c2', keyCode: '2', name: 'MR. BRAVO', colorHex: '#FACC15', votes: 13, percentage: 35.1, latestVoterName: 'Bobby123', latestVoterAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=96&h=96&fit=crop&crop=faces' },
      { id: 'c3', keyCode: '3', name: 'MR. CHARLIE', colorHex: '#FB923C', votes: 6, percentage: 16.2, latestVoterName: 'CharlieFox', latestVoterAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces' },
      { id: 'c4', keyCode: '4', name: 'MR. DELTA', colorHex: '#A855F7', votes: 2, percentage: 5.4, latestVoterName: 'DeltaForce' },
    ];
    recalculatePercentages();
  }

  function switchView(mode: 'widget' | 'dashboard' | 'both') {
    viewMode = mode;
    const url = mode === 'widget' ? '/widget' : mode === 'dashboard' ? '/webui' : '/';
    if (window.history.pushState) {
      window.history.pushState(null, '', url);
    } else {
      window.location.hash = mode;
    }
  }
</script>

<main class="app-root" class:is-widget={viewMode === 'widget'} class:is-dashboard={viewMode === 'dashboard'}>
  
  <!-- 1. PURE CLEAN OBS WIDGET OVERLAY (Transparent CEF Browser Source) -->
  {#if viewMode === 'widget'}
    <div class="obs-clean-container">
      <WidgetOverlay {session} {isSessionEnded} />
    </div>

  <!-- 2. PURE CLEAN WEB UI DASHBOARD -->
  {:else if viewMode === 'dashboard'}
    <div class="webui-clean-container">
      <DashboardOverlay {session} {isSessionEnded} />
    </div>

  <!-- 3. SPLIT SHOWCASE VIEW -->
  {:else}
    <div class="split-layout">
      <!-- Left: Web UI Dashboard -->
      <section class="pane webui-pane">
        <div class="pane-header">
          <span>📊 Web UI Dashboard</span>
        </div>
        <DashboardOverlay {session} {isSessionEnded} />
      </section>

      <!-- Right: OBS Widget Overlay -->
      <section class="pane obs-pane">
        <div class="pane-header">
          <span>📺 OBS Stream Overlay</span>
        </div>
        <div class="obs-wrapper">
          <WidgetOverlay {session} {isSessionEnded} />
        </div>
      </section>
    </div>

    <!-- Controls Bar in Split View -->
    <ControlsPanel 
      bind:viewMode 
      onVote={handleVote}
      onToggleTimer={handleToggleTimer}
      onTestEnding={handleTestEnding}
      onSessionEnd={handleSessionEnd}
      onReset={handleReset}
      onSwitchView={switchView}
    />
  {/if}

  <!-- Floating Quick Switcher & Dev Tools Trigger (Discreet for single views) -->
  {#if viewMode !== 'both'}
    <div class="floating-nav">
      <button class="nav-btn" class:active-nav={viewMode === 'dashboard'} onclick={() => switchView('dashboard')}>
        📊 Web UI
      </button>
      <button class="nav-btn" class:active-nav={viewMode === 'widget'} onclick={() => switchView('widget')}>
        📺 OBS Widget
      </button>
      <button class="nav-btn" onclick={() => switchView('both')}>
        🔀 Split View
      </button>
      <button class="gear-btn" title="Toggle Simulator" onclick={() => showFloatingDevTools = !showFloatingDevTools}>
        ⚙️
      </button>
    </div>

    {#if showFloatingDevTools}
      <div class="floating-simulator-panel">
        <ControlsPanel 
          bind:viewMode 
          onVote={handleVote}
          onToggleTimer={handleToggleTimer}
          onTestEnding={handleTestEnding}
          onSessionEnd={handleSessionEnd}
          onReset={handleReset}
          onSwitchView={switchView}
        />
      </div>
    {/if}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .app-root {
    min-height: 100vh;
    background: #0B0F19;
    color: #F8FAFC;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
  }

  /* 100% Clean OBS View (Transparent) */
  .app-root.is-widget {
    background: transparent !important;
    padding: 0;
    min-height: auto;
  }

  .obs-clean-container {
    width: 320px;
    margin: 0 auto;
    background: transparent;
  }

  /* 100% Clean Web UI Dashboard View */
  .app-root.is-dashboard {
    background: #F8FAFC !important;
    padding: 32px 16px;
    color: #0F172A;
  }

  .webui-clean-container {
    width: 100%;
    max-width: 800px;
    background: #FFFFFF;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  /* Split View */
  .split-layout {
    width: 100%;
    max-width: 1200px;
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 24px;
    margin-bottom: 8px;
  }

  @media (max-width: 900px) {
    .split-layout {
      grid-template-columns: 1fr;
    }
  }

  .pane {
    background: #111827;
    border: 1px solid #1F2937;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .pane-header {
    background: #1F2937;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #374151;
  }

  .webui-pane {
    background: #FFFFFF;
    color: #000000;
  }

  .webui-pane .pane-header {
    background: #F3F4F6;
    color: #111827;
    border-bottom-color: #E5E7EB;
  }

  .obs-pane {
    background: #0F172A;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .obs-wrapper {
    padding: 16px;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  /* Floating Bottom Quick Switcher */
  .floating-nav {
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 30px;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
    z-index: 9999;
    opacity: 0.25;
    transition: opacity 0.2s ease;
  }

  .floating-nav:hover {
    opacity: 1;
  }

  .nav-btn {
    background: transparent;
    border: none;
    color: #94A3B8;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.1);
  }

  .nav-btn.active-nav {
    background: #0284C7;
    color: #FFFFFF;
  }

  .gear-btn {
    background: transparent;
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
  }

  .floating-simulator-panel {
    position: fixed;
    bottom: 64px;
    right: 16px;
    max-width: 600px;
    width: calc(100vw - 32px);
    z-index: 9998;
  }
</style>
