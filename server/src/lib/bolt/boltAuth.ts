import axios from 'axios';

/**
 * Standalone Bolt OAuth2 auth module (client_credentials grant).
 *
 * Per the Bolt Fleet Integration spec addendum, the access token expires in
 * 600s (10 min). We refresh PROACTIVELY at ~8 minutes (2 min before expiry)
 * rather than reacting to a 401 -- at polling intervals of a few minutes the
 * token endpoint is hit constantly and an expired-token failure mode would
 * otherwise show up fast.
 *
 * The module is deliberately dependency-injectable (clock, timer, transport)
 * so the proactive-refresh behaviour can be proven in isolation, without real
 * network calls or wall-clock waits. See boltAuth.test.ts.
 */

export interface BoltTokenResponse {
  access_token: string;
  /** Lifetime of the token in seconds. */
  expires_in: number;
  token_type: string;
  scope?: string;
}

/** Fetches a fresh token from the OAuth2 token endpoint. */
export type TokenTransport = (config: BoltAuthConfig) => Promise<BoltTokenResponse>;

/** Minimal timer abstraction so tests can drive scheduling deterministically. */
export interface TimerLike {
  setTimeout: (cb: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface BoltAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope: string;
  /**
   * How long before actual expiry to refresh, in ms. For a 600s token this
   * defaults to 120s, i.e. refresh at the ~8-minute mark. Kept expiry-relative
   * so it still leaves a safety margin if Bolt ever changes the token lifetime.
   */
  refreshSafetyWindowMs?: number;
  /** Injectable dependencies (defaults are the real clock/timer/HTTP). */
  now?: () => number;
  timer?: TimerLike;
  transport?: TokenTransport;
  /** Optional hook fired every time a token is (re)fetched -- handy for tests/telemetry. */
  onRefresh?: (token: BoltTokenResponse, at: number) => void;
}

const DEFAULT_SAFETY_WINDOW_MS = 120_000; // 2 min before the 10-min expiry -> ~8 min mark
const MIN_REFRESH_DELAY_MS = 1_000; // never schedule a busy-loop if the window >= lifetime

/**
 * Real HTTP transport: POST application/x-www-form-urlencoded to the token
 * endpoint. Credentials go in the body per the addendum's documented request
 * shape (client_id/client_secret/grant_type/scope).
 */
export const httpTokenTransport: TokenTransport = async (config) => {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials',
    scope: config.scope,
  });

  const { data } = await axios.post<BoltTokenResponse>(config.tokenUrl, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    timeout: 15_000,
  });

  if (!data?.access_token || typeof data.expires_in !== 'number') {
    throw new Error('Bolt token endpoint returned an unexpected payload (missing access_token/expires_in)');
  }
  return data;
};

interface CachedToken {
  accessToken: string;
  tokenType: string;
  /** Epoch ms at which the token actually expires. */
  expiresAt: number;
  /** Epoch ms at which we intend to refresh (expiresAt - safety window). */
  refreshAt: number;
}

export class BoltTokenClient {
  private readonly config: Required<Pick<BoltAuthConfig, 'clientId' | 'clientSecret' | 'tokenUrl' | 'scope'>>;
  private readonly safetyWindowMs: number;
  private readonly now: () => number;
  private readonly timer: TimerLike;
  private readonly transport: TokenTransport;
  private readonly onRefresh?: (token: BoltTokenResponse, at: number) => void;

  private cached: CachedToken | null = null;
  private refreshHandle: unknown = null;
  private inFlight: Promise<CachedToken> | null = null;

  constructor(config: BoltAuthConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('BoltTokenClient requires clientId and clientSecret');
    }
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokenUrl: config.tokenUrl,
      scope: config.scope,
    };
    this.safetyWindowMs = config.refreshSafetyWindowMs ?? DEFAULT_SAFETY_WINDOW_MS;
    this.now = config.now ?? Date.now;
    this.timer = config.timer ?? {
      setTimeout: (cb, ms) => setTimeout(cb, ms),
      clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    };
    this.transport = config.transport ?? httpTokenTransport;
    this.onRefresh = config.onRefresh;
  }

  /**
   * Returns a currently-valid access token, fetching one if we have none or the
   * cached one has slipped past its refresh point (a lazy safety net -- the
   * proactive timer normally refreshes before this is ever needed).
   */
  async getAccessToken(): Promise<string> {
    const current = this.cached;
    if (current && this.now() < current.refreshAt) {
      return current.accessToken;
    }
    const token = await this.fetch();
    return token.accessToken;
  }

  /** Kick off the proactive-refresh lifecycle by fetching the first token. */
  async start(): Promise<void> {
    await this.fetch();
  }

  /** Stop the background refresh timer. Safe to call multiple times. */
  stop(): void {
    if (this.refreshHandle !== null) {
      this.timer.clearTimeout(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  /** Fetch (or await an in-flight fetch), cache, and schedule the next refresh. */
  private fetch(): Promise<CachedToken> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = (async () => {
      const response = await this.transport(this.config);
      const fetchedAt = this.now();
      const expiresAt = fetchedAt + response.expires_in * 1000;
      const refreshAt = Math.max(fetchedAt + MIN_REFRESH_DELAY_MS, expiresAt - this.safetyWindowMs);

      const cached: CachedToken = {
        accessToken: response.access_token,
        tokenType: response.token_type,
        expiresAt,
        refreshAt,
      };
      this.cached = cached;
      this.scheduleRefresh(refreshAt - fetchedAt);
      this.onRefresh?.(response, fetchedAt);
      return cached;
    })();

    // Clear the in-flight guard whether it resolves or rejects, so a failed
    // fetch doesn't wedge the client into never retrying.
    this.inFlight.finally(() => {
      this.inFlight = null;
    }).catch(() => {});

    return this.inFlight;
  }

  private scheduleRefresh(delayMs: number): void {
    this.stop();
    this.refreshHandle = this.timer.setTimeout(() => {
      this.refreshHandle = null;
      // Fire-and-forget; errors are swallowed here but a real integration would
      // log via the same failure path as Cartrack sync (addendum §5).
      this.fetch().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[Bolt] proactive token refresh failed:', err?.message ?? err);
      });
    }, Math.max(0, delayMs));
  }

  /** Test/introspection helper: when is the next refresh scheduled (epoch ms)? */
  getRefreshAt(): number | null {
    return this.cached?.refreshAt ?? null;
  }

  /** Test/introspection helper: when does the current token expire (epoch ms)? */
  getExpiresAt(): number | null {
    return this.cached?.expiresAt ?? null;
  }
}
