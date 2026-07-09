// Shared helpers for the Cartrack sync services.

/** Format a Date as Cartrack's expected "Y-m-d H:i:s". */
export function fmtTimestamp(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Some Cartrack endpoints are gated by the API user's role (403) or by strict
 * server-side date-window rules (422). Neither means our sync is broken — the
 * data simply isn't available to this account/window — so callers treat these as
 * a graceful "skip" (return zero records) instead of a hard error. Returns the
 * status code when skippable, else null.
 */
export function skippableStatus(err: any): number | null {
  const s = err?.response?.status;
  return s === 403 || s === 422 ? s : null;
}
