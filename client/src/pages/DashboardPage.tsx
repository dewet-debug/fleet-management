import { Link, useNavigate } from 'react-router-dom';
import {
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardAlerts,
} from '../hooks/useDashboard';
import { useBoltTripsSummary, useBoltTrips, useBoltSyncLogs, useBoltAnalytics } from '../hooks/useBolt';
import { Card, Stat, Badge, StatusBadge, Table, LoadingSpinner } from '../components/ui';
import type { BoltTrip } from '../api/bolt';
import { zar, int, lastSynced } from '../theme/format';
import { RevenueTrendChart, PaymentMixDonut, CompletionFunnel, TopVehiclesBars, type TripDrill } from '../components/bolt/charts';
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
  // Use LOCAL date parts (not toISOString/UTC) so "today" is the local SAST day,
  // not shifted back one day between local midnight and 02:00.
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/** Fleet composition donut with a clickable legend. */
function FleetDonut({
  segments,
  total,
}: {
  segments: { label: string; count: number; color: string; link: string }[];
  total: number;
}) {
  let acc = 0;
  const stops = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const start = (acc / (total || 1)) * 360;
      acc += s.count;
      const end = (acc / (total || 1)) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(', ');
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: 116, height: 116 }}>
        <div className="h-full w-full rounded-pill" style={{ background: stops ? `conic-gradient(${stops})` : '#eceef2' }} />
        <div className="absolute inset-[22px] grid place-items-center rounded-pill bg-paper-card text-center">
          <div>
            <p className="font-mono text-lg font-semibold text-ink-strong">{int(total)}</p>
            <p className="font-mono text-meta uppercase tracking-wider text-ink-ghost">vehicles</p>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s) => (
          <Link key={s.label} to={s.link} className="flex items-center gap-2 text-sm hover:underline">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-ink-body">{s.label}</span>
            <span className="font-mono text-xs text-ink-strong">{int(s.count)}</span>
            <span className="w-9 text-right font-mono text-xs text-ink-faint">{Math.round(pct(s.count, total))}%</span>
          </Link>
        ))}
      </div>
    </div>
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
  const { data: analytics } = useBoltAnalytics(window);
  const navigate = useNavigate();

  // Chart click -> open the Bolt-trips list filtered to the selection.
  const drillToTrips = (d: TripDrill) => {
    const p = new URLSearchParams();
    if (d.dateFrom) p.set('dateFrom', d.dateFrom);
    if (d.dateTo) p.set('dateTo', d.dateTo);
    if (d.status) p.set('status', d.status);
    if (d.paymentMethod) p.set('paymentMethod', d.paymentMethod);
    if (d.search) p.set('search', d.search);
    p.set('view', 'trips');
    navigate(`/bolt-trips?${p.toString()}`);
  };

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

              {/* revenue trend chart */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
                    Daily gross fare
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    {int(finished)} / {int(attempts)} orders finished ({finishedPct}%)
                  </span>
                </div>
                <RevenueTrendChart trend={analytics?.dailyTrend ?? []} height={132} showDayLabels={false} onSelect={drillToTrips} />
                <div className="mt-3 border-t border-paper-hair pt-2.5 text-right">
                  <Link
                    to="/bolt-trips"
                    className="inline-flex items-center gap-1 font-mono text-xs text-primary-700 hover:underline"
                  >
                    View trips &amp; analytics <HiOutlineArrowRight />
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
            <FleetDonut
              total={totalVehicles}
              segments={[
                { label: 'Active', count: activeV, color: '#17935b', link: '/vehicles?status=ACTIVE' },
                { label: 'In service', count: inServiceV, color: '#bd7f14', link: '/vehicles?status=IN_SERVICE' },
                { label: 'Out of service', count: outV, color: '#b0392f', link: '/vehicles?status=OUT_OF_SERVICE' },
                { label: 'Retired', count: retiredV, color: '#6b7688', link: '/vehicles?status=RETIRED' },
              ]}
            />
          )}
        </Card>
      </div>

      {/* 4 — Payment mix + funnel + top vehicles */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Payment mix" subtitle="last 30 days">
          <PaymentMixDonut paymentMix={analytics?.paymentMix ?? []} onSelect={drillToTrips} />
        </Card>
        <Card title="Completion funnel" subtitle="last 30 days">
          <CompletionFunnel funnel={analytics?.funnel ?? { attempts: 0, accepted: 0, finished: 0, netPaid: 0 }} onSelect={drillToTrips} />
        </Card>
        <Card title="Top earning vehicles" subtitle="last 30 days">
          <TopVehiclesBars topVehicles={analytics?.topVehicles ?? []} onSelect={drillToTrips} />
        </Card>
      </div>

      {/* 5 — Recent Bolt trips + Needs attention */}
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
