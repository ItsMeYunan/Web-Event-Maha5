import React from 'react';
import type { ConnectionStatus } from '../lib/types';

interface StageIndicatorProps {
  isStageGated?: boolean;
  stageName?: string;
  isSessionEnded?: boolean;
  connectionStatus?: ConnectionStatus;
  isLiveSession?: boolean;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({
  isStageGated = false,
  stageName = '#live-stage',
  isSessionEnded = false,
  connectionStatus = 'connecting',
  isLiveSession = false,
}) => {
  const isLive = isLiveSession && connectionStatus === 'connected';
  const stateClass = isSessionEnded
    ? 'stage-indicator--closed'
    : isLive
      ? 'stage-indicator--live'
      : connectionStatus === 'disconnected'
        ? 'stage-indicator--reconnecting'
        : 'stage-indicator--preview';
  const statusText = isSessionEnded
    ? 'Sesi voting ditutup'
    : isLive
      ? isStageGated
        ? `Stage gated · ${stageName}`
        : 'Voting terbuka'
      : connectionStatus === 'disconnected'
        ? 'Server terputus, mencoba sambung ulang'
        : 'Pratinjau demo · menunggu sesi live';

  return (
    <div className={`stage-indicator ${stateClass}`} role="status" aria-live="polite">
      <span className="stage-indicator__lamp" aria-hidden="true" />
      <span>{statusText}</span>
    </div>
  );
};
