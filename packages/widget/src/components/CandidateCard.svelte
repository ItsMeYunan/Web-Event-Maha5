<script lang="ts">
  import type { Candidate } from '../lib/types';
  import { isDarkColor } from '../lib/color';
  import AvatarDisplay from './AvatarDisplay.svelte';

  interface Props {
    candidate: Candidate;
    rank?: number;
    isWinner?: boolean;
  }

  let { candidate, rank, isWinner = false }: Props = $props();

  let isDark = $derived(isDarkColor(candidate.colorHex));
  let textColor = $derived(isDark ? '#FFFFFF' : '#000000');
  let subTextColor = $derived(isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.8)');

  let isPulsing = $state(false);
  let prevVotes = $state<number | null>(null);
  let prevRank = $state<number | null>(null);
  let rankChange = $state<'up' | 'down' | null>(null);

  $effect(() => {
    const currentVotes = candidate.votes;
    if (prevVotes !== null && currentVotes !== prevVotes) {
      isPulsing = true;
      const t = setTimeout(() => { isPulsing = false; }, 250);
      prevVotes = currentVotes;
      return () => clearTimeout(t);
    }
    prevVotes = currentVotes;
  });

  $effect(() => {
    if (rank !== undefined) {
      if (prevRank !== null && rank !== prevRank) {
        rankChange = rank < prevRank ? 'up' : 'down';
        const t = setTimeout(() => { rankChange = null; }, 1200);
        prevRank = rank;
        return () => clearTimeout(t);
      }
      prevRank = rank;
    }
  });
</script>

<div 
  class="candidate-card" 
  class:pulse={isPulsing}
  class:rank-up={rankChange === 'up'}
  class:rank-down={rankChange === 'down'}
  style:background-color={candidate.colorHex}
>
  <!-- Top-left Key & Rank Badge -->
  <div class="badges-row">
    <span class="key-badge">[{candidate.keyCode}]</span>
    {#if rank !== undefined}
      <span class="rank-badge" class:rank-1={rank === 1}>
        #{rank}
        {#if rankChange === 'up'}
          <span class="rank-arrow up">▲</span>
        {:else if rankChange === 'down'}
          <span class="rank-arrow down">▼</span>
        {/if}
      </span>
    {/if}
  </div>

  <!-- Left Side: Avatar (48px) -->
  <AvatarDisplay 
    avatarUrl={candidate.latestVoterAvatar} 
    username={candidate.latestVoterName} 
    size={48} 
  />

  <!-- Right Side: Info & Count -->
  <div class="info-container">
    <div class="name-row">
      <span class="candidate-name" style:color={subTextColor}>
        {candidate.name}
      </span>
      {#if isWinner}
        <span class="winner-pill">👑 WINNER</span>
      {/if}
    </div>
    <div class="vote-count" style:color={textColor}>
      {candidate.votes}
    </div>
  </div>
</div>

<style>
  .candidate-card {
    border-radius: 16px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
    user-select: none;
  }

  .candidate-card.pulse {
    transform: scale(1.03);
  }

  .candidate-card.rank-up {
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.8), 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .candidate-card.rank-down {
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.6), 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .badges-row {
    position: absolute;
    top: 6px;
    left: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .key-badge {
    background: rgba(0, 0, 0, 0.35);
    color: #FFFFFF;
    font-size: 9px;
    font-weight: 900;
    font-family: var(--font-mono);
    padding: 2px 5px;
    border-radius: 5px;
    letter-spacing: 0.5px;
  }

  .rank-badge {
    background: rgba(0, 0, 0, 0.5);
    color: #FFFFFF;
    font-size: 9px;
    font-weight: 900;
    font-family: var(--font-mono);
    padding: 2px 6px;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .rank-badge.rank-1 {
    background: #F59E0B;
    color: #000000;
  }

  .rank-arrow {
    font-size: 8px;
  }

  .rank-arrow.up {
    color: #10B981;
  }

  .rank-arrow.down {
    color: #EF4444;
  }

  .info-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
    overflow: hidden;
  }

  .candidate-name {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .winner-pill {
    font-size: 9px;
    font-weight: 900;
    background: #F59E0B;
    color: #000000;
    padding: 1px 5px;
    border-radius: 4px;
    flex-shrink: 0;
    letter-spacing: 0.5px;
  }

  .vote-count {
    font-size: 36px;
    font-weight: 900;
    font-family: var(--font-mono);
    line-height: 1;
    letter-spacing: -0.5px;
  }
</style>
