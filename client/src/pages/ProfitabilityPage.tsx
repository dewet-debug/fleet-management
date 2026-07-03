import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Stat, StatusBadge, LoadingSpinner, Table } from '../components/ui';
import { HiOutlineInformationCircle } from 'react-icons/hi2';
import { useProfitability } from '../hooks/useAnalytics';
import type { VehicleProfitability } from '../api/analytics';
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
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'trips', header: 'Trips', className: 'text-right' },
  { key: 'active', header: 'Active days', className: 'text-right' },
  { key: 'util', header: 'Utilisation', className: 'text-right' },
  { key: 'distance', header: 'Distance', className: 'text-right' },
  { key: 'gross', header: 'Gross', className: 'text-right' },
  { key: 'net', header: 'Net', className: 'text-right' },
  { key: 'revkm', header: 'Rev/km', className: 'text-right' },
  { key: 'revday', header: 'Rev/day', className: 'text-right' },
  { key: 'profit', header: 'Net profit', className: 'text-right' },
];
const TEMPLATE = 'minmax(150px,1.4fr) 64px 90px 96px 96px 110px 110px 84px 100px 110px';

const money = (n: number | null | undefined) => (n == null ? '—' : zar(n));

export default function ProfitabilityPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState(defaultRange());
  const { data, isLoading, isFetching } = useProfitability(range);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Vehicle Profitability</h1>
          <p className="font-mono text-xs text-ink-faint">Bolt revenue × running costs × telematics · per vehicle</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">
          <span>From</span>
          <input type="date" className={controlClass} value={range.dateFrom} onChange={(e) => setRange({ ...range, dateFrom: e.target.value })} />
          <span>To</span>
          <input type="date" className={controlClass} value={range.dateTo} onChange={(e) => setRange({ ...range, dateTo: e.target.value })} />
          {isFetching && <span className="text-ink-ghost">Updating…</span>}
        </div>
      </div>

      {/* data coverage banner */}
      {data && (!data.dataCoverage.internalCosts || !data.dataCoverage.cartrackTelematics) && (
        <div className="flex items-start gap-2 rounded-control bg-primary-50 px-3 py-2.5 text-xs text-primary-700">
          <HiOutlineInformationCircle className="mt-0.5 shrink-0 text-sm" />
          <p>
            Combining <strong>live Bolt revenue</strong> with the vehicle registry.{' '}
            {!data.dataCoverage.internalCosts && 'Cost columns (lease + service) are empty — add lease costs / service records to see net profit and cost/km. '}
            {!data.dataCoverage.cartrackTelematics && 'Telematics (odometer, driver behaviour) will populate once the Cartrack tracker is connected.'}{' '}
            These light up automatically as that data is captured.
          </p>
        </div>
      )}

      {/* summary */}
      <Card bodyClassName="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          <Stat label="Vehicles earning" value={int(data?.totals.vehicles ?? 0)} />
          <Stat label="Gross revenue" value={money(data?.totals.grossRevenue)} valueClassName="text-success" />
          <Stat label="Net earnings" value={money(data?.totals.netEarnings)} />
          <Stat label="Distance" value={`${int(Math.round(data?.totals.distanceKm ?? 0))} km`} />
          <Stat label="Revenue / km" value={data?.totals.revenuePerKm != null ? zar(data.totals.revenuePerKm) : '—'} />
          <Stat label="Net profit" value={money(data?.totals.netProfit)} valueClassName="text-ink-muted" sub={data?.totals.netProfit == null ? 'awaiting costs' : undefined} />
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <Table<VehicleProfitability & { id: string }>
          columns={COLUMNS}
          template={TEMPLATE}
          rows={(data?.vehicles ?? []).map((v) => ({ ...v, id: v.vehicleId }))}
          onRowClick={(r) => navigate(`/vehicles/${r.vehicleId}`)}
          emptyMessage="No vehicle earnings in this window."
          renderCell={(r, key) => {
            switch (key) {
              case 'vehicle':
                return (
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-mono text-xs text-ink-strong">
                      {r.licensePlate}
                      <StatusBadge kind="vehicle" value={r.status} dot={false} />
                    </p>
                    <p className="truncate text-xs text-ink-faint">{r.make} {r.model}</p>
                  </div>
                );
              case 'trips':
                return <span className="font-mono text-xs text-ink-body">{int(r.finishedTrips)}</span>;
              case 'active':
                return <span className="font-mono text-xs text-ink-body">{int(r.activeDays)}</span>;
              case 'util': {
                const pct = r.utilisation != null ? Math.round(r.utilisation * 100) : 0;
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-1.5 w-10 overflow-hidden rounded-pill bg-paper-sunken">
                      <div className="h-full rounded-pill bg-primary-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <span className="font-mono text-xs text-ink-muted">{pct}%</span>
                  </div>
                );
              }
              case 'distance':
                return <span className="font-mono text-xs text-ink-body">{int(Math.round(r.distanceKm))} km</span>;
              case 'gross':
                return <span className="font-mono text-xs text-ink-strong">{zar(r.grossRevenue)}</span>;
              case 'net':
                return <span className="font-mono text-xs text-ink-body">{zar(r.netEarnings)}</span>;
              case 'revkm':
                return <span className="font-mono text-xs text-ink-body">{r.revenuePerKm != null ? zar(r.revenuePerKm) : '—'}</span>;
              case 'revday':
                return <span className="font-mono text-xs text-ink-body">{r.revenuePerActiveDay != null ? zar(r.revenuePerActiveDay) : '—'}</span>;
              case 'profit':
                return (
                  <span className={`font-mono text-xs ${r.netProfit == null ? 'text-ink-ghost' : r.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {money(r.netProfit)}
                  </span>
                );
              default:
                return null;
            }
          }}
        />
      )}
    </div>
  );
}
