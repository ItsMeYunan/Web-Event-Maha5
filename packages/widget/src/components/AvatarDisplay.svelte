<script lang="ts">
  import { getInitials } from '../lib/color';

  interface Props {
    avatarUrl?: string;
    username?: string;
    size?: number;
  }

  let { avatarUrl, username, size = 48 }: Props = $props();

  let initials = $derived(getInitials(username));
</script>

<div 
  class="avatar-container" 
  style:width="{size}px" 
  style:height="{size}px"
>
  {#if avatarUrl}
    <img 
      src={avatarUrl} 
      alt={username || 'Voter'} 
      class="avatar-image"
      loading="lazy"
    />
  {:else}
    <div class="avatar-fallback">
      {initials}
    </div>
  {/if}
</div>

<style>
  .avatar-container {
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    border: 2px solid rgba(255, 255, 255, 0.6);
    transition: opacity 0.3s ease;
  }

  .avatar-fallback {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.25);
    border: 2px solid rgba(255, 255, 255, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 16px;
    color: #FFFFFF;
    font-family: system-ui, sans-serif;
  }
</style>
