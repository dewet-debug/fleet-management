import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoltTokenClient, BoltTokenResponse, TimerLike } from './boltAuth';

// --- test doubles -----------------------------------------------------------

function makeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

function makeTimer() {
  interface Scheduled {
    cb: () => void;
    delay: number;
    handle: number;
  }
  const scheduled: Scheduled[] = [];
  let id = 0;
  const timer: TimerLike = {
    setTimeout: (cb, ms) => {
      const handle = ++id;
      scheduled.push({ cb, delay: ms, handle });
      return handle;
    },
    clearTimeout: (h) => {
      const i = scheduled.findIndex((s) => s.handle === h);
      if (i >= 0) scheduled.splice(i, 1);
    },
  };
  return {
    timer,
    scheduled,
    fireNext: () => {
      const s = scheduled.shift();
      if (!s) throw new Error('no timer scheduled to fire');
      s.cb();
    },
  };
}

function makeTransport(expiresInSeconds = 600) {
  const calls: number[] = [];
  const transport = async (): Promise<BoltTokenResponse> => {
    const n = calls.length + 1;
    calls.push(n);
    return {
      access_token: `token-${n}`,
      expires_in: expiresInSeconds,
      token_type: 'Bearer',
      scope: 'fleet-integration:api',
    };
  };
  return { transport, calls };
}

const baseConfig = { clientId: 'id', clientSecret: 'secret', tokenUrl: 'https://oidc.bolt.eu/token', scope: 'fleet-integration:api' };

// --- deterministic tests (fake clock + timer) -------------------------------

test('refresh is scheduled at the ~8-minute mark, strictly before the 600s expiry', async () => {
  const clock = makeClock();
  const { timer, scheduled } = makeTimer();
  const { transport } = makeTransport(600);

  const client = new BoltTokenClient({ ...baseConfig, now: clock.now, timer, transport });
  await client.start();

  assert.equal(scheduled.length, 1, 'exactly one proactive refresh scheduled');
  assert.equal(scheduled[0].delay, 480_000, 'refresh scheduled 8 minutes out (600s - 120s safety)');

  const refreshAt = client.getRefreshAt()!;
  const expiresAt = client.getExpiresAt()!;
  assert.ok(refreshAt < expiresAt, 'refresh must be scheduled before expiry');
  assert.equal(expiresAt - refreshAt, 120_000, '2-minute safety margin before expiry');

  client.stop();
});

test('proactive refresh fires before expiry and rotates the token (no 401 needed)', async () => {
  const clock = makeClock();
  const { timer, scheduled, fireNext } = makeTimer();
  const { transport, calls } = makeTransport(600);

  const client = new BoltTokenClient({ ...baseConfig, now: clock.now, timer, transport });
  await client.start();

  assert.equal(await client.getAccessToken(), 'token-1');
  assert.equal(calls.length, 1);

  const firstExpiry = client.getExpiresAt()!;
  clock.advance(480_000); // jump to the scheduled refresh point (8 min)
  assert.ok(clock.now() < firstExpiry, 'refresh point is still before the token expires');

  fireNext(); // the proactive timer fires
  await new Promise((r) => setImmediate(r)); // let the async refresh settle

  assert.equal(calls.length, 2, 'a fresh token was fetched proactively, before any request failed');
  assert.equal(await client.getAccessToken(), 'token-2', 'client now serves the rotated token');
  assert.equal(scheduled.length, 1, 'the next proactive refresh is scheduled again');

  client.stop();
});

test('getAccessToken refreshes lazily if the token slipped past its refresh point', async () => {
  const clock = makeClock();
  const { timer } = makeTimer();
  const { transport, calls } = makeTransport(600);

  const client = new BoltTokenClient({ ...baseConfig, now: clock.now, timer, transport });
  await client.start(); // token-1
  assert.equal(calls.length, 1);

  clock.advance(480_000); // reach the refresh point WITHOUT firing the timer
  const token = await client.getAccessToken();

  assert.equal(token, 'token-2', 'lazy safety net fetched a new token');
  assert.equal(calls.length, 2);

  client.stop();
});

// --- end-to-end proof with the real timer -----------------------------------

test('end-to-end: the real timer fires the refresh before real expiry', async () => {
  // Compressed lifetime so the test runs quickly: expires_in = 2s, safety
  // window 1200ms -> proactive refresh ~1000ms in, real expiry at 2000ms.
  const { transport, calls } = makeTransport(2);
  const refreshOffsets: number[] = [];
  const startWall = Date.now();

  const client = new BoltTokenClient({
    ...baseConfig,
    refreshSafetyWindowMs: 1200,
    transport,
    onRefresh: () => refreshOffsets.push(Date.now() - startWall),
  });

  await client.start();
  await new Promise((r) => setTimeout(r, 1300)); // past the ~1000ms refresh, before the 2000ms expiry
  client.stop();

  assert.ok(calls.length >= 2, `expected the token to refresh at least once via the real timer, got ${calls.length} fetch(es)`);
  assert.ok(refreshOffsets[1] < 2000, `proactive refresh at ${refreshOffsets[1]}ms must land before the 2000ms expiry`);
});
