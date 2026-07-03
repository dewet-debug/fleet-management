import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useDashboardMetrics,
  useDashboardAlerts,
} from '../hooks/useDashboard';
import { useBoltTripsSummary, useBoltTrips, useBoltSyncLogs, useBoltAnalytics } from '../hooks/useBolt';
import { Card, Badge, StatusBadge, Table, LoadingSpinner } from '../components/ui';
import type { BoltTrip } from '../api/bolt';
import { zar, int, lastSynced } from '../theme/format';
import { Sparkline } from '../components/charts/Sparkline';
import { Donut } from '../components/charts/Donut';
import { RevenueTrendChart } from '../components/charts/RevenueTrendChart';
import { CompletionFunnel, TopVehiclesBars, type TripDrill } from '../components/bolt/charts';
import {
  HiOutlinePlus,
  HiOutlineWrench,
  HiOutlineExclamationTriangle,
  HiOutlineArrowRight,
  HiOutlineBolt,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineCurrencyDollar,
  HiOutlineTruck,
  HiOutlineLink,
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

const PAY_PALETTE = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--neutral)'];

/** ▲▼ delta vs the prior period. Green up / red down. Guards prev=0. */
function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <span className="font-mono text-xs text-ink-ghost">—</span>;
  const d = ((cur - prev) / prev) * 100;
  const up = d >= 0;
  return (
    <span className={`font-mono text-xs font-semibold ${up ? 'text-success' : 'text-danger'}`}>
      {up ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

/** Command-centre KPI tile: icon chip + mono stat + ▲▼ delta + right sparkline. */
function KpiCard({
  icon,
  label,
  value,
  valueClassName = 'text-ink-strong',
  sub,
  delta,
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  sub?: React.ReactNode;
  delta?: React.ReactNode;
  spark?: React.ReactNode;
}) {
  return (
    <Card bodyClassName="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-control bg-primary-50 text-primary-700">
              {icon}
            </span>
            <span className="truncate font-mono text-meta uppercase tracking-wider text-ink-ghost">{label}</span>
          </div>
          <p className={`font-mono text-stat font-semibold ${valueClassName}`}>{value}</p>
          <div className="mt-1 flex items-center gap-2">
            {delta}
            {sub && <span className="text-xs text-ink-ghost">{sub}</span>}
          </div>
        </div>
        {spark && <div className="shrink-0 pt-0.5">{spark}</div>}
      </div>
    </Card>
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
  const finished = boltSummary?.finishedTrips ?? 0;
  const unmatched = boltSummary?.unmatchedToVehicle ?? 0;

  const dailyTrend = analytics?.dailyTrend ?? [];
  const previous = analytics?.previous ?? { attempts: 0, finished: 0, gross: 0, net: 0 };
  const paymentMix = analytics?.paymentMix ?? [];
  const funnel = analytics?.funnel ?? { attempts: 0, accepted: 0, finished: 0, netPaid: 0 };
  const topVehicles = analytics?.topVehicles ?? [];
  const payTotal = paymentMix.reduce((s, p) => s + p.count, 0) || 1;

  const latestSync = syncLogs?.data?.[0];

  // Alerts hook is typed as an array in api/dashboard but the runtime payload
  // may be wrapped; normalise defensively so either shape renders.
  const alertList: any[] = ((alerts as any)?.data ?? (alerts as any) ?? []) as any[];

  const fleetLegend = [
    { label: 'Active', count: activeV, color: 'var(--success)', link: '/vehicles?status=ACTIVE' },
    { label: 'In service', count: inServiceV, color: 'var(--warning)', link: '/vehicles?status=IN_SERVICE' },
    { label: 'Out', count: outV, color: 'var(--danger)', link: '/vehicles?status=OUT_OF_SERVICE' },
    { label: 'Retired', count: retiredV, color: 'var(--neutral)', link: '/vehicles?status=RETIRED' },
  ];

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Command centre</h1>
          <p className="font-mono text-xs text-ink-faint">Fleet operations overview · last 30 days</p>
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

      {/* 1 — KPI strip */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(212px, 1fr))' }}>
        <KpiCard
          icon={<HiOutlineBanknotes className="text-base" />}
          label="Net revenue 30d"
          value={boltLoading ? '—' : zar(net)}
          valueClassName="text-success"
          delta={<Delta cur={net} prev={previous.net} />}
          spark={<Sparkline data={dailyTrend.map((d) => d.net)} color="var(--success)" />}
        />
        <KpiCard
          icon={<HiOutlineCheckCircle className="text-base" />}
          label="Finished trips 30d"
          value={boltLoading ? '—' : int(finished)}
          delta={<Delta cur={finished} prev={previous.finished} />}
          spark={<Sparkline data={dailyTrend.map((d) => d.finished)} color="var(--peri)" />}
        />
        <KpiCard
          icon={<HiOutlineCurrencyDollar className="text-base" />}
          label="Gross fare 30d"
          value={boltLoading ? '—' : zar(gross)}
          delta={<Delta cur={gross} prev={previous.gross} />}
          spark={<Sparkline data={dailyTrend.map((d) => d.gross)} color="var(--peri)" />}
        />
        <KpiCard
          icon={<HiOutlineTruck className="text-base" />}
          label="Active vehicles"
          value={metricsLoading ? '—' : int(activeV)}
          sub={metricsLoading ? undefined : `of ${int(totalVehicles)} total`}
        />
        <KpiCard
          icon={<HiOutlineExclamationTriangle className="text-base" />}
          label="Unmatched trips"
          value={boltLoading ? '—' : int(unmatched)}
          valueClassName={unmatched > 0 ? 'text-danger' : 'text-ink-strong'}
        />
      </div>

      {/* 2 — Hero row: revenue trend + fleet status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Revenue trend" subtitle="last 30 days">
          {boltLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Gross fare</span>
                  <span className="font-mono text-lg font-semibold text-ink-strong">{zar(gross)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Net earnings</span>
                  <span className="font-mono text-lg font-semibold text-success">{zar(net)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Commission</span>
                  <span className="font-mono text-lg font-semibold text-ink-muted">{zar(commission)}</span>
                </div>
              </div>
              <RevenueTrendChart
                values={dailyTrend.map((d) => d.gross)}
                secondary={dailyTrend.map((d) => d.net)}
                labels={dailyTrend.map((d) => d.day.slice(5))}
                tickEvery={5}
              />
              <div className="flex items-center justify-between border-t border-paper-hair pt-2.5">
                <div className="flex gap-4 font-mono text-meta uppercase tracking-wider text-ink-ghost">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ background: 'var(--peri)' }} /> Gross
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--success)' }} /> Net
                  </span>
                </div>
                <Link
                  to="/bolt-trips"
                  className="inline-flex items-center gap-1 font-mono text-xs text-primary-700 hover:underline"
                >
                  View trips &amp; analytics <HiOutlineArrowRight />
                </Link>
              </div>
            </div>
          )}
        </Card>

        <Card title="Fleet status">
          {metricsLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-5">
              <div className="flex justify-center">
                <Donut
                  size={148}
                  centerTop={int(totalVehicles)}
                  centerSub="vehicles"
                  segments={[
                    { value: activeV, color: 'var(--success)' },
                    { value: inServiceV, color: 'var(--warning)' },
                    { value: outV, color: 'var(--danger)' },
                    { value: retiredV, color: 'var(--neutral)' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                {fleetLegend.map((s) => (
                  <Link key={s.label} to={s.link} className="flex items-center gap-2 text-sm hover:underline">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="flex-1 truncate text-ink-body">{s.label}</span>
                    <span className="font-mono text-xs text-ink-strong">{int(s.count)}</span>
                    <span className="w-9 text-right font-mono text-xs text-ink-faint">
                      {Math.round(pct(s.count, totalVehicles))}%
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 3 — Payment mix + funnel + top vehicles */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Payment mix" subtitle="last 30 days">
          <div className="flex items-center gap-5">
            <div className="shrink-0">
              <Donut
                size={132}
                centerTop={int(finished)}
                centerSub="trips"
                segments={paymentMix.map((p, i) => ({ value: p.count, color: PAY_PALETTE[i % 5] }))}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {paymentMix.map((p, i) => (
                <div
                  key={p.method}
                  onClick={() => drillToTrips({ paymentMethod: p.method, status: 'finished' })}
                  className="flex cursor-pointer items-center gap-2 rounded-control px-1 py-0.5 text-sm hover:bg-paper-sunken"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PAY_PALETTE[i % 5] }} />
                  <span className="flex-1 truncate capitalize text-ink-body">{p.method.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-xs text-ink-muted">{int(p.count)}</span>
                  <span className="w-9 text-right font-mono text-xs text-ink-faint">
                    {Math.round(pct(p.count, payTotal))}%
                  </span>
                </div>
              ))}
              {paymentMix.length === 0 && <p className="text-sm text-ink-faint">No finished trips in window.</p>}
            </div>
          </div>
        </Card>

        <Card title="Completion funnel" subtitle="last 30 days">
          <CompletionFunnel funnel={funnel} onSelect={drillToTrips} />
        </Card>

        <Card title="Top earning vehicles" subtitle="last 30 days">
          <TopVehiclesBars topVehicles={topVehicles} onSelect={drillToTrips} />
        </Card>
      </div>

      {/* 4 — Recent Bolt trips + Needs attention / Integrations */}
      <div className="grid gap-4 lg:grid-cols-3">
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
                <p className="mb-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">Integrations</p>
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
                <div className="flex items-center gap-2.5 rounded-control px-1 py-1.5">
                  <span className="flex h-2 w-2 flex-shrink-0">
                    <span className="inline-flex h-2 w-2 rounded-pill bg-warning" />
                  </span>
                  <HiOutlineLink className="flex-shrink-0 text-ink-muted" />
                  <span className="flex-1 text-sm text-ink-body">Cartrack</span>
                  <Badge tone="warning">awaiting creds</Badge>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
