import React, { useState } from 'react';
import type { ViewMode } from '../lib/types';

interface ControlsPanelProps {
  viewMode: ViewMode;
  onVote: (candidateId: string, username?: string, avatarUrl?: string) => void;
  onToggleTimer: () => void;
  onTestEnding: () => void;
  onSessionEnd: () => void;
  onReset: () => void;
  onSwitchView: (mode: ViewMode) => void;
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
    <section className={`mx-auto mt-5 w-[min(860px,100%)] rounded-board border border-gold-deep bg-wine-deep px-[18px] py-[14px] text-paper max-[720px]:p-[10px] ${isCollapsed ? 'py-2' : ''}`} aria-label="Simulator voting">
      <div className="flex flex-wrap items-center justify-between gap-2 max-[720px]:items-stretch">
        <div className="flex flex-wrap gap-[6px] max-[720px]:w-full" role="group" aria-label="Pilih tampilan">
          <button
            className={`rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper max-[720px]:flex-[1_1_30%] max-[720px]:px-[6px] max-[720px]:text-[11px] ${viewMode === 'dashboard' ? 'border-gold bg-red' : ''}`}
            onClick={() => onSwitchView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper max-[720px]:flex-[1_1_30%] max-[720px]:px-[6px] max-[720px]:text-[11px] ${viewMode === 'widget' ? 'border-gold bg-red' : ''}`}
            onClick={() => onSwitchView('widget')}
          >
            OBS Overlay
          </button>
          <button
            className={`rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper max-[720px]:flex-[1_1_30%] max-[720px]:px-[6px] max-[720px]:text-[11px] ${viewMode === 'cagak' ? 'border-gold bg-red' : ''}`}
            onClick={() => onSwitchView('cagak')}
          >
            CAGAK
          </button>
          <button
            className={`rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper max-[720px]:flex-[1_1_30%] max-[720px]:px-[6px] max-[720px]:text-[11px] ${viewMode === 'both' ? 'border-gold bg-red' : ''}`}
            onClick={() => onSwitchView('both')}
          >
            Split view
          </button>
        </div>
        <button
          className="rounded-[3px] border border-gold-deep bg-transparent px-3 py-[7px] text-xs font-bold text-gold"
          aria-expanded={!isCollapsed}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        >
          {isCollapsed ? 'Open simulator' : 'Hide simulator'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-3 flex flex-wrap gap-[6px] border-t border-[var(--color-rule)] pt-3" role="group" aria-label="Kontrol sesi demo">
          <button
            className="rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper"
            onClick={() =>
              onVote(
                'c1',
                'Alex_Gamer',
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces'
              )
            }
          >
            Add vote · MR. ALPHA
          </button>
          <button className="rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper" onClick={() => onVote('c2', 'Bobby123')}>
            Add vote · MR. BRAVO
          </button>
          <button className="rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper" onClick={() => onVote('c3', 'CharlieFox')}>
            Add vote · MR. CHARLIE
          </button>
          <button className="rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper" onClick={() => onVote('c4', 'DeltaForce')}>
            Add vote · MR. DELTA
          </button>
          <button className="rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper" onClick={onToggleTimer}>
            Toggle timer
          </button>
          <button className="rounded-[3px] border border-gold bg-gold px-3 py-[7px] text-xs font-bold text-ink" onClick={onTestEnding}>
            Test final 10 seconds
          </button>
          <button className="rounded-[3px] border border-red bg-red px-3 py-[7px] text-xs font-bold text-paper" onClick={onSessionEnd}>
            End session
          </button>
          <button className="rounded-[3px] border border-gold-deep bg-wine px-3 py-[7px] text-xs font-bold text-paper" onClick={onReset}>
            Reset demo
          </button>
        </div>
      )}
    </section>
  );
};
