import { Link } from 'react-router-dom';
import {
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardAlerts,
} from '../hooks/useDashboard';
import { useBoltTripsSummary, useBoltTrips, useBoltSyncLogs } from '../hooks/useBolt';
import { Card, Stat, Badge, StatusBadge, Table, LoadingSpinner } from '../components/ui';
import type { BoltTrip } from '../api/bolt';
import { zar, int, lastSynced } from '../theme/format';
import {
  HiOutlineTruck,
  HiOutlinePlus,
  HiOutlineWrench,
  HiOutlineExclamationTriangle,
  HiOutlineArrowRight,
  HiOutlineBolt,
} from 'react-icons/hi2';

/** Last-30-days window, computed client-side for the Bolt figures. */
function last30Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: iso(from), dateTo: iso(to) };
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (n / total) * 100));
}

const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-control bg-primary-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700';

const RECENT_COLUMNS = [
  { key: 'created', header: 'Created' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'driver', header: 'Driver' },
  { key: 'status', header: 'Status' },
  { key: 'gross', header: 'Gross', className: 'text-right' },
];
const RECENT_TEMPLATE = '120px 130px 1fr 120px 90px';

/** One row of the Fleet-status breakdown. */
function FleetRow({
  label,
  count,
  total,
  bar,
  link,
}: {
  label: string;
  count: number;
  total: number;
  bar: string;
  link: string;
}) {
  return (
    <Link to={link} className="block rounded-control px-1.5 py-2 hover:bg-paper-sunken">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-ink-body">{label}</span>
        <span className="font-mono text-sm font-semibold text-ink-strong">{int(count)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-paper-sunken">
        <div className={`h-full ${bar}`} style={{ width: `${pct(count, total)}%` }} />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const window = last30Days();

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: alerts, isLoading: alertsLoading } = useDashboardAlerts();
  const { data: boltSummary, isLoading: boltLoading } = useBoltTripsSummary(window);
  const { data: recentTrips, isLoading: tripsLoading } = useBoltTrips({
    ...window,
    page: 1,
    limit: 6,
  });
  const { data: syncLogs } = useBoltSyncLogs({ limit: 1 });

  const m = metrics as any;
  const totalVehicles = m?.totalVehicles ?? 0;
  const activeV = m?.activeVehicles ?? 0;
  const inServiceV = m?.inServiceVehicles ?? 0;
  const outV = m?.outOfServiceVehicles ?? 0;
  const retiredV = m?.retiredVehicles ?? 0;

  const gross = boltSummary?.revenue.grossFare ?? 0;
  const net = boltSummary?.revenue.netEarnings ?? 0;
  const commission = boltSummary?.revenue.commission ?? 0;
  const attempts = boltSummary?.totalOrders ?? 0;
  const finished = boltSummary?.finishedTrips ?? 0;
  const finishedPct = pct(finished, attempts);

  const latestSync = syncLogs?.data?.[0];

  // Alerts hook is typed as an array in api/dashboard but the runtime payload
  // may be wrapped; normalise defensively so either shape renders.
  const alertList: any[] = ((alerts as any)?.data ?? (alerts as any) ?? []) as any[];

  return (
    <div className="space-y-4">
      {/* 1 — page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Dashboard</h1>
          <p className="font-mono text-xs text-ink-faint">Fleet operations overview</p>
        </div>
        <div className="flex gap-2">
          <Link to="/vehicles" className={primaryBtn}>
            <HiOutlinePlus className="text-base" /> Add Vehicle
          </Link>
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 rounded-control border border-paper-line bg-paper-card px-3.5 py-2 text-sm font-semibold text-ink-body hover:bg-paper-sunken"
          >
            <HiOutlineWrench className="text-base" /> New Service
          </Link>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <Card bodyClassName="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair lg:grid-cols-4 lg:divide-y-0">
          <Stat
            label="Active vehicles"
            value={metricsLoading ? '—' : int(activeV)}
            sub={metricsLoading ? undefined : `of ${int(totalVehicles)} total`}
            valueClassName="text-success"
          />
          <Stat
            label="Services due"
            value={metricsLoading ? '—' : int(m?.pendingServices ?? 0)}
            valueClassName="text-warning"
          />
          <Stat
            label="Active drivers"
            value={metricsLoading ? '—' : int(m?.activeDrivers ?? 0)}
          />
          <Stat
            label="Unmatched Bolt trips"
            value={boltLoading ? '—' : int(boltSummary?.unmatchedToVehicle ?? 0)}
            valueClassName={
              (boltSummary?.unmatchedToVehicle ?? 0) > 0 ? 'text-danger' : 'text-ink-strong'
            }
          />
        </div>
      </Card>

      {/* 3 — Bolt performance + Fleet status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bolt performance */}
        <Card className="lg:col-span-2" title="Bolt performance" subtitle="last 30 days">
          {boltLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
                    Gross fare
                  </span>
                  <span className="font-mono text-stat font-semibold text-success">{zar(gross)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
                    Net earnings
                  </span>
                  <span className="font-mono text-stat font-semibold text-ink-strong">{zar(net)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
                    Commission
                  </span>
                  <span className="font-mono text-stat font-semibold text-ink-muted">
                    {zar(commission)}
                  </span>
                </div>
              </div>

              {/* attempts vs finished stacked bar */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
                    Order attempts
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    {int(finished)} / {int(attempts)} finished
                  </span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-pill bg-paper-sunken">
                  <div className="h-full bg-success" style={{ width: `${finishedPct}%` }} />
                  <div className="h-full bg-neutral" style={{ width: `${100 - finishedPct}%` }} />
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
                    <span className="h-2 w-2 rounded-pill bg-success" /> Finished
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
                    <span className="h-2 w-2 rounded-pill bg-neutral" /> Not completed
                  </span>
                  <Link
                    to="/bolt-trips"
                    className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-primary-700 hover:underline"
                  >
                    View trips <HiOutlineArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Fleet status */}
        <Card title="Fleet status">
          {metricsLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-1">
              <FleetRow label="Active" count={activeV} total={totalVehicles} bar="bg-success" link="/vehicles?status=ACTIVE" />
              <FleetRow label="In service" count={inServiceV} total={totalVehicles} bar="bg-warning" link="/vehicles?status=IN_SERVICE" />
              <FleetRow label="Out of service" count={outV} total={totalVehicles} bar="bg-danger" link="/vehicles?status=OUT_OF_SERVICE" />
              <FleetRow label="Retired" count={retiredV} total={totalVehicles} bar="bg-neutral" link="/vehicles?status=RETIRED" />
            </div>
          )}
        </Card>
      </div>

      {/* 4 — Recent Bolt trips + Needs attention */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Bolt trips */}
        <Card
          className="lg:col-span-2"
          title="Recent Bolt trips"
          subtitle="last 30 days"
          bodyClassName="p-0"
          actions={
            <Link
              to="/bolt-trips"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary-700 hover:underline"
            >
              All trips <HiOutlineArrowRight />
            </Link>
          }
        >
          {tripsLoading ? (
            <div className="p-5">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <Table<BoltTrip>
              columns={RECENT_COLUMNS}
              template={RECENT_TEMPLATE}
              rows={recentTrips?.data ?? []}
              emptyMessage="No recent Bolt trips."
              renderCell={(t, key) => {
                switch (key) {
                  case 'created':
                    return (
                      <span className="font-mono text-xs text-ink-muted">
                        {new Date(t.orderCreatedAt).toLocaleString('en-ZA', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    );
                  case 'vehicle':
                    return (
                      <span className="font-mono text-xs text-ink-strong">
                        {t.vehicleLicensePlate || '—'}
                        {t.vehicleLicensePlate && !t.vehicleId && (
                          <span className="ml-1 font-sans text-[9px] uppercase tracking-wide text-warning">
                            unmatched
                          </span>
                        )}
                      </span>
                    );
                  case 'driver':
                    return <span className="truncate text-sm text-ink-body">{t.driverName || '—'}</span>;
                  case 'status':
                    return <StatusBadge kind="bolt" value={t.orderStatus} />;
                  case 'gross':
                    return (
                      <span className="font-mono text-xs text-ink-strong">
                        {t.ridePrice != null ? zar(t.ridePrice) : '—'}
                      </span>
                    );
                  default:
                    return null;
                }
              }}
            />
          )}
        </Card>

        {/* Needs attention + Integrations */}
        <Card title="Needs attention">
          {alertsLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-2.5">
              {alertList.length === 0 && (
                <p className="text-sm text-ink-faint">Nothing needs attention.</p>
              )}
              {alertList.map((a: any) => (
                <Link
                  key={a.vehicle?.id ?? a.id}
                  to={a.vehicle?.id ? `/vehicles/${a.vehicle.id}` : '/services'}
                  className="flex items-start gap-3 rounded-control border border-paper-hair bg-paper-sunken px-3 py-2.5 hover:border-paper-line"
                >
                  <HiOutlineExclamationTriangle className="mt-0.5 flex-shrink-0 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-strong">
                      {a.vehicle?.make} {a.vehicle?.model}
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      {a.vehicle?.licensePlate || '—'}
                      {a.vehicle?.year ? ` · ${a.vehicle.year}` : ''}
                    </p>
                  </div>
                  <Badge tone="warning">Service due</Badge>
                </Link>
              ))}

              {/* Integrations freshness */}
              <div className="border-t border-paper-hair pt-3">
                <p className="mb-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">
                  Integrations
                </p>
                <Link
                  to="/bolt-trips"
                  className="flex items-center gap-2.5 rounded-control px-1 py-1.5 hover:bg-paper-sunken"
                >
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-pill bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-pill bg-success" />
                  </span>
                  <HiOutlineBolt className="flex-shrink-0 text-ink-muted" />
                  <span className="flex-1 text-sm text-ink-body">Bolt Fleet</span>
                  <span className="font-mono text-xs text-ink-faint">
                    {latestSync ? lastSynced(latestSync.startedAt) : 'no syncs'}
                  </span>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
