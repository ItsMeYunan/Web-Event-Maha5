<script lang="ts">
  interface Props {
    viewMode: 'widget' | 'dashboard' | 'both';
    onVote: (candidateId: string, username?: string, avatarUrl?: string) => void;
    onToggleTimer: () => void;
    onTestEnding: () => void;
    onSessionEnd: () => void;
    onReset: () => void;
    onSwitchView: (mode: 'widget' | 'dashboard' | 'both') => void;
  }

  let {
    viewMode = $bindable(),
    onVote,
    onToggleTimer,
    onTestEnding,
    onSessionEnd,
    onReset,
    onSwitchView,
  }: Props = $props();

  let isCollapsed = $state(false);
</script>

<div class="controls-root" class:collapsed={isCollapsed}>
  <div class="controls-top">
    <!-- View Switcher Tabs -->
    <div class="view-tabs">
      <button 
        class="tab-btn" 
        class:active={viewMode === 'dashboard'}
        onclick={() => onSwitchView('dashboard')}
      >
        📊 Web UI Dashboard
      </button>
      <button 
        class="tab-btn" 
        class:active={viewMode === 'widget'}
        onclick={() => onSwitchView('widget')}
      >
        📺 OBS Stream Overlay
      </button>
      <button 
        class="tab-btn" 
        class:active={viewMode === 'both'}
        onclick={() => onSwitchView('both')}
      >
        🔀 Split View
      </button>
    </div>

    <!-- Collapse / Expand Toggle -->
    <button class="collapse-btn" onclick={() => isCollapsed = !isCollapsed}>
      {isCollapsed ? '🛠️ Buka Simulator' : '✖ Sembunyikan'}
    </button>
  </div>

  <!-- Action Simulation Buttons (Hidden when collapsed) -->
  {#if !isCollapsed}
    <div class="actions-row">
      <button class="btn btn-vote" onclick={() => onVote('c1', 'Alex_Gamer', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces')}>
        + Vote [1] MR. ALPHA
      </button>
      <button class="btn btn-vote" onclick={() => onVote('c2', 'Bobby123', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces')}>
        + Vote [2] MR. BRAVO
      </button>
      <button class="btn btn-vote btn-highlight" onclick={() => onVote('c3', 'CharlieFox', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces')}>
        🔥 Vote [3] MR. CHARLIE
      </button>
      <button class="btn btn-vote" onclick={() => onVote('c4', 'DeltaForce')}>
        + Vote [4] MR. DELTA
      </button>
      <button class="btn btn-util" onclick={onToggleTimer}>
        ⏱️ Toggle Timer
      </button>
      <button class="btn btn-warn" onclick={onTestEnding}>
        ⚠️ Test &lt; 10s
      </button>
      <button class="btn btn-danger" onclick={onSessionEnd}>
        ⏹️ Test Selesai
      </button>
      <button class="btn btn-util" onclick={onReset}>
        🔄 Reset
      </button>
    </div>
  {/if}
</div>

<style>
  .controls-root {
    width: 100%;
    max-width: 860px;
    background: #0F172A;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 14px 18px;
    color: #F8FAFC;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    margin: 20px auto 0;
    transition: all 0.2s ease;
  }

  .controls-root.collapsed {
    padding: 8px 14px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
  }

  .controls-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .view-tabs {
    display: flex;
    gap: 6px;
    background: #1E293B;
    padding: 4px;
    border-radius: 8px;
  }

  .tab-btn {
    background: transparent;
    border: none;
    color: #94A3B8;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: #FFFFFF;
  }

  .tab-btn.active {
    background: #0284C7;
    color: #FFFFFF;
  }

  .collapse-btn {
    background: transparent;
    border: 1px solid #475569;
    color: #94A3B8;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .collapse-btn:hover {
    color: #FFFFFF;
    border-color: #64748B;
    background: #1E293B;
  }

  .actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #1E293B;
  }

  .btn {
    border: 1px solid #334155;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    color: #FFFFFF;
  }

  .btn-vote {
    background: #1E293B;
    border-color: #475569;
  }

  .btn-vote:hover {
    background: #334155;
    border-color: #64748B;
  }

  .btn-highlight {
    border-color: #FB923C;
    color: #FED7AA;
  }

  .btn-util {
    background: #334155;
    border-color: #475569;
  }

  .btn-warn {
    background: #78350F;
    border-color: #B45309;
    color: #FEF3C7;
  }

  .btn-danger {
    background: #7F1D1D;
    border-color: #B91C1C;
    color: #FEE2E2;
  }
</style>
