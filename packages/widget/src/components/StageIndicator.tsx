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
  const stateColor = isSessionEnded
    ? 'text-[#ffc1bd]'
    : isLive
      ? 'text-[#d5f1c6]'
      : connectionStatus === 'disconnected'
        ? 'text-[#ffd09e]'
        : 'text-gold';
  const statusText = isSessionEnded
    ? 'Sesi voting ditutup'
    : isLive
      ? isStageGated
        ? `Stage gated · ${stageName}`
        : 'Voting terbuka'
      : connectionStatus === 'disconnected'
        ? isLiveSession
          ? 'Koneksi terputus · data terakhir'
          : 'DEMO · server terputus'
        : 'Pratinjau demo · menunggu sesi live';

  return (
    <div className={`flex w-full min-w-0 items-start gap-[7px] border-l-[3px] border-current bg-wine-deep px-2 py-[6px] text-[11px] font-semibold leading-[1.35] ${stateColor}`} role="status" aria-live="polite">
      <span className="mt-[3px] block h-2 w-2 flex-none border border-current bg-current" aria-hidden="true" />
      <span>{statusText}</span>
    </div>
  );
};
