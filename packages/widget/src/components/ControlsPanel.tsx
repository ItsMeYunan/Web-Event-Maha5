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
    <section className={`controls-panel${isCollapsed ? ' controls-panel--collapsed' : ''}`} aria-label="Simulator voting">
      <div className="controls-panel__header">
        <div className="controls-panel__tabs" role="group" aria-label="Pilih tampilan">
          <button
            className={`controls-panel__tab${viewMode === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => onSwitchView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`controls-panel__tab${viewMode === 'widget' ? ' is-active' : ''}`}
            onClick={() => onSwitchView('widget')}
          >
            OBS Overlay
          </button>
          <button
            className={`controls-panel__tab${viewMode === 'both' ? ' is-active' : ''}`}
            onClick={() => onSwitchView('both')}
          >
            Split view
          </button>
        </div>
        <button
          className="controls-panel__collapse"
          aria-expanded={!isCollapsed}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        >
          {isCollapsed ? 'Open simulator' : 'Hide simulator'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="controls-panel__actions" role="group" aria-label="Kontrol sesi demo">
          <button
            className="controls-panel__button"
            onClick={() =>
              onVote(
                'c1',
                'Alex_Gamer',
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces'
              )
            }
          >
            Add vote · [1] MR. ALPHA
          </button>
          <button className="controls-panel__button" onClick={() => onVote('c2', 'Bobby123')}>
            Add vote · [2] MR. BRAVO
          </button>
          <button className="controls-panel__button" onClick={() => onVote('c3', 'CharlieFox')}>
            Add vote · [3] MR. CHARLIE
          </button>
          <button className="controls-panel__button" onClick={() => onVote('c4', 'DeltaForce')}>
            Add vote · [4] MR. DELTA
          </button>
          <button className="controls-panel__button" onClick={onToggleTimer}>
            Toggle timer
          </button>
          <button className="controls-panel__button controls-panel__button--warning" onClick={onTestEnding}>
            Test final 10 seconds
          </button>
          <button className="controls-panel__button controls-panel__button--danger" onClick={onSessionEnd}>
            End session
          </button>
          <button className="controls-panel__button" onClick={onReset}>
            Reset demo
          </button>
        </div>
      )}
    </section>
  );
};
