import React, { useEffect, useState } from 'react';
import type { SessionData } from '../lib/types';
import {
  avatarUrl,
  consumeRedirect,
  displayName,
  fetchCurrentUser,
  getToken,
  login,
  logout,
  MissingClientIdError,
  type DiscordUser,
} from '../lib/auth';
import { LoginView } from './LoginView';

interface DashboardViewProps {
  session: SessionData | null;
  isSessionEnded: boolean;
}

/**
 * Handler for /dashboard — Discord login, then a summary of the live session.
 *
 * ponytail: login proves identity only, never authority. Any Discord account
 * can sign in and read this page. Gate it on guild roles once a backend can
 * check them server-side; a browser-only check is advisory at best.
 */
export const DashboardView: React.FC<DashboardViewProps> = ({ session, isSessionEnded }) => {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = consumeRedirect() ?? getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    fetchCurrentUser(token)
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        logout(); // a rejected token is worth nothing, drop it
        setError(e instanceof Error ? e.message : 'Gagal memuat profil Discord');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = () => {
    try {
      login();
    } catch (e: unknown) {
      setError(
        e instanceof MissingClientIdError
          ? 'VITE_DISCORD_CLIENT_ID belum diisi di .env — salin Client ID dari Discord Developer Portal.'
          : 'Tidak dapat memulai proses login.'
      );
    }
  };

  if (isLoading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#0B0F19', color: '#64748B',
                     display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
        Memuat…
      </main>
    );
  }

  if (!user) return <LoginView onLogin={handleLogin} error={error} />;

  const isLive = session !== null && !isSessionEnded;

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0B0F19',
        color: '#F8FAFC',
        padding: '28px 16px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '820px' }}>
        {/* Identity bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
          }}
        >
          <img
            src={avatarUrl(user)}
            alt=""
            width={40}
            height={40}
            style={{ borderRadius: '50%', display: 'block', border: '2px solid #334155' }}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName(user)}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B',
                          fontFamily: 'var(--font-mono)' }}>
              @{user.username}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              setUser(null);
            }}
            style={{
              background: '#1E293B',
              border: '1px solid #475569',
              color: '#94A3B8',
              fontSize: '11px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Keluar
          </button>
        </header>

        {/* Session summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <StatCard label="Status Sesi"
                    value={isLive ? '● AKTIF' : session ? '⏹ SELESAI' : '— Tidak ada'}
                    color={isLive ? '#10B981' : session ? '#EF4444' : '#64748B'} />
          <StatCard label="Total Suara Sah" value={session ? String(session.totalVotes) : '0'} />
          <StatCard label="Jumlah Kandidat" value={session ? String(session.candidates.length) : '0'} />
          <StatCard label="Stage Gating"
                    value={session?.isStageGated ? `🎙️ ${session.stageName ?? 'Aktif'}` : 'Terbuka'}
                    color={session?.isStageGated ? '#10B981' : '#94A3B8'} />
        </div>

        {session ? (
          <div
            style={{
              marginTop: '20px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '12px',
                          letterSpacing: '0.4px' }}>
              📋 PEROLEHAN SUARA
            </div>
            {[...session.candidates]
              .sort((a, b) => b.votes - a.votes)
              .map((candidate, index) => (
                <div
                  key={candidate.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 0',
                    borderTop: index === 0 ? 'none' : '1px solid #1E293B',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                 backgroundColor: candidate.colorHex }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, flex: 1, whiteSpace: 'nowrap',
                                 overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      #{index + 1}
                    </span>{' '}
                    {candidate.name}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                    {candidate.votes}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B',
                                 fontFamily: 'var(--font-mono)', width: '48px', textAlign: 'right' }}>
                    {candidate.percentage}%
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: '20px',
              padding: '32px 18px',
              textAlign: 'center',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px dashed #334155',
              borderRadius: '12px',
            }}
          >
            Belum ada sesi voting aktif. Mulai dengan <code>!vote initiate</code> di Discord.
          </div>
        )}
      </div>
    </main>
  );
};

const StatCard: React.FC<{ label: string; value: string; color?: string | undefined }> = ({
  label,
  value,
  color = '#F8FAFC',
}) => (
  <div
    style={{
      backgroundColor: '#0F172A',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '14px 16px',
    }}
  >
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px',
                  marginBottom: '6px' }}>
      {label}
    </div>
    <div style={{ fontSize: '18px', fontWeight: 900, color, fontFamily: 'var(--font-mono)' }}>
      {value}
    </div>
  </div>
);
