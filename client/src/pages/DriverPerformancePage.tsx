import { useState } from 'react';
import { Card, Stat, LoadingSpinner, Table } from '../components/ui';
import { useDriverPerformance } from '../hooks/useAnalytics';
import type { DriverPerformance } from '../api/analytics';
import { zar, int } from '../theme/format';

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { dateFrom: isoLocal(from), dateTo: isoLocal(to) };
}

const controlClass =
  'rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body focus:border-primary-400 focus:outline-none';

const COLUMNS = [
  { key: 'driver', header: 'Driver' },
  { key: 'finished', header: 'Finished', className: 'text-right' },
  { key: 'offered', header: 'Offered', className: 'text-right' },
  { key: 'acceptance', header: 'Acceptance', className: 'text-right' },
  { key: 'completion', header: 'Completion', className: 'text-right' },
  { key: 'cancellation', header: 'Cancellation', className: 'text-right' },
  { key: 'activeDays', header: 'Active days', className: 'text-right' },
  { key: 'gross', header: 'Gross', className: 'text-right' },
  { key: 'revday', header: 'Rev/day', className: 'text-right' },
];
const TEMPLATE = 'minmax(160px,1.4fr) 84px 84px 130px 100px 110px 96px 110px 100px';

const pctOf = (r: number | null) => (r == null ? null : Math.round(r * 100));

export default function DriverPerformancePage() {
  const [range, setRange] = useState(defaultRange());
  const { data, isLoading, isFetching } = useDriverPerformance(range);
  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Driver Performance</h1>
          <p className="font-mono text-xs text-ink-faint">Bolt driver metrics · per driver</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">
          <span>From</span>
          <input type="date" className={controlClass} value={range.dateFrom} onChange={(e) => setRange({ ...range, dateFrom: e.target.value })} />
          <span>To</span>
          <input type="date" className={controlClass} value={range.dateTo} onChange={(e) => setRange({ ...range, dateTo: e.target.value })} />
          {isFetching && <span className="text-ink-ghost">Updating…</span>}
        </div>
      </div>

      {/* summary */}
      <Card bodyClassName="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          <Stat label="Drivers" value={int(totals?.drivers ?? 0)} />
          <Stat label="Acceptance rate" value={totals?.acceptanceRate != null ? `${Math.round(totals.acceptanceRate * 100)}%` : '—'} />
          <Stat label="Completion rate" value={totals?.completionRate != null ? `${Math.round(totals.completionRate * 100)}%` : '—'} />
          <Stat label="Gross revenue" value={totals ? zar(totals.grossRevenue) : '—'} valueClassName="text-success" />
          <Stat label="Net earnings" value={totals ? zar(totals.netEarnings) : '—'} />
          <Stat label="Finished trips" value={int(totals?.finished ?? 0)} />
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <Table<DriverPerformance & { id: string }>
          columns={COLUMNS}
          template={TEMPLATE}
          rows={(data?.drivers ?? []).map((d) => ({ ...d, id: d.driverUuid }))}
          emptyMessage="No driver activity in this window."
          renderCell={(r, key) => {
            switch (key) {
              case 'driver':
                return <span className="font-mono text-xs text-ink-strong">{r.driverName ?? '—'}</span>;
              case 'finished':
                return <span className="font-mono text-xs text-ink-body">{int(r.finished)}</span>;
              case 'offered':
                return <span className="font-mono text-xs text-ink-body">{int(r.offered)}</span>;
              case 'acceptance': {
                const pct = pctOf(r.acceptanceRate) ?? 0;
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-1.5 w-10 overflow-hidden rounded-pill bg-paper-sunken">
                      <div className="h-full rounded-pill bg-primary-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <span className="font-mono text-xs text-ink-muted">{pct}%</span>
                  </div>
                );
              }
              case 'completion':
                return <span className="font-mono text-xs text-ink-body">{pctOf(r.completionRate) ?? 0}%</span>;
              case 'cancellation': {
                const pct = pctOf(r.cancellationRate) ?? 0;
                return <span className={`font-mono text-xs ${pct > 5 ? 'text-danger' : 'text-ink-body'}`}>{pct}%</span>;
              }
              case 'activeDays':
                return <span className="font-mono text-xs text-ink-body">{int(r.activeDays)}</span>;
              case 'gross':
                return <span className="font-mono text-xs text-ink-strong">{zar(r.grossRevenue)}</span>;
              case 'revday':
                return <span className="font-mono text-xs text-ink-body">{r.revenuePerActiveDay != null ? zar(r.revenuePerActiveDay) : '—'}</span>;
              default:
                return null;
            }
          }}
        />
      )}
    </div>
  );
}
