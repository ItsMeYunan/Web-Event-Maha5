/**
 * Discord OAuth2 login, browser-only.
 *
 * Uses the implicit grant (response_type=token): Discord returns the access
 * token in the URL fragment, so no client secret is involved and no server is
 * needed. Per Discord's docs the implicit grant returns no refresh token, so
 * the user re-authorises once it expires.
 *
 * ponytail: implicit grant, token rides in the URL fragment and cannot be
 * refreshed. Move to the authorization code grant once a backend exists to hold
 * the client secret and call the token endpoint - that also keeps the token out
 * of the address bar and enables refresh.
 */

const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const API_BASE = 'https://discord.com/api/v10';
const CDN_BASE = 'https://cdn.discordapp.com';

const TOKEN_KEY = 'maha5.discord.token';
const STATE_KEY = 'maha5.discord.state';

/** Subset of Discord's User object that this dashboard reads. */
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar: string | null;
}

export class MissingClientIdError extends Error {
  constructor() {
    super('VITE_DISCORD_CLIENT_ID belum diisi');
    this.name = 'MissingClientIdError';
  }
}

/** Sends the browser to Discord's consent screen. Does not return. */
export function login(redirectPath: string = '/dashboard'): void {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId) throw new MissingClientIdError();

  // state is the CSRF guard: we compare it when Discord sends the user back.
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: 'token',
    client_id: clientId,
    scope: 'identify',
    redirect_uri: `${window.location.origin}${redirectPath}`,
    state,
  });
  window.location.href = `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Reads the token Discord left in the URL fragment after redirecting back,
 * verifies the state, stores it, and strips it from the address bar.
 * Returns null when this is an ordinary page load.
 */
export function consumeRedirect(): string | null {
  const fragment = window.location.hash.replace(/^#/, '');
  if (!fragment) return null;

  const params = new URLSearchParams(fragment);
  const token = params.get('access_token');
  const returnedState = params.get('state');

  const expectedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  if (!token) return null;
  if (!expectedState || returnedState !== expectedState) return null;

  sessionStorage.setItem(TOKEN_KEY, token);
  // Drop the fragment so the token stops showing in the URL and in any copy of it.
  window.history.replaceState(null, '', window.location.pathname);
  return token;
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function logout(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(STATE_KEY);
}

/** GET /users/@me with the bearer token. Throws on a rejected or expired token. */
export async function fetchCurrentUser(token: string): Promise<DiscordUser> {
  const response = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Discord menolak token (HTTP ${response.status})`);
  }
  return (await response.json()) as DiscordUser;
}

/** Display name, preferring the Pomelo global name over the raw username. */
export function displayName(user: DiscordUser): string {
  return user.global_name || user.username;
}

/** Avatar URL, falling back to Discord's default avatar set. */
export function avatarUrl(user: DiscordUser, size: number = 64): string {
  if (user.avatar) {
    return `${CDN_BASE}/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }
  // Pomelo accounts report discriminator "0" and index by snowflake; legacy
  // accounts index by discriminator. Snowflakes exceed 32 bits, and JS bitwise
  // operators truncate to 32, so the shift has to run in BigInt.
  const index =
    user.discriminator === '0'
      ? Number((BigInt(user.id) >> 22n) % 6n)
      : Number(user.discriminator) % 5;
  return `${CDN_BASE}/embed/avatars/${index}.png`;
}
