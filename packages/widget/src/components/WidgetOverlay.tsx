import React from 'react';
import type { SessionData } from '../lib/types';
import { CandidateList } from './CandidateList';
import { StageIndicator } from './StageIndicator';

interface WidgetOverlayProps {
  session: SessionData;
  isSessionEnded?: boolean;
}

export const WidgetOverlay: React.FC<WidgetOverlayProps> = ({
  session,
  isSessionEnded = false,
}) => (
  <div
    style={{
      width: '320px',
      background: 'transparent',
      margin: '0 auto',
      userSelect: 'none',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px' }}>
      <StageIndicator
        isStageGated={session.isStageGated}
        stageName={session.stageName}
        isSessionEnded={isSessionEnded}
      />
      <CandidateList
        candidates={session.candidates}
        isSessionEnded={isSessionEnded}
        gap={8}
      />
    </div>
  </div>
);
