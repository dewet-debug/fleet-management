/**
 * Assemble49 Fleet — money, distance & freshness formatting.
 * Money is central to this app; keep ZAR presentation consistent everywhere.
 */

const ZAR = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

/** R 486 200 — no cents by default (fleet-scale figures). */
export const zar = (amount: number) => ZAR.format(Math.round(amount)).replace('ZAR', 'R').trim();

/** R 4 820.50 — when cents matter (invoices, cost breakdowns). */
export const zarExact = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
    .format(amount).replace('ZAR', 'R').trim();

/** Bolt stores distance in metres. */
export const km = (metres: number) =>
  `${new Intl.NumberFormat('en-ZA').format(Math.round(metres / 100) / 10)} km`;

export const int = (n: number) => new Intl.NumberFormat('en-ZA').format(n);

/**
 * "last synced" — the app polls every few minutes and backfills, so
 * ALWAYS show freshness rather than implying real-time.
 */
export function lastSynced(iso: string | Date): string {
  const t = typeof iso === 'string' ? new Date(iso) : iso;
  const mins = Math.floor((Date.now() - t.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
