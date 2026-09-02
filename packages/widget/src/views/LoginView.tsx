import React from 'react';

interface LoginViewProps {
  onLogin: () => void;
  error?: string | undefined;
}

/** Consent gate for /dashboard. Sends the user to Discord and nothing else. */
export const LoginView: React.FC<LoginViewProps> = ({ onLogin, error }) => (
  <main
    style={{
      minHeight: '100vh',
      backgroundColor: '#0B0F19',
      color: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: '380px',
        backgroundColor: '#0F172A',
        border: '1px solid #334155',
        borderRadius: '18px',
        padding: '32px 28px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '38px', lineHeight: 1, marginBottom: '14px' }}>🗳️</div>

      <h1 style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.3px', marginBottom: '8px' }}>
        Dashboard Live Voting
      </h1>

      <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '24px' }}>
        Masuk dengan akun Discord Anda untuk memantau sesi voting yang sedang berjalan.
      </p>

      <button
        onClick={onLogin}
        style={{
          width: '100%',
          background: '#5865F2',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          padding: '11px 16px',
          fontSize: '13px',
          fontWeight: 800,
          letterSpacing: '0.3px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <svg width="18" height="14" viewBox="0 0 71 55" fill="#FFFFFF" aria-hidden="true">
          <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.4a41 41 0 0 0-1.9 3.8 54.1 54.1 0 0 0-16.2 0A40 40 0 0 0 25.5.4a58.4 58.4 0 0 0-14.5 4.5C1.8 18.6-.7 32 .5 45.1a58.9 58.9 0 0 0 17.8 9 43.7 43.7 0 0 0 3.8-6.2 38.2 38.2 0 0 1-6-2.9l1.5-1.2a42 42 0 0 0 35.9 0l1.5 1.2a38.2 38.2 0 0 1-6 2.9 43.7 43.7 0 0 0 3.8 6.2 58.7 58.7 0 0 0 17.8-9c1.4-15.2-2.4-28.5-10.5-40.2ZM23.7 37.1c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z" />
        </svg>
        Login dengan Discord
      </button>

      {error && (
        <div
          style={{
            marginTop: '18px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #7F1D1D',
            color: '#FCA5A5',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <p style={{ fontSize: '11px', color: '#475569', marginTop: '20px', fontWeight: 500 }}>
        Hanya izin <code>identify</code> yang diminta — nama dan avatar Anda.
      </p>
    </div>
  </main>
);
