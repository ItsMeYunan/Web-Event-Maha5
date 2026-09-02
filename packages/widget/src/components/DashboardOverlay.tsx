import React from 'react';
import type { SessionData } from '../lib/types';
import { CandidateList } from './CandidateList';

interface DashboardOverlayProps {
  session: SessionData;
  isSessionEnded?: boolean;
}

export const DashboardOverlay: React.FC<DashboardOverlayProps> = ({
  session,
  isSessionEnded = false,
}) => {
  const isEndingSoon = !isSessionEnded && session.remainingSeconds <= 10 && session.remainingSeconds > 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
      }}
    >
      {/* 1. Large Monospace Countdown Timer */}
      <div style={{ marginBottom: '6px', textAlign: 'center' }}>
        {isSessionEnded || session.remainingSeconds <= 0 ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '48px',
              fontWeight: 900,
              color: '#DC2626',
              letterSpacing: '2px',
              lineHeight: 1,
            }}
          >
            <svg style={{ width: '44px', height: '44px', fill: '#DC2626' }} viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
            <span>VOTING SELESAI</span>
          </div>
        ) : (
          <div
            style={{
              fontSize: '64px',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '4px',
              lineHeight: 1,
              color: isEndingSoon ? '#DC2626' : '#0F172A',
              transition: 'color 0.3s ease',
              animation: isEndingSoon ? 'vote-pulse 1s infinite alternate ease-in-out' : 'none',
            }}
          >
            {session.formattedTime}
          </div>
        )}
      </div>

      {/* 2. Stage Info Banner */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: isSessionEnded ? '#EF4444' : '#64748B',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isSessionEnded ? '#EF4444' : '#10B981',
            boxShadow: isSessionEnded ? 'none' : '0 0 8px #10B981',
          }}
        />
        <span>
          {isSessionEnded
            ? '🔒 Sesi voting telah berakhir · Hasil final telah dikunci'
            : session.isStageGated
            ? `🎙️ Voting hanya untuk member di ${session.stageName ?? 'Stage Channel'}`
            : '🎙️ Voting terbuka untuk seluruh member'}
        </span>
      </div>

      {/* 3. Candidate Cards (pet-care-dashboard style) with Framer Motion Layout Reordering */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
        <CandidateList
          candidates={session.candidates}
          isSessionEnded={isSessionEnded}
          gap={12}
        />
      </div>

      {/* 4. Footer Metadata */}
      <div
        style={{
          marginTop: '28px',
          fontSize: '13px',
          color: '#64748B',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        Total Suara Sah: <strong>{session.totalVotes}</strong> · Mode: {session.voteMode} ·{' '}
        <span style={{ color: isSessionEnded ? '#EF4444' : '#10B981', fontWeight: 800 }}>
          {isSessionEnded ? '⏹ CLOSED' : '● ACTIVE'}
        </span>
      </div>
    </div>
  );
};
