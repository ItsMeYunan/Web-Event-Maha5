import type { Candidate, SessionData } from './types';

/**
 * Dashboard settings and finished-session history, in localStorage.
 *
 * ponytail: browser-local, so history is per-device and settings never reach
 * the bot. Move both to the backend when one exists - that also lets the vote
 * mode and gating toggles actually change bot behaviour instead of only the view.
 */

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const SETTINGS_KEY = 'maha5.settings';
const HISTORY_KEY = 'maha5.history';
const HISTORY_LIMIT = 20;

export interface Settings {
  sortByRank: boolean;
  showPercentage: boolean;
  keepHistory: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sortByRank: true,
  showPercentage: true,
  keepHistory: true,
};

export interface PastSession {
  sessionId: string;
  title: string;
  endedAt: number;
  totalVotes: number;
  candidates: Candidate[];
}

function read<T>(store: Store, key: string, fallback: T): T {
  const raw = store.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback; // corrupt entry is not worth crashing the page over
  }
}

export function loadSettings(store: Store = localStorage): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(store, SETTINGS_KEY, {}) };
}

export function saveSettings(settings: Settings, store: Store = localStorage): void {
  store.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadHistory(store: Store = localStorage): PastSession[] {
  return read<PastSession[]>(store, HISTORY_KEY, []);
}

export function clearHistory(store: Store = localStorage): void {
  store.removeItem(HISTORY_KEY);
}

/**
 * Records a finished session, newest first. Re-recording the same sessionId
 * replaces the existing entry, so a reconnect that replays SESSION_END cannot
 * duplicate it.
 */
export function recordSession(
  session: Pick<SessionData, 'sessionId' | 'title'>,
  finalResults: Candidate[],
  store: Store = localStorage
): PastSession[] {
  const entry: PastSession = {
    sessionId: session.sessionId,
    title: session.title,
    endedAt: Date.now(),
    totalVotes: finalResults.reduce((sum, c) => sum + c.votes, 0),
    candidates: finalResults,
  };
  const history = [entry, ...loadHistory(store).filter((p) => p.sessionId !== entry.sessionId)];
  const capped = history.slice(0, HISTORY_LIMIT);
  store.setItem(HISTORY_KEY, JSON.stringify(capped));
  return capped;
}

/** The single highest-voted candidate, or null on a tie or an empty vote. */
export function winnerOf(candidates: Candidate[]): Candidate | null {
  const top = candidates.reduce<Candidate | null>(
    (best, c) => (best === null || c.votes > best.votes ? c : best),
    null
  );
  if (!top || top.votes === 0) return null;
  const tied = candidates.filter((c) => c.votes === top.votes).length > 1;
  return tied ? null : top;
}
