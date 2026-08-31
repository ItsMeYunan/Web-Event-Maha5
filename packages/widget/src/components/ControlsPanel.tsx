import React, { useState } from 'react';

interface ControlsPanelProps {
  viewMode: 'widget' | 'dashboard' | 'both';
  onVote: (candidateId: string, username?: string, avatarUrl?: string) => void;
  onToggleTimer: () => void;
  onTestEnding: () => void;
  onSessionEnd: () => void;
  onReset: () => void;
  onSwitchView: (mode: 'widget' | 'dashboard' | 'both') => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  viewMode,
  onVote,
  onToggleTimer,
  onTestEnding,
  onSessionEnd,
  onReset,
  onSwitchView,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '860px',
        backgroundColor: '#0F172A',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: isCollapsed ? '8px 14px' : '14px 18px',
        color: '#F8FAFC',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        margin: '20px auto 0',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#1E293B', padding: '4px', borderRadius: '8px' }}>
          <button
            style={{
              background: viewMode === 'dashboard' ? '#0284C7' : 'transparent',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => onSwitchView('dashboard')}
          >
            📊 Web UI Dashboard
          </button>
          <button
            style={{
              background: viewMode === 'widget' ? '#0284C7' : 'transparent',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => onSwitchView('widget')}
          >
            📺 OBS Stream Overlay
          </button>
          <button
            style={{
              background: viewMode === 'both' ? '#0284C7' : 'transparent',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => onSwitchView('both')}
          >
            🔀 Split View
          </button>
        </div>

        {/* Collapse / Expand Toggle */}
        <button
          style={{
            background: '#1E293B',
            border: '1px solid #475569',
            color: '#94A3B8',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? '🛠️ Buka Simulator' : '✖ Sembunyikan'}
        </button>
      </div>

      {/* Action Buttons (Visible when not collapsed) */}
      {!isCollapsed && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #1E293B',
          }}
        >
          <button
            className="ctrl-btn"
            style={btnVoteStyle}
            onClick={() =>
              onVote(
                'c1',
                'Alex_Gamer',
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces'
              )
            }
          >
            + Vote [1] MR. ALPHA
          </button>
          <button
            className="ctrl-btn"
            style={btnVoteStyle}
            onClick={() =>
              onVote(
                'c2',
                'Bobby123',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces'
              )
            }
          >
            + Vote [2] MR. BRAVO
          </button>
          <button
            className="ctrl-btn"
            style={{ ...btnVoteStyle, borderColor: '#FB923C', color: '#FED7AA' }}
            onClick={() =>
              onVote(
                'c3',
                'CharlieFox',
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces'
              )
            }
          >
            🔥 Vote [3] MR. CHARLIE (Test Salip Rank)
          </button>
          <button
            className="ctrl-btn"
            style={btnVoteStyle}
            onClick={() => onVote('c4', 'DeltaForce')}
          >
            + Vote [4] MR. DELTA
          </button>
          <button className="ctrl-btn" style={btnUtilStyle} onClick={onToggleTimer}>
            ⏱️ Toggle Timer
          </button>
          <button className="ctrl-btn" style={btnWarnStyle} onClick={onTestEnding}>
            ⚠️ Test &lt; 10s (Red)
          </button>
          <button className="ctrl-btn" style={btnDangerStyle} onClick={onSessionEnd}>
            ⏹️ Test Selesai
          </button>
          <button className="ctrl-btn" style={btnUtilStyle} onClick={onReset}>
            🔄 Reset
          </button>
        </div>
      )}
    </div>
  );
};

const btnVoteStyle: React.CSSProperties = {
  background: '#1E293B',
  border: '1px solid #475569',
  color: '#FFFFFF',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnUtilStyle: React.CSSProperties = {
  background: '#334155',
  border: '1px solid #475569',
  color: '#FFFFFF',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnWarnStyle: React.CSSProperties = {
  background: '#78350F',
  border: '1px solid #B45309',
  color: '#FEF3C7',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnDangerStyle: React.CSSProperties = {
  background: '#7F1D1D',
  border: '1px solid #B91C1C',
  color: '#FEE2E2',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};
