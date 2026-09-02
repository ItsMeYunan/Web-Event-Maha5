import React from 'react';
import type { Candidate } from '../lib/types';
import { CandidateCard, CARD_HEIGHT } from './CandidateCard';

interface CandidateListProps {
  candidates: Candidate[];
  isSessionEnded?: boolean;
  gap?: number;
  sortByRank?: boolean;
  showPercentage?: boolean;
}

/**
 * Rank-ordered list. Rows keep their DOM order (so React never remounts a card)
 * and are placed by rank with a transform, which is paint-time only and so
 * animates a candidate overtaking another without reflowing the list.
 *
 * ponytail: rows are a fixed CARD_HEIGHT, which is what lets this avoid FLIP
 * measurement and an animation library. Measure offsets instead if cards ever
 * need to vary in height.
 */
export const CandidateList: React.FC<CandidateListProps> = ({
  candidates,
  isSessionEnded = false,
  gap = 8,
  sortByRank = true,
  showPercentage = true,
}) => {
  const ordered = sortByRank
    ? [...candidates].sort((a, b) => b.votes - a.votes)
    : candidates;
  const rankByKey = new Map(ordered.map((candidate, index) => [candidate.keyCode, index]));
  const maxVotes = Math.max(0, ...candidates.map((c) => c.votes));

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: Math.max(0, candidates.length * (CARD_HEIGHT + gap) - gap),
      }}
    >
      {candidates.map((candidate) => {
        const rank = rankByKey.get(candidate.keyCode) ?? 0;
        return (
          <div
            key={candidate.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${rank * (CARD_HEIGHT + gap)}px)`,
              transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <CandidateCard
              candidate={candidate}
              rank={rank + 1}
              showPercentage={showPercentage}
              isWinner={isSessionEnded && candidate.votes === maxVotes && maxVotes > 0}
            />
          </div>
        );
      })}
    </div>
  );
};
