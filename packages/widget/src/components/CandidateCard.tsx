import React, { useEffect, useRef, useState } from 'react';
import type { Candidate } from '../lib/types';
import { AvatarDisplay } from './AvatarDisplay';

interface CandidateCardProps {
  candidate: Candidate;
  isWinner?: boolean;
  rank?: number;
  compact?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isWinner = false,
  rank,
  compact = false,
}) => {
  const [isPulsing, setIsPulsing] = useState(false);
  const previousVotes = useRef(candidate.votes);

  useEffect(() => {
    if (candidate.votes > previousVotes.current) {
      setIsPulsing(true);
      const timeout = window.setTimeout(() => setIsPulsing(false), 250);
      previousVotes.current = candidate.votes;
      return () => window.clearTimeout(timeout);
    }
    previousVotes.current = candidate.votes;
  }, [candidate.votes]);

  return (
    <article
      className={[
        'candidate-card',
        rank ? `candidate-card--rank-${rank}` : 'candidate-card--unranked',
        compact ? 'candidate-card--compact' : '',
        isWinner ? 'candidate-card--winner' : '',
        isPulsing ? 'pulse-anim' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${candidate.name}, ${candidate.votes} suara${rank ? `, peringkat ${rank}` : ''}`}
    >
      <div className="candidate-card__identity">
        <span className="candidate-card__rank" aria-label={rank ? `Peringkat ${rank}` : 'Belum berperingkat'}>
          {rank ? `#${rank}` : '–'}
        </span>
        <span
          className="candidate-card__avatar"
          style={{
            borderColor: candidate.colorHex,
            width: compact ? 36 : 50,
            height: compact ? 36 : 50,
          }}
        >
          <AvatarDisplay
            avatarUrl={candidate.latestVoterAvatar}
            name={candidate.latestVoterName}
            size={compact ? 30 : 44}
          />
        </span>
        <div className="candidate-card__copy">
          <div className="candidate-card__name-row">
            <span className="candidate-card__key">[{candidate.keyCode}]</span>
            <span className="candidate-card__name">{candidate.name}</span>
            {isWinner && <span className="candidate-card__winner">PEMENANG</span>}
          </div>
          <span className="candidate-card__voter">
            {candidate.latestVoterName
              ? `Suara terbaru · ${candidate.latestVoterName}`
              : 'Belum ada suara'}
          </span>
        </div>
      </div>
      <div className="candidate-card__score" aria-label={`${candidate.percentage} persen`}>
        <strong>{candidate.votes}</strong>
        <span>{candidate.percentage}%</span>
      </div>
    </article>
  );
};
