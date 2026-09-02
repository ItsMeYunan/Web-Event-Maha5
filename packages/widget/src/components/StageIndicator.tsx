import React from 'react';

interface StageIndicatorProps {
  isStageGated?: boolean;
  stageName?: string | undefined;
  isSessionEnded?: boolean;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({
  isStageGated = false,
  stageName = '#live-stage',
  isSessionEnded = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.4px',
        padding: '5px 12px',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: isSessionEnded ? '#EF4444' : isStageGated ? '#10B981' : '#94A3B8',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isSessionEnded ? '#EF4444' : isStageGated ? '#10B981' : '#94A3B8',
          boxShadow: isSessionEnded ? 'none' : isStageGated ? '0 0 8px #10B981' : 'none',
        }}
      />
      <span>
        {isSessionEnded
          ? '🔒 HASIL FINAL TERKUNCI'
          : isStageGated
          ? `Stage Gated · ${stageName}`
          : 'Voting Terbuka'}
      </span>
    </div>
  );
};
