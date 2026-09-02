import React, { useEffect, useState, useRef } from 'react';
import type { Candidate } from '../lib/types';
import { isDarkColor } from '../lib/color';
import { AvatarDisplay } from './AvatarDisplay';

/**
 * Fixed row height, so CandidateList can position rows by rank without
 * measuring them. 82 = 50px avatar + 4px offset + 14px padding top and bottom
 * (app.css sets box-sizing: border-box globally).
 */
export const CARD_HEIGHT = 82;

interface CandidateCardProps {
  candidate: Candidate;
  isWinner?: boolean;
  rank?: number;
  showPercentage?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isWinner = false,
  rank,
  showPercentage = true,
}) => {
  const [isPulsing, setIsPulsing] = useState(false);
  const prevVotesRef = useRef(candidate.votes);

  // Trigger pulse scale bump on vote increment
  useEffect(() => {
    if (candidate.votes > prevVotesRef.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 250);
      prevVotesRef.current = candidate.votes;
      return () => clearTimeout(timer);
    }
    prevVotesRef.current = candidate.votes;
  }, [candidate.votes]);

  const isDark = isDarkColor(candidate.colorHex);
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subtextColor = isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.75)';

  return (
    <div
      className={isPulsing ? 'pulse-anim' : ''}
      style={{
        backgroundColor: candidate.colorHex,
        borderRadius: '18px',
        padding: '14px 18px',
        height: CARD_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'relative',
        boxShadow: isWinner
          ? '0 0 20px rgba(245, 158, 11, 0.5), 0 4px 14px rgba(0, 0, 0, 0.25)'
          : '0 4px 14px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'box-shadow 0.3s ease',
        border: isWinner ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Top Left Badges: Key Code [1] + Rank #1 */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          left: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 2,
        }}
      >
        <span
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            color: '#FFFFFF',
            fontSize: '9px',
            fontWeight: 900,
            fontFamily: 'var(--font-mono)',
            padding: '2px 5px',
            borderRadius: '5px',
            letterSpacing: '0.5px',
          }}
        >
          [{candidate.keyCode}]
        </span>

        {rank !== undefined && (
          <span
            style={{
              background: rank === 1 ? '#F59E0B' : 'rgba(0, 0, 0, 0.45)',
              color: rank === 1 ? '#000000' : '#FFFFFF',
              fontSize: '9px',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              padding: '2px 5px',
              borderRadius: '5px',
              letterSpacing: '0.5px',
              transition: 'background-color 0.3s',
            }}
          >
            #{rank}
          </span>
        )}
      </div>

      {/* Left: Avatar (52px circle with initials fallback) */}
      <div style={{ marginTop: '4px' }}>
        <AvatarDisplay
          avatarUrl={candidate.latestVoterAvatar}
          name={candidate.latestVoterName}
          size={50}
        />
      </div>

      {/* Center Info */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: textColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {candidate.name}
          </span>
          {isWinner && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 900,
                backgroundColor: '#F59E0B',
                color: '#000000',
                padding: '1px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}
            >
              👑 WINNER
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: subtextColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {candidate.latestVoterName ? `Voter: ${candidate.latestVoterName}` : 'Belum ada suara'}
        </span>
      </div>

      {/* Right Stats: Monospace Vote Count + Percentage */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '36px',
            fontWeight: 900,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            color: textColor,
            letterSpacing: '-0.5px',
          }}
        >
          {candidate.votes}
        </div>
        {showPercentage && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: subtextColor,
              marginTop: '2px',
            }}
          >
            {candidate.percentage}%
          </div>
        )}
      </div>
    </div>
  );
};
