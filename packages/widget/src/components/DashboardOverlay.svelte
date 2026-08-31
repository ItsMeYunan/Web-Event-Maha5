<script lang="ts">
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import type { SessionData } from '../lib/types';
  import CandidateCard from './CandidateCard.svelte';
  import StageIndicator from './StageIndicator.svelte';

  interface Props {
    session: SessionData;
    isSessionEnded?: boolean;
    sortByRank?: boolean;
  }

  let { session, isSessionEnded = false, sortByRank = true }: Props = $props();

  let isEndingSoon = $derived(
    !isSessionEnded && session.remainingSeconds <= 10 && session.remainingSeconds > 0
  );

  let maxVotes = $derived(
    Math.max(...(session.candidates.map(c => c.votes) || [0]))
  );

  // Dynamic ranking sorted descending by votes
  let displayCandidates = $derived.by(() => {
    if (!sortByRank) return session.candidates.map((c, i) => ({ ...c, rank: i + 1 }));
    const sorted = [...session.candidates].sort((a, b) => b.votes - a.votes);
    return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
  });
</script>

<div class="dashboard-root">
  <!-- Large Monospace Countdown Timer Header -->
  <div class="timer-section">
    {#if isSessionEnded || session.remainingSeconds <= 0}
      <div class="timer-finished">
        <svg class="stop-icon" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z"/>
        </svg>
        <span>VOTING SELESAI</span>
      </div>
    {:else}
      <div class="timer-display" class:ending={isEndingSoon}>
        {session.formattedTime}
      </div>
    {/if}
  </div>

  <!-- Stage Channel Banner -->
  <div class="stage-banner" class:banner-ended={isSessionEnded}>
    <span class="stage-dot" class:dot-ended={isSessionEnded}></span>
    <span>
      {#if isSessionEnded}
        🔒 Sesi voting telah berakhir · Hasil final telah dikunci
      {:else}
        🎙️ Voting hanya untuk member di Stage Channel · voice_gate_enabled: true
      {/if}
    </span>
  </div>

  <!-- Candidate Cards Grid (pet-care-dashboard style with FLIP Animation) -->
  <div class="cards-grid">
    {#each displayCandidates as candidate (candidate.id)}
      <div 
        class="card-anim-wrapper" 
        animate:flip={{ duration: 450, easing: cubicOut }}
      >
        <CandidateCard 
          {candidate}
          rank={candidate.rank}
          isWinner={isSessionEnded && candidate.votes === maxVotes && maxVotes > 0} 
        />
      </div>
    {/each}
  </div>

  <!-- Footer Stats -->
  <div class="dashboard-footer">
    Total Suara Sah: <strong>{session.totalVotes}</strong> · Mode: {session.voteMode} · 
    <span class="status-pill" class:status-ended={isSessionEnded}>
      {isSessionEnded ? '⏹ CLOSED' : '● ACTIVE'}
    </span>
  </div>
</div>

<style>
  .dashboard-root {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 20px;
    background: #FFFFFF;
    color: #0F172A;
  }

  /* Timer Section */
  .timer-section {
    margin-bottom: 6px;
    text-align: center;
  }

  .timer-display {
    font-size: 64px;
    font-weight: 900;
    font-family: var(--font-mono);
    letter-spacing: 4px;
    line-height: 1;
    color: #0F172A;
    transition: color 0.3s ease;
  }

  .timer-display.ending {
    color: var(--timer-ending);
  }

  .timer-finished {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 48px;
    font-weight: 900;
    color: var(--timer-ending);
    letter-spacing: 2px;
    line-height: 1;
  }

  .stop-icon {
    width: 44px;
    height: 44px;
    fill: var(--timer-ending);
  }

  /* Stage Banner */
  .stage-banner {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stage-banner.banner-ended {
    color: #EF4444;
  }

  .stage-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #10B981;
    box-shadow: 0 0 8px #10B981;
  }

  .stage-dot.dot-ended {
    background-color: #EF4444;
    box-shadow: none;
  }

  /* Cards Grid */
  .cards-grid {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
  }

  .card-anim-wrapper {
    width: 100%;
    will-change: transform;
  }

  /* Footer */
  .dashboard-footer {
    margin-top: 28px;
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 600;
  }

  .status-pill {
    color: #10B981;
    font-weight: 800;
  }

  .status-pill.status-ended {
    color: #EF4444;
  }
</style>
