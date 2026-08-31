import type { WSEvent, SessionData, Candidate } from './types';

export class LiveVotingWSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 10000;
  private isExplicitlyClosed = false;

  public onInit?: (session: SessionData) => void;
  public onVoteUpdate?: (candidates: Candidate[], totalVotes: number) => void;
  public onTimerUpdate?: (remainingSeconds: number, formattedTime: string) => void;
  public onSessionEnd?: (reason: string, finalResults: Candidate[]) => void;
  public onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;

  constructor(url?: string) {
    const defaultHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = url || `${protocol}//${defaultHost}/ws/votes`;
  }

  public connect(): void {
    this.isExplicitlyClosed = false;
    this.onStatusChange?.('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
        this.onStatusChange?.('connected');
      };

      this.ws.onclose = () => {
        this.onStatusChange?.('disconnected');
        if (!this.isExplicitlyClosed) {
          setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS] Connection error:', err);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSEvent;
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WS] Failed to parse message JSON:', e);
        }
      };
    } catch (e) {
      console.warn('[WS] Init failed, will retry:', e);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  private handleMessage(msg: WSEvent): void {
    if (msg.event === 'PING') {
      this.send({ event: 'PONG' });
      return;
    }

    if (msg.event === 'INIT') {
      this.onInit?.(msg.data);
      return;
    }

    if (msg.event === 'VOTE_UPDATE') {
      this.onVoteUpdate?.(msg.data.candidates, msg.data.totalSessionVotes);
      return;
    }

    if (msg.event === 'TIMER_UPDATE') {
      this.onTimerUpdate?.(msg.data.remainingSeconds, msg.data.formattedTime);
      return;
    }

    if (msg.event === 'SESSION_END') {
      this.onSessionEnd?.(msg.data.reason, msg.data.finalResults);
      return;
    }
  }

  public send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public close(): void {
    this.isExplicitlyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
