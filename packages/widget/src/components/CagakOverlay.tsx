import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ConnectionStatus, SessionData } from '../lib/types';

interface CagakOverlayProps {
  session: SessionData;
  isSessionEnded?: boolean;
  connectionStatus?: ConnectionStatus;
  isLiveSession?: boolean;
}

export const CagakOverlay: React.FC<CagakOverlayProps> = ({
  session,
  isSessionEnded = false,
  connectionStatus = 'connecting',
  isLiveSession = false,
}) => {
  const sortedCandidates = useMemo(
    () => [...session.candidates].sort((first, second) => second.votes - first.votes),
    [session.candidates]
  );
  const maxVotes = sortedCandidates[0]?.votes ?? 0;
  const isClosed = isSessionEnded || session.status === 'CLOSED';
  const isLive = isLiveSession && connectionStatus === 'connected' && !isClosed;
  const statusText = isClosed
    ? 'VOTING DITUTUP'
    : isLive
      ? session.isStageGated && session.stageName
        ? `LIVE · ${session.stageName}`
        : 'VOTING LIVE'
      : connectionStatus === 'disconnected'
        ? isLiveSession
          ? 'KONEKSI TERPUTUS · DATA TERAKHIR'
          : 'DEMO · SERVER TERPUTUS'
        : 'PRATINJAU DEMO';
  const statusColor = isClosed || (connectionStatus === 'disconnected' && isLiveSession)
    ? 'text-[#ffc1bd]'
    : isLive
      ? 'text-[#d5f1c6]'
      : connectionStatus === 'disconnected'
        ? 'text-[#ffc1bd]'
        : 'text-gold';

  return (
    <section
      className="absolute inset-0 bg-[url('/uas/cagak.png')] bg-center bg-no-repeat bg-[length:100%_100%] font-interface text-paper"
      aria-label="Panggung voting CAGAK"
    >
      <header className="absolute left-[22.6%] top-[2.4%] flex h-[10.1%] w-[54.8%] flex-col items-center justify-center gap-[3%] px-[3%] text-center">
        <h1 className="line-clamp-2 block w-full overflow-hidden text-ellipsis font-display text-[clamp(14px,2.45cqw,28px)] font-extrabold uppercase leading-[1.02]" title={session.title}>
          {session.title}
        </h1>
        <p className={`flex max-w-full items-center justify-center gap-[5px] overflow-hidden text-[clamp(10px,1.2cqw,14px)] font-bold leading-[1.1] text-ellipsis whitespace-nowrap ${statusColor}`} role="status" aria-live="polite">
          <span className="h-[6px] w-[6px] flex-none border border-current bg-current" aria-hidden="true" />
          <span>{statusText}</span>
        </p>
      </header>

      <aside className="absolute left-[0.8%] top-[4.1%] flex h-[15.8%] w-[12.8%] flex-col items-center justify-center gap-0.5 text-center text-ink" aria-label={`${session.totalVotes} total suara`}>
        <span className="font-display text-[clamp(10px,1.2cqw,14px)] font-extrabold leading-none text-wine">SUARA</span>
        <AnimatePresence initial={false}>
          <motion.strong
            key={session.totalVotes}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="max-w-full overflow-hidden font-display text-[clamp(21px,3.2cqw,38px)] font-extrabold leading-none text-clip whitespace-nowrap"
          >
            {session.totalVotes}
          </motion.strong>
        </AnimatePresence>
        <span className="font-display text-[clamp(10px,1.2cqw,14px)] font-extrabold leading-none text-wine">MASUK</span>
      </aside>

      <aside className="absolute right-[0.8%] top-[4.1%] flex h-[15.8%] w-[12.8%] flex-col items-center justify-center gap-0.5 text-center text-ink" aria-label={`Sisa waktu ${session.formattedTime}`}>
        <span className="font-display text-[clamp(10px,1.2cqw,14px)] font-extrabold leading-none text-wine">WAKTU</span>
        <strong className="max-w-full overflow-hidden font-display text-[clamp(21px,3.2cqw,38px)] font-extrabold leading-none text-clip whitespace-nowrap">
          {isClosed ? '00:00' : session.formattedTime}
        </strong>
        <span className="font-display text-[clamp(10px,1.2cqw,14px)] font-extrabold leading-none text-wine">TERSISA</span>
      </aside>

      <section className="absolute bottom-[29.2%] left-[23.5%] right-[23.5%] top-[20.1%] flex min-w-0 flex-col gap-[3%] overflow-hidden px-[2.4%] py-[2.1%]" aria-label="Hasil voting">
        <header className="flex min-w-0 items-baseline justify-between gap-2 border-b border-[rgba(255,246,216,0.42)] pb-[2%]">
          <h2 className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[clamp(15px,2.1cqw,24px)] font-extrabold leading-none">
            {isClosed ? 'HASIL AKHIR' : 'KLASEMEN'}
          </h2>
          <span className="flex-none text-[clamp(10px,1.2cqw,14px)] font-bold text-gold">
            {session.status === 'PAUSED'
              ? 'DIJEDA'
              : isClosed
                ? 'SELESAI'
                : isLive
                  ? 'LIVE'
                  : connectionStatus === 'disconnected' && isLiveSession
                    ? 'OFFLINE'
                    : 'DEMO'}
          </span>
        </header>

        {sortedCandidates.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[5px] text-center">
            <strong className="font-display text-[clamp(15px,1.9cqw,22px)]">Belum ada kandidat</strong>
            <span className="max-w-[28ch] text-[clamp(11px,1.25cqw,15px)] leading-[1.3] text-[#d7c6ad]">
              Kandidat akan tampil saat sesi voting dimulai.
            </span>
          </div>
        ) : (
          <div className="cagak-results-list flex min-h-0 flex-col gap-[2%] overflow-x-hidden overflow-y-auto" role="list" aria-label="Urutan kandidat berdasarkan suara">
            <AnimatePresence initial={false}>
              {sortedCandidates.map((candidate, index) => {
                const percentage = Math.min(100, Math.max(0, candidate.percentage));
                const isWinner = isClosed && index === 0 && maxVotes > 0;

                return (
                  <motion.article
                    key={candidate.id}
                    layout
                    role="listitem"
                    className={`flex min-w-0 flex-col gap-1 border-b px-0 py-[1.2%] pb-[1.6%] ${isWinner ? 'border-gold' : 'border-white/20'}`}
                    transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                    aria-label={`${candidate.name}, ${candidate.votes} suara, ${percentage}%`}
                  >
                    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-baseline gap-x-[clamp(4px,0.7cqw,9px)] max-[460px]:grid-cols-[auto_minmax(0,1fr)_auto] max-[460px]:gap-x-[4px]">
                      <span className={`font-display text-[clamp(17px,2.1cqw,25px)] font-extrabold ${isWinner ? 'text-[#ffeb80]' : 'text-gold'}`}>
                        #{index + 1}
                      </span>
                      <strong className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[clamp(12px,1.85cqw,22px)] font-bold leading-[1.05] text-paper" title={candidate.name}>
                        {candidate.name}
                      </strong>
                        {isWinner && <span className="text-[clamp(9px,1cqw,12px)] font-extrabold text-gold max-[460px]:hidden">PEMENANG</span>}
                      <motion.span
                        key={candidate.votes}
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="text-right font-display text-[clamp(15px,2.2cqw,26px)] font-extrabold leading-none tabular-nums text-paper"
                      >
                        {candidate.votes}
                      </motion.span>
                    </div>
                    <div
                      className="h-[clamp(4px,0.55cqw,7px)] w-full overflow-hidden bg-white/15"
                      role="progressbar"
                      aria-label={`Persentase suara ${candidate.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                      aria-valuetext={`${percentage}%`}
                    >
                      <span className="block h-full transition-[width] duration-200 ease-out" style={{ width: `${percentage}%`, backgroundColor: candidate.colorHex }} />
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </section>
  );
};
