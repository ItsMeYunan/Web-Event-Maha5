<script lang="ts">
  interface Props {
    isStageGated: boolean;
    stageName?: string;
    isSessionEnded?: boolean;
  }

  let { isStageGated, stageName = '#live-stage', isSessionEnded = false }: Props = $props();
</script>

{#if isStageGated}
  <div class="stage-container" class:ended={isSessionEnded}>
    <span class="stage-dot" class:dot-ended={isSessionEnded}></span>
    <span class="stage-text">
      {#if isSessionEnded}
        🔒 VOTING SELESAI · HASIL FINAL
      {:else}
        Stage Gated · {stageName}
      {/if}
    </span>
  </div>
{/if}

<style>
  .stage-container {
    text-align: center;
    font-size: 10px;
    font-weight: 800;
    color: #10B981;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    user-select: none;
    transition: color 0.3s ease;
  }

  .stage-container.ended {
    color: #EF4444;
  }

  .stage-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #10B981;
    box-shadow: 0 0 8px #10B981;
    animation: pulse-dot 1.5s infinite;
  }

  .stage-dot.dot-ended {
    background-color: #EF4444;
    box-shadow: 0 0 8px #EF4444;
    animation: none;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  .stage-text {
    line-height: 1;
  }
</style>
