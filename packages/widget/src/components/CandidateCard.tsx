import React, { useEffect, useRef, useState } from 'react';
import type { Candidate } from '../lib/types';
import { AvatarDisplay } from './AvatarDisplay';

interface CandidateCardProps {
  candidate: Candidate;
  isWinner?: boolean;
  rank?: number;
  compact?: boolean;
  widgetCompact?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isWinner = false,
  rank,
  compact = false,
  widgetCompact = false,
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
        'flex min-h-[66px] w-full min-w-0 select-none items-center justify-between gap-[10px] rounded-row border border-gold-deep bg-[#f3e5b9] bg-center bg-no-repeat bg-[length:100%_100%] px-[11px] py-[7px] text-ink',
        rank === 1 ? "bg-[url('/uas/scoring-1.png')]" : '',
        rank === 2 ? "bg-[url('/uas/scoring-2.png')]" : '',
        rank === 3 ? "bg-[url('/uas/scoring-3.png')]" : '',
        compact ? 'min-h-[52px] gap-[6px] px-[7px] py-1' : '',
        widgetCompact ? 'min-h-[52px]' : '',
        'max-[460px]:min-h-[48px] max-[460px]:gap-[5px] max-[460px]:px-[5px] max-[460px]:py-[3px]',
        isWinner ? 'border-2 border-gold-deep' : '',
        isPulsing ? 'pulse-anim' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${candidate.name}, ${candidate.votes} suara${rank ? `, peringkat ${rank}` : ''}`}
    >
      <div className={`flex min-w-0 flex-1 items-center gap-2 ${compact ? 'max-[460px]:gap-1' : ''} ${widgetCompact ? 'gap-[5px]' : ''}`}>
        <span className={`grid h-[32px] w-[29px] shrink-0 place-items-center bg-wine-deep font-display text-[18px] font-extrabold text-paper max-[460px]:h-[26px] max-[460px]:w-[23px] max-[460px]:text-[15px] ${widgetCompact ? 'h-[26px] w-[24px] text-[15px]' : ''}`} aria-label={rank ? `Peringkat ${rank}` : 'Belum berperingkat'}>
          {rank ? `#${rank}` : '–'}
        </span>
        <span
          className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-gold-deep bg-wine-deep"
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
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-[5px]">
            <span className={`truncate font-display text-[18px] font-extrabold uppercase leading-[1.05] text-ink ${compact ? 'text-[15px]' : ''} max-[460px]:text-[14px] ${widgetCompact ? 'text-[14px]' : ''}`}>
              {candidate.name}
            </span>
            {isWinner && <span className="shrink-0 bg-wine-deep px-1 py-0.5 text-[8px] font-extrabold tracking-[0.04em] text-gold max-[460px]:text-[7px]">PEMENANG</span>}
          </div>
          <span className={`truncate text-[10px] font-semibold text-[#512d20] ${compact ? 'text-[9px]' : ''} max-[460px]:text-[8px] ${widgetCompact ? 'text-[9px]' : ''}`}>
            {candidate.latestVoterName
              ? `Suara terbaru · ${candidate.latestVoterName}`
              : 'Belum ada suara'}
          </span>
        </div>
      </div>
      <div className={`flex min-w-[38px] shrink-0 flex-col items-end justify-center ${compact || widgetCompact ? 'min-w-[30px]' : ''} ${widgetCompact ? 'min-w-[30px]' : ''}`} aria-label={`${candidate.percentage} persen`}>
        <strong className={`font-display text-[34px] font-black leading-[0.92] text-ink ${compact ? 'text-[26px]' : ''} max-[460px]:text-[24px] ${widgetCompact ? 'text-[25px]' : ''}`}>
          {candidate.votes}
        </strong>
        <span className={`mt-0.5 font-display text-[12px] font-bold text-[#512d20] ${compact ? 'text-[9px]' : ''} max-[460px]:text-[9px] ${widgetCompact ? 'text-[9px]' : ''}`}>
          {candidate.percentage}%
        </span>
      </div>
    </article>
  );
};
