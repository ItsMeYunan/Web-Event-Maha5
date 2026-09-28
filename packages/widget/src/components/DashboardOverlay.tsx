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
    <div className={`dashboard-overlay${isEndingSoon ? ' dashboard-overlay--ending' : ''}${compact ? ' dashboard-overlay--compact' : ''}`}>
      <section className="dashboard-overlay__timer-column" aria-label="Timer sesi voting">
        <div
          className={`dashboard-timer${isSessionEnded || isEndingSoon ? ' dashboard-timer--alert' : ''}`}
          role="timer"
          aria-label={`Sisa waktu ${session.formattedTime}`}
        >
          <span className="dashboard-timer__value">{session.formattedTime}</span>
          <span className="dashboard-timer__caption">SISA WAKTU</span>
        </div>
        <StageIndicator
          isStageGated={session.isStageGated}
          stageName={session.stageName}
          isSessionEnded={isSessionEnded}
          connectionStatus={connectionStatus}
          isLiveSession={isLiveSession}
        />
      </section>

      <section className="dashboard-overlay__results" aria-labelledby="vote-results-title">
        <div className="dashboard-results__heading">
          <h2 id="vote-results-title">Perolehan suara</h2>
          <span>{session.totalVotes} suara</span>
        </div>
        {sortedCandidates.length === 0 ? (
          <div className="vote-empty-state">
            <strong>Belum ada kandidat di sesi ini.</strong>
            <span>Daftar kandidat akan muncul saat sesi voting dimulai.</span>
          </div>
        ) : (
          <div className="dashboard-results__list">
            <AnimatePresence initial={false}>
              {sortedCandidates.map((candidate) => (
                <motion.div
                  key={candidate.id}
                  layout
                  transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                  className="dashboard-results__item"
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

      <footer className="dashboard-overlay__footer">
        <span>Mode {session.voteMode}</span>
        <span className="dashboard-overlay__separator" aria-hidden="true">/</span>
        <strong className={isSessionEnded ? 'dashboard-overlay__state dashboard-overlay__state--closed' : 'dashboard-overlay__state'}>
          {isSessionEnded
            ? 'SESI DITUTUP'
            : isLiveSession && connectionStatus === 'connected'
              ? 'LIVE'
              : connectionStatus === 'disconnected'
                ? 'MENYAMBUNG ULANG'
                : 'PRATINJAU DEMO'}
        </strong>
      </footer>
    </div>
  );
};
