/**
 * Live smoke test for the Bolt Fleet Integration API. NOT wired into the app.
 *
 * Run once real credentials are in server/.env:
 *   npx tsx src/lib/bolt/liveSmokeTest.ts [daysBack] [sampleCount]
 *
 * It proves the whole chain end-to-end against production:
 *   1. OAuth2 token fetch (oidc.bolt.eu)          -> auth works
 *   2. getCompanies                               -> discover company_id(s)
 *   3. getFleetOrders over a NARROW window        -> real trip data
 * and prints the raw JSON for a few orders so we can design bolt_trips from the
 * actual field names/types/units rather than the addendum's placeholder schema.
 */

import { env } from '../../config/env';
import { BoltTokenClient, httpTokenTransport } from './boltAuth';
import { BoltApiClient } from './boltApiClient';

async function main() {
  const daysBack = Number(process.argv[2] ?? 2);
  const sampleCount = Number(process.argv[3] ?? 3);

  if (!env.BOLT_CLIENT_ID || !env.BOLT_CLIENT_SECRET) {
    console.error(
      'BOLT_CLIENT_ID / BOLT_CLIENT_SECRET are not set in server/.env. ' +
        'Add them and re-run.',
    );
    process.exitCode = 1;
    return;
  }

  const tokenClient = new BoltTokenClient({
    clientId: env.BOLT_CLIENT_ID,
    clientSecret: env.BOLT_CLIENT_SECRET,
    tokenUrl: env.BOLT_OIDC_TOKEN_URL,
    scope: env.BOLT_OAUTH_SCOPE,
    transport: httpTokenTransport,
  });

  // 1. Auth
  console.log('--- 1. OAuth2 token fetch ---');
  const token = await tokenClient.getAccessToken();
  console.log(`OK: got access token (${token.length} chars), expires at ${new Date(tokenClient.getExpiresAt()!).toISOString()}`);

  const api = new BoltApiClient({ tokenClient });

  // 2. Companies
  console.log('\n--- 2. getCompanies ---');
  const companyIds = await api.getCompanies();
  console.log('company_ids:', JSON.stringify(companyIds));
  if (companyIds.length === 0) {
    console.error('No companies returned - cannot query orders. Check API access tier with Bolt.');
    process.exitCode = 1;
    return;
  }

  // 3. Orders over a narrow window (unix SECONDS per spec; adjust if the API rejects it)
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - daysBack * 24 * 60 * 60;
  console.log(`\n--- 3. getFleetOrders (last ${daysBack} day(s)) ---`);
  console.log(`window: ${new Date(startSec * 1000).toISOString()} .. ${new Date(nowSec * 1000).toISOString()}`);

  const result = await api.getFleetOrders({
    company_ids: companyIds,
    company_id: companyIds[0],
    start_ts: startSec,
    end_ts: nowSec,
    limit: Math.max(sampleCount, 50),
    offset: 0,
  });

  console.log(`total_orders (window): ${result.total_orders}`);
  console.log(`orders returned this page: ${result.orders.length}`);
  console.log(`company_name: ${result.company_name}`);

  const sample = result.orders.slice(0, sampleCount);
  console.log(`\n--- RAW JSON of first ${sample.length} order(s) ---`);
  console.log(JSON.stringify(sample, null, 2));

  // Quick heuristics to inform bolt_trips column types.
  if (sample.length > 0) {
    const o = sample[0];
    console.log('\n--- quick field probes (first order) ---');
    console.log('order_reference:', o.order_reference);
    console.log('vehicle_license_plate:', o.vehicle_license_plate);
    console.log('order_status:', o.order_status);
    console.log('ride_distance (units? m vs km):', o.ride_distance);
    console.log('order_created_timestamp (digits ->', String(o.order_created_timestamp).length, '=> s if 10, ms if 13):', o.order_created_timestamp);
    console.log('order_price:', JSON.stringify(o.order_price));
    console.log('order_stops types:', (o.order_stops ?? []).map((s) => s.type).join(', ') || '(none)');
  }

  tokenClient.stop();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Smoke test failed:', err?.response?.status, err?.response?.data ?? err?.message ?? err);
  process.exitCode = 1;
});
