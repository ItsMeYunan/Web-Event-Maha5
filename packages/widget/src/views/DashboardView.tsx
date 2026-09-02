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
import {
  clearHistory,
  loadHistory,
  loadSettings,
  saveSettings,
  winnerOf,
  type PastSession,
  type Settings,
} from '../lib/store';
import { CandidateList } from '../components/CandidateList';
import { LoginView } from './LoginView';

interface DashboardViewProps {
  session: SessionData | null;
  isSessionEnded: boolean;
}

const PANEL: React.CSSProperties = {
  backgroundColor: '#0F172A',
  border: '1px solid #334155',
  borderRadius: '12px',
  padding: '16px 18px',
  marginTop: '16px',
};

const HEADING: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 800,
  color: '#94A3B8',
  letterSpacing: '0.4px',
  marginBottom: '12px',
};

/**
 * Handler for /dashboard - Discord login, display settings, the live session,
 * and the results of sessions that have already finished.
 *
 * ponytail: login proves identity only, never authority. Any Discord account
 * can sign in and read this page. Gate it on guild roles once a backend can
 * check them server-side; a browser-only check is advisory at best.
 */
export const DashboardView: React.FC<DashboardViewProps> = ({ session, isSessionEnded }) => {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [history, setHistory] = useState<PastSession[]>([]);

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

  // Reload history whenever a session closes, so a result appears without a refresh.
  useEffect(() => {
    setHistory(loadHistory());
  }, [isSessionEnded]);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

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
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <img src={avatarUrl(user)} alt="" width={40} height={40}
               style={{ borderRadius: '50%', display: 'block', border: '2px solid #334155' }} />
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
            style={{ background: '#1E293B', border: '1px solid #475569', color: '#94A3B8',
                     fontSize: '11px', fontWeight: 700, padding: '6px 12px',
                     borderRadius: '6px', cursor: 'pointer' }}
          >
            Keluar
          </button>
        </header>

        {/* Settings */}
        <section style={PANEL}>
          <div style={HEADING}>⚙️ PENGATURAN TAMPILAN</div>
          <Toggle
            label="Urutkan berdasarkan peringkat"
            hint="Nonaktif = urut nomor kandidat"
            checked={settings.sortByRank}
            onChange={(v) => update({ sortByRank: v })}
          />
          <Toggle
            label="Tampilkan persentase"
            checked={settings.showPercentage}
            onChange={(v) => update({ showPercentage: v })}
          />
          <Toggle
            label="Simpan riwayat sesi"
            hint="Disimpan di browser ini saja"
            checked={settings.keepHistory}
            onChange={(v) => update({ keepHistory: v })}
          />
          <p style={{ fontSize: '11px', color: '#475569', marginTop: '10px', fontWeight: 500 }}>
            Mode vote, cooldown, dan stage gating diatur di <code>config.yaml</code> — mengubahnya
            dari sini memerlukan backend.
          </p>
        </section>

        {/* Live session */}
        <section style={PANEL}>
          <div style={{ ...HEADING, display: 'flex', justifyContent: 'space-between' }}>
            <span>📊 SESI BERJALAN</span>
            <span style={{ color: isLive ? '#10B981' : '#64748B' }}>
              {isLive ? '● AKTIF' : session ? '⏹ SELESAI' : '— tidak ada'}
            </span>
          </div>
          {session ? (
            <>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginBottom: '12px' }}>
                {session.totalVotes} suara sah · {session.candidates.length} kandidat ·{' '}
                {session.isStageGated ? `🎙️ ${session.stageName ?? 'Stage gated'}` : 'Terbuka'}
              </div>
              <CandidateList
                candidates={session.candidates}
                isSessionEnded={isSessionEnded}
                gap={10}
                sortByRank={settings.sortByRank}
                showPercentage={settings.showPercentage}
              />
            </>
          ) : (
            <Empty>Belum ada sesi voting aktif. Mulai dengan <code>!vote initiate</code> di Discord.</Empty>
          )}
        </section>

        {/* History */}
        <section style={PANEL}>
          <div style={{ ...HEADING, display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center' }}>
            <span>🏆 HASIL SEBELUMNYA</span>
            {history.length > 0 && (
              <button
                onClick={() => {
                  clearHistory();
                  setHistory([]);
                }}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#64748B',
                         fontSize: '10px', fontWeight: 700, padding: '4px 9px',
                         borderRadius: '6px', cursor: 'pointer' }}
              >
                Hapus riwayat
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <Empty>
              {settings.keepHistory
                ? 'Belum ada sesi yang selesai.'
                : 'Penyimpanan riwayat dinonaktifkan di pengaturan.'}
            </Empty>
          ) : (
            history.map((past) => <PastResult key={past.sessionId} past={past} />)
          )}
        </section>
      </div>
    </main>
  );
};

const PastResult: React.FC<{ past: PastSession }> = ({ past }) => {
  const winner = winnerOf(past.candidates);
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid #1E293B' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, flex: 1, minWidth: '160px' }}>
          {winner ? (
            <>
              <span style={{ color: winner.colorHex }}>👑 {winner.name}</span>
              <span style={{ color: '#64748B', fontWeight: 600 }}> menang</span>
            </>
          ) : (
            <span style={{ color: '#94A3B8' }}>Tidak ada pemenang (seri / tanpa suara)</span>
          )}
        </span>
        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600,
                       fontFamily: 'var(--font-mono)' }}>
          {past.totalVotes} suara · {new Date(past.endedAt).toLocaleString('id-ID')}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '4px' }}>
        {[...past.candidates]
          .sort((a, b) => b.votes - a.votes)
          .map((c) => `${c.name} ${c.votes}`)
          .join('  ·  ')}
      </div>
    </div>
  );
};

const Toggle: React.FC<{
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, hint, checked, onChange }) => (
  <label
    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0',
             cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: '15px', height: '15px', accentColor: '#0284C7', cursor: 'pointer' }}
    />
    <span style={{ flex: 1 }}>
      {label}
      {hint && (
        <span style={{ color: '#475569', fontWeight: 500, fontSize: '11px' }}> — {hint}</span>
      )}
    </span>
  </label>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '20px 0', textAlign: 'center', color: '#475569',
                fontSize: '12px', fontWeight: 600 }}>
    {children}
  </div>
);
