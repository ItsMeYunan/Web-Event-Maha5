import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConnectionStatus, SessionData } from '../lib/types';
import { CandidateCard } from './CandidateCard';
import { StageIndicator } from './StageIndicator';

interface DashboardOverlayProps {
  session: SessionData;
  isSessionEnded?: boolean;
  sortByRank?: boolean;
  connectionStatus?: ConnectionStatus;
  isLiveSession?: boolean;
  compact?: boolean;
}

export const DashboardOverlay: React.FC<DashboardOverlayProps> = ({
  session,
  isSessionEnded = false,
  sortByRank = true,
  connectionStatus = 'connecting',
  isLiveSession = false,
  compact = false,
}) => {
  const isEndingSoon = !isSessionEnded && session.remainingSeconds <= 10 && session.remainingSeconds > 0;

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
    <div className={`grid h-full w-full min-w-0 grid-cols-[minmax(170px,0.36fr)_minmax(0,0.64fr)] grid-rows-[minmax(0,1fr)_auto] items-center gap-x-[clamp(10px,1.5vw,20px)] gap-y-[10px] text-paper max-[720px]:grid-cols-[minmax(0,1fr)] max-[720px]:grid-rows-[auto_minmax(0,1fr)_auto] max-[720px]:items-stretch max-[720px]:gap-[7px] ${compact ? 'grid-cols-[minmax(132px,0.34fr)_minmax(0,0.66fr)] gap-x-[10px] gap-y-[6px] max-[940px]:grid-cols-[minmax(116px,0.32fr)_minmax(0,0.68fr)]' : ''}`}>
      <section className="flex min-w-0 flex-col items-center justify-center gap-2 max-[720px]:flex-row max-[720px]:justify-center max-[720px]:gap-[9px]" aria-label="Timer sesi voting">
        <div
          className="relative aspect-[1357/1419] w-[min(100%,228px)] bg-[url('/uas/papan-timer.png')] bg-center bg-no-repeat bg-[length:100%_100%] max-[720px]:w-[clamp(82px,23vw,108px)] max-[720px]:shrink-0"
          role="timer"
          aria-label={`Sisa waktu ${session.formattedTime}`}
        >
          <span className={`absolute left-[4%] top-[49%] w-[92%] -translate-y-1/2 text-center font-display text-[clamp(30px,4.1vw,60px)] font-extrabold leading-none [text-shadow:0_2px_0_var(--color-wine-deep)] max-[720px]:text-[clamp(21px,6vw,30px)] ${isSessionEnded || isEndingSoon ? 'text-red [text-shadow:0_1px_0_var(--color-paper)]' : 'text-gold'}`}>
            {session.formattedTime}
          </span>
          <span className="absolute left-[4%] top-[62%] w-[92%] text-center text-[10px] font-bold tracking-[0.08em] text-paper max-[720px]:text-[7px]">
            SISA WAKTU
          </span>
        </div>
        <StageIndicator
          isStageGated={session.isStageGated}
          stageName={session.stageName}
          isSessionEnded={isSessionEnded}
          connectionStatus={connectionStatus}
          isLiveSession={isLiveSession}
        />
      </section>

      <section className="flex min-w-0 flex-col justify-center gap-[7px]" aria-labelledby="vote-results-title">
        <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-rule)] px-[2px] pb-[5px]">
          <h2 className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[clamp(18px,2.2vw,25px)] font-bold uppercase leading-none text-paper max-[720px]:text-[18px]" id="vote-results-title">
            Perolehan suara
          </h2>
          <span className="flex-none text-[11px] font-bold text-gold">{session.totalVotes} suara</span>
        </div>
        {sortedCandidates.length === 0 ? (
          <div className="flex min-h-[92px] flex-col justify-center gap-[5px] border border-[var(--color-rule)] bg-wine-deep p-3 text-xs leading-[1.4] text-paper">
            <strong>Belum ada kandidat di sesi ini.</strong>
            <span className="text-[#f1d7c0]">Daftar kandidat akan muncul saat sesi voting dimulai.</span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-[7px] max-[720px]:gap-[5px]">
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
                    compact={compact}
                    isWinner={isSessionEnded && candidate.votes === maxVotes && maxVotes > 0}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

    </div>
  );
};
