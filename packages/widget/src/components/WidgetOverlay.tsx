import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConnectionStatus, SessionData } from '../lib/types';
import { CandidateCard } from './CandidateCard';
import { StageIndicator } from './StageIndicator';

interface WidgetOverlayProps {
  session: SessionData;
  isSessionEnded?: boolean;
  sortByRank?: boolean;
  connectionStatus?: ConnectionStatus;
  isLiveSession?: boolean;
}

export const WidgetOverlay: React.FC<WidgetOverlayProps> = ({
  session,
  isSessionEnded = false,
  sortByRank = true,
  connectionStatus = 'connecting',
  isLiveSession = false,
}) => {
  const sortedCandidates = useMemo(() => {
    if (!sortByRank) {
      return session.candidates.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
    }
    return [...session.candidates]
      .sort((first, second) => second.votes - first.votes)
      .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  }, [session.candidates, sortByRank]);

  const maxVotes = useMemo(
    () => Math.max(...session.candidates.map((candidate) => candidate.votes), 0),
    [session.candidates]
  );

  return (
    <section
      className="relative aspect-[2698/3164] w-[min(320px,100%)] bg-[url('/uas/papan-vote.png')] bg-center bg-no-repeat bg-[length:100%_100%] text-ink"
      aria-label="Papan voting UAS"
    >
      <div className="absolute inset-[9%_9%_5.5%] flex min-w-0 flex-col gap-[7px]">
        <StageIndicator
          isStageGated={session.isStageGated}
          stageName={session.stageName}
          isSessionEnded={isSessionEnded}
          connectionStatus={connectionStatus}
          isLiveSession={isLiveSession}
        />

        {sortedCandidates.length === 0 ? (
          <div className="flex min-h-[100px] flex-col justify-center gap-[5px] border border-[var(--color-rule)] bg-wine-deep p-3 text-xs leading-[1.4] text-paper">
            <strong>Belum ada kandidat.</strong>
            <span className="text-[#f1d7c0]">Kandidat tampil saat voting dimulai.</span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-[6px]">
            <AnimatePresence initial={false}>
              {sortedCandidates.map((candidate) => (
                <motion.div
                  key={candidate.id}
                  layout
                  transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                  className="min-w-0"
                >
                  <CandidateCard
                    candidate={candidate}
                    rank={candidate.rank}
                    compact
                    widgetCompact
                    isWinner={isSessionEnded && candidate.votes === maxVotes && maxVotes > 0}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};
