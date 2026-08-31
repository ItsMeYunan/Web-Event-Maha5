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

  // Dynamic ranking sorted by vote count descending
  let displayCandidates = $derived.by(() => {
    if (!sortByRank) return session.candidates.map((c, i) => ({ ...c, rank: i + 1 }));
    
    // Sort descending by votes
    const sorted = [...session.candidates].sort((a, b) => b.votes - a.votes);
    return sorted.map((c, i) => ({
      ...c,
      rank: i + 1,
    }));
  });

  let maxVotes = $derived(
    Math.max(...(session.candidates.map(c => c.votes) || [0]))
  );
</script>

<div class="obs-widget-root">
  <div class="widget-stack">
    <!-- Stage Indicator Header -->
    <StageIndicator 
      isStageGated={session.isStageGated} 
      stageName={session.stageName} 
      {isSessionEnded} 
    />

    <!-- Candidates Vertical Grid with FLIP Reordering Animation -->
    <div class="cards-list">
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
  </div>
</div>

<style>
  .obs-widget-root {
    width: 320px;
    background: transparent;
    margin: 0 auto;
    user-select: none;
    overflow: hidden;
  }

  .widget-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 6px;
  }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }

  .card-anim-wrapper {
    width: 100%;
    will-change: transform;
  }
</style>
