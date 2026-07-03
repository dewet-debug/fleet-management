/**
 * Assemble49 Fleet — Signal status system
 *
 * ONE semantic palette (success / warning / info / danger / neutral)
 * mapped across every status vocabulary in the app, so a green pill
 * always means the same thing whether it's a vehicle, a Bolt trip,
 * or a sync log. Import `statusMeta(kind, value)` in the Badge and
 * you never hand-pick a colour again.
 */

export type Semantic = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export const SEMANTIC: Record<Semantic, { text: string; bg: string; label: string }> = {
  success: { text: 'text-success', bg: 'bg-success-bg', label: 'Success' },
  warning: { text: 'text-warning', bg: 'bg-warning-bg', label: 'In progress' },
  info:    { text: 'text-info',    bg: 'bg-info-bg',    label: 'Info' },
  danger:  { text: 'text-danger',  bg: 'bg-danger-bg',  label: 'Attention' },
  neutral: { text: 'text-neutral', bg: 'bg-neutral-bg', label: 'Neutral' },
};

type Entry = { sem: Semantic; label: string };

// ---- Bolt order status ----
export const BOLT_STATUS: Record<string, Entry> = {
  finished:                       { sem: 'success', label: 'Finished' },
  client_cancelled:               { sem: 'neutral', label: 'Client cancelled' },
  driver_rejected:                { sem: 'warning', label: 'Driver rejected' },
  driver_did_not_respond:         { sem: 'warning', label: 'No response' },
  driver_cancelled_after_accept:  { sem: 'danger',  label: 'Cancelled' },
  client_did_not_show:            { sem: 'neutral', label: 'Client no-show' },
};

// ---- Vehicle status ----
export const VEHICLE_STATUS: Record<string, Entry> = {
  ACTIVE:         { sem: 'success', label: 'Active' },
  IN_SERVICE:     { sem: 'warning', label: 'In service' },
  OUT_OF_SERVICE: { sem: 'danger',  label: 'Out of service' },
  RETIRED:        { sem: 'neutral', label: 'Retired' },
};

// ---- Driver status ----
export const DRIVER_STATUS: Record<string, Entry> = {
  ACTIVE:    { sem: 'success', label: 'Active' },
  INACTIVE:  { sem: 'neutral', label: 'Inactive' },
  SUSPENDED: { sem: 'danger',  label: 'Suspended' },
};

// ---- Service record workflow ----
// Ordered — also drives the <ServiceStepper/>. RETURNED is off-path (danger).
export const SERVICE_ORDER = [
  'DRAFT', 'SCHEDULED', 'AUTHORIZED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED',
] as const;

export const SERVICE_STATUS: Record<string, Entry> = {
  DRAFT:       { sem: 'neutral', label: 'Draft' },
  SCHEDULED:   { sem: 'info',    label: 'Scheduled' },
  AUTHORIZED:  { sem: 'info',    label: 'Authorized' },
  IN_PROGRESS: { sem: 'warning', label: 'In progress' },
  COMPLETED:   { sem: 'success', label: 'Completed' },
  APPROVED:    { sem: 'success', label: 'Approved' },
  RETURNED:    { sem: 'danger',  label: 'Returned' },
};

// ---- Sync log status ----
export const SYNC_STATUS: Record<string, Entry> = {
  RUNNING:                { sem: 'warning', label: 'Running' },
  COMPLETED:              { sem: 'success', label: 'Completed' },
  COMPLETED_WITH_ERRORS:  { sem: 'warning', label: 'With errors' },
  FAILED:                 { sem: 'danger',  label: 'Failed' },
  // A49 sync uses these variants
  STARTED:                { sem: 'warning', label: 'Started' },
  PARTIAL:                { sem: 'warning', label: 'Partial' },
};

const REGISTRY = {
  bolt: BOLT_STATUS,
  vehicle: VEHICLE_STATUS,
  driver: DRIVER_STATUS,
  service: SERVICE_STATUS,
  sync: SYNC_STATUS,
} as const;

export type StatusKind = keyof typeof REGISTRY;

/** Resolve any enum value to its semantic tone + display label + Tailwind classes. */
export function statusMeta(kind: StatusKind, value: string) {
  const entry = REGISTRY[kind]?.[value] ?? { sem: 'neutral' as Semantic, label: value };
  return { ...entry, ...SEMANTIC[entry.sem] };
}
