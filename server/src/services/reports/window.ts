const SAST = '+02:00';
const DAY_MS = 24 * 60 * 60 * 1000;

export { SAST, DAY_MS };

/** Resolve a date-range window (SAST-anchored), defaulting to the last 30 days. */
export function resolveWindow(params: { dateFrom?: string; dateTo?: string }) {
  const now = new Date();
  const end = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999${SAST}`) : now;
  const start = params.dateFrom
    ? new Date(`${params.dateFrom}T00:00:00${SAST}`)
    : new Date(now.getTime() - 30 * DAY_MS);
  const windowDays = Math.max(1, (end.getTime() - start.getTime()) / DAY_MS);
  return { start, end, windowDays };
}
