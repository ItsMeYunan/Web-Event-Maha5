/**
 * Type definitions matching Software Design Document (SDD v1.2.0)
 */

export interface Candidate {
  id: string;
  keyCode: string;
  name: string;
  colorHex: string;
  votes: number;
  percentage: number;
  latestVoterName?: string;
  latestVoterAvatar?: string;
}

export interface SessionData {
  sessionId: string;
  title: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  voteMode: 'ONE_TIME' | 'COOLDOWN';
  isStageGated: boolean;
  stageName?: string;
  durationSeconds: number;
  expiresAt: string;
  formattedTime: string;
  remainingSeconds: number;
  totalVotes: number;
  candidates: Candidate[];
}

export type WSEvent = 
  | { event: 'INIT'; data: SessionData }
  | { event: 'VOTE_UPDATE'; data: { sessionId: string; candidateId: string; totalSessionVotes: number; candidates: Candidate[]; log?: { username: string; candidateName: string; keyCode: string; timestamp: string } } }
  | { event: 'TIMER_UPDATE'; data: { remainingSeconds: number; formattedTime: string } }
  | { event: 'SESSION_END'; data: { sessionId: string; reason: string; finalResults: Candidate[] } }
  | { event: 'PING' }
  | { event: 'PONG' };
