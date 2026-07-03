import type { BoltAnalytics } from '../../api/bolt';
import { zar, int } from '../../theme/format';

/**
 * Reusable hand-built (dependency-free) charts for Bolt analytics data,
 * shared by the Bolt Trips → Analytics tab and the Dashboard.
 *
 * Each chart takes an optional `onSelect` — clicking an element drills through
 * to the matching Bolt-trips filter (day, payment method, status, or vehicle).
 */

/** A filter delta a chart click produces. Empty string clears that filter. */
export interface TripDrill {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  status?: string;
  search?: string;
}

// Signal semantic hexes for charts that need inline colour.
// CSS-variable-backed so charts follow light/dark mode (DOM + inline styles
// resolve var(); see src/styles/tokens.css).
const C = {
  success: 'var(--success)',
  primary: 'var(--primary)',
  primary300: 'var(--peri)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  neutral: 'var(--neutral)',
  danger: 'var(--danger)',
};
const DONUT_PALETTE = [C.primary, C.success, C.warning, C.info, C.neutral, C.danger];

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

type Trend = BoltAnalytics['dailyTrend'];
type PaymentMix = BoltAnalytics['paymentMix'];
type Funnel = BoltAnalytics['funnel'];
type TopVehicles = BoltAnalytics['topVehicles'];

/** Daily stacked bars: net (front) + commission (behind) = gross fare. */
export function RevenueTrendChart({
  trend,
  height = 140,
  showDayLabels = true,
  onSelect,
}: {
  trend: Trend;
  height?: number;
  showDayLabels?: boolean;
  onSelect?: (d: TripDrill) => void;
}) {
  if (!trend.length) return <p className="py-8 text-center text-sm text-ink-faint">No trips in this window.</p>;
  const maxGross = Math.max(1, ...trend.map((d) => d.gross));
  const barsH = height - 20;
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {trend.map((d) => {
          const gH = (d.gross / maxGross) * barsH;
          const netH = d.gross > 0 ? (d.net / d.gross) * gH : 0;
          return (
            <div
              key={d.day}
              onClick={onSelect ? () => onSelect({ dateFrom: d.day, dateTo: d.day, status: '' }) : undefined}
              className={`group flex flex-1 flex-col items-center justify-end ${onSelect ? 'cursor-pointer' : ''}`}
              title={`${d.day} · gross ${zar(d.gross)} · ${int(d.finished)} trips${onSelect ? ' · click to view' : ''}`}
            >
              <div className={`relative w-full max-w-[26px] overflow-hidden rounded-t-sm ${onSelect ? 'group-hover:opacity-80' : ''}`} style={{ height: gH || 1 }}>
                <div className="absolute inset-x-0 bottom-0" style={{ height: gH, background: C.primary300 }} />
                <div className="absolute inset-x-0 bottom-0" style={{ height: netH, background: C.success }} />
              </div>
            </div>
          );
        })}
      </div>
      {showDayLabels && (
        <div className="mt-1.5 flex gap-[3px]">
          {trend.map((d) => (
            <span key={d.day} className="flex-1 text-center font-mono text-[9px] text-ink-ghost">{d.day.slice(5)}</span>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-4 font-mono text-meta uppercase tracking-wider text-ink-ghost">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: C.success }} /> Net</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: C.primary300 }} /> Commission</span>
      </div>
    </div>
  );
}

/** Donut of payment methods (by finished-trip count) + legend. */
export function PaymentMixDonut({ paymentMix, onSelect }: { paymentMix: PaymentMix; onSelect?: (d: TripDrill) => void }) {
  const total = paymentMix.reduce((s, p) => s + p.count, 0) || 1;
  let acc = 0;
  const conic = paymentMix
    .map((p, i) => {
      const start = (acc / total) * 360;
      acc += p.count;
      const end = (acc / total) * 360;
      return `${DONUT_PALETTE[i % DONUT_PALETTE.length]} ${start}deg ${end}deg`;
    })
    .join(', ');
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: 116, height: 116 }}>
        <div className="h-full w-full rounded-pill" style={{ background: `conic-gradient(${conic || `${C.neutral} 0deg 360deg`})` }} />
        <div className="absolute inset-[22px] grid place-items-center rounded-pill bg-paper-card text-center">
          <div>
            <p className="font-mono text-lg font-semibold text-ink-strong">{int(paymentMix.reduce((s, p) => s + p.count, 0))}</p>
            <p className="font-mono text-meta uppercase tracking-wider text-ink-ghost">trips</p>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {paymentMix.map((p, i) => (
          <div
            key={p.method}
            onClick={onSelect ? () => onSelect({ paymentMethod: p.method, status: 'finished' }) : undefined}
            className={`flex items-center gap-2 rounded-control px-1 py-0.5 text-sm ${onSelect ? 'cursor-pointer hover:bg-paper-sunken' : ''}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
            <span className="flex-1 truncate capitalize text-ink-body">{p.method.replace(/_/g, ' ')}</span>
            <span className="font-mono text-xs text-ink-muted">{int(p.count)}</span>
            <span className="w-9 text-right font-mono text-xs text-ink-faint">{pct(p.count, total)}%</span>
          </div>
        ))}
        {paymentMix.length === 0 && <p className="text-sm text-ink-faint">No finished trips in window.</p>}
      </div>
    </div>
  );
}

/** Completion funnel: attempts → accepted → finished, plus net paid. */
export function CompletionFunnel({ funnel, onSelect }: { funnel: Funnel; onSelect?: (d: TripDrill) => void }) {
  const rows: { label: string; value: number; tone: string; drill?: TripDrill }[] = [
    { label: 'Attempts', value: funnel.attempts, tone: C.neutral, drill: { status: '' } },
    { label: 'Accepted', value: funnel.accepted, tone: C.info },
    { label: 'Finished', value: funnel.finished, tone: C.success, drill: { status: 'finished' } },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const p = pct(r.value, funnel.attempts);
        const drop = i > 0 ? rows[i - 1].value - r.value : 0;
        const clickable = onSelect && r.drill;
        return (
          <div
            key={r.label}
            onClick={clickable ? () => onSelect!(r.drill!) : undefined}
            className={clickable ? 'cursor-pointer rounded-control p-1 hover:bg-paper-sunken' : ''}
          >
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-ink-body">{r.label}</span>
              <span className="font-mono text-ink-strong">{int(r.value)} <span className="text-ink-faint">· {p}%</span></span>
            </div>
            <div className="h-3 overflow-hidden rounded-pill bg-paper-sunken">
              <div className="h-full rounded-pill" style={{ width: `${p}%`, background: r.tone }} />
            </div>
            {i > 0 && drop > 0 && (
              <p className="mt-0.5 font-mono text-[10px] text-danger">−{int(drop)} dropped ({pct(drop, rows[i - 1].value)}%)</p>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-paper-hair pt-3">
        <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Net paid to fleet</span>
        <span className="font-mono text-lg font-semibold text-success">{zar(funnel.netPaid)}</span>
      </div>
    </div>
  );
}

/** Horizontal bar list of top-earning vehicles by gross fare. */
export function TopVehiclesBars({ topVehicles, onSelect }: { topVehicles: TopVehicles; onSelect?: (d: TripDrill) => void }) {
  const max = Math.max(1, ...topVehicles.map((v) => v.gross));
  return (
    <div className="space-y-2">
      {topVehicles.map((v) => (
        <div
          key={v.plate}
          onClick={onSelect ? () => onSelect({ search: v.plate }) : undefined}
          className={`flex items-center gap-3 rounded-control px-1 py-0.5 ${onSelect ? 'cursor-pointer hover:bg-paper-sunken' : ''}`}
          title={onSelect ? `View trips for ${v.plate}` : undefined}
        >
          <span className="w-24 shrink-0 font-mono text-xs text-ink-strong">{v.plate}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-control bg-paper-sunken">
            <div className="h-full rounded-control" style={{ width: `${pct(v.gross, max)}%`, background: C.primary }} />
          </div>
          <span className="w-24 text-right font-mono text-xs text-ink-strong">{zar(v.gross)}</span>
          <span className="w-16 text-right font-mono text-xs text-ink-faint">{int(v.trips)} trips</span>
        </div>
      ))}
      {topVehicles.length === 0 && <p className="text-sm text-ink-faint">No finished trips in window.</p>}
    </div>
  );
}
