import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionData } from '../lib/types';
import { CandidateCard } from './CandidateCard';
import { StageIndicator } from './StageIndicator';

interface WidgetOverlayProps {
  session: SessionData;
  isSessionEnded?: boolean;
  sortByRank?: boolean;
}

export const WidgetOverlay: React.FC<WidgetOverlayProps> = ({
  session,
  isSessionEnded = false,
  sortByRank = true,
}) => {
  // Sort descending by vote count
  const sortedCandidates = useMemo(() => {
    if (!sortByRank) {
      return session.candidates.map((c, i) => ({ ...c, rank: i + 1 }));
    }
    const sorted = [...session.candidates].sort((a, b) => b.votes - a.votes);
    return sorted.map((c, i) => ({
      ...c,
      rank: i + 1,
    }));
  }, [session.candidates, sortByRank]);

  const maxVotes = useMemo(
    () => Math.max(...session.candidates.map((c) => c.votes), 0),
    [session.candidates]
  );

  return (
    <div
      style={{
        width: '320px',
        background: 'transparent',
        margin: '0 auto',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px' }}>
        {/* Stage Indicator Header */}
        <StageIndicator
          isStageGated={session.isStageGated}
          stageName={session.stageName}
          isSessionEnded={isSessionEnded}
        />

        {/* Cards list with Framer Motion Layout Reordering */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
          <AnimatePresence>
            {sortedCandidates.map((candidate) => (
              <motion.div
                key={candidate.id}
                layout
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 30,
                  mass: 0.8,
                }}
                style={{ width: '100%' }}
              >
                <CandidateCard
                  candidate={candidate}
                  rank={candidate.rank}
                  isWinner={isSessionEnded && candidate.votes === maxVotes && maxVotes > 0}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
