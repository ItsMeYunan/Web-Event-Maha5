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
    <section className="vote-widget" aria-label="Papan voting UAS">
      <div className="vote-widget__content">
        <StageIndicator
          isStageGated={session.isStageGated}
          stageName={session.stageName}
          isSessionEnded={isSessionEnded}
          connectionStatus={connectionStatus}
          isLiveSession={isLiveSession}
        />

        {sortedCandidates.length === 0 ? (
          <div className="vote-empty-state vote-empty-state--widget">
            <strong>Belum ada kandidat.</strong>
            <span>Kandidat tampil saat voting dimulai.</span>
          </div>
        ) : (
          <div className="vote-widget__list">
            <AnimatePresence initial={false}>
              {sortedCandidates.map((candidate) => (
                <motion.div
                  key={candidate.id}
                  layout
                  transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                  className="vote-widget__item"
                >
                  <CandidateCard
                    candidate={candidate}
                    rank={candidate.rank}
                    compact
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
