import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Stat, StatusBadge, Input, LoadingSpinner, Pagination, Table } from '../components/ui';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import { useBoltTrips, useBoltTripsSummary } from '../hooks/useBolt';
import type { BoltTrip, BoltTripFilters } from '../api/bolt';
import { zar, km, int } from '../theme/format';
import BoltAnalytics from '../components/bolt/BoltAnalytics';
import type { TripDrill } from '../components/bolt/charts';

const PAYMENT_OPTIONS = ['cash', 'in_app', 'card', 'business'];

const STATUS_OPTIONS = [
  'finished',
  'client_cancelled',
  'driver_rejected',
  'driver_did_not_respond',
  'driver_cancelled_after_accept',
  'client_did_not_show',
];

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const controlClass =
  'rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body focus:border-primary-400 focus:outline-none';

const COLUMNS = [
  { key: 'created', header: 'Created' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'driver', header: 'Driver' },
  { key: 'route', header: 'Route' },
  { key: 'status', header: 'Status' },
  { key: 'payment', header: 'Payment' },
  { key: 'distance', header: 'Distance', className: 'text-right' },
  { key: 'gross', header: 'Gross', className: 'text-right' },
  { key: 'net', header: 'Net', className: 'text-right' },
];
const TEMPLATE = '132px 150px 150px minmax(180px,1fr) 128px 84px 84px 96px 96px';

export default function BoltTripsPage() {
  // Initialise filters from the URL so charts elsewhere can deep-link a drill-down.
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'trips' | 'analytics'>(
    searchParams.get('view') === 'analytics' ? 'analytics' : 'trips',
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('paymentMethod') ?? '');
  const [matched, setMatched] = useState(searchParams.get('matched') ?? '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '');

  const commonFilters = {
    search: search || undefined,
    status: status || undefined,
    paymentMethod: paymentMethod || undefined,
    matched: (matched || undefined) as BoltTripFilters['matched'],
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: summary } = useBoltTripsSummary(commonFilters);
  const { data, isLoading, isFetching } = useBoltTrips({ ...commonFilters, page, limit: 25 });
  const first = () => setPage(1);

  // Apply a chart drill-down: set the matching filters and jump to the trips list.
  const applyDrill = (d: TripDrill) => {
    if (d.dateFrom !== undefined) setDateFrom(d.dateFrom);
    if (d.dateTo !== undefined) setDateTo(d.dateTo);
    if (d.status !== undefined) setStatus(d.status);
    if (d.paymentMethod !== undefined) setPaymentMethod(d.paymentMethod);
    if (d.search !== undefined) setSearch(d.search);
    setPage(1);
    setView('trips');
  };

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Bolt Trips</h1>
          <p className="font-mono text-xs text-ink-faint">Commercial trip &amp; revenue data · Bolt Fleet Integration API</p>
        </div>
        {isFetching && <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Updating…</span>}
      </div>

      {/* KPI strip — reflects active filters */}
      <Card bodyClassName="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          <Stat label="Order attempts" value={int(summary?.totalOrders ?? 0)} />
          <Stat label="Finished" value={int(summary?.finishedTrips ?? 0)} />
          <Stat label="Gross fare" value={zar(summary?.revenue.grossFare ?? 0)} valueClassName="text-success" />
          <Stat label="Net earnings" value={zar(summary?.revenue.netEarnings ?? 0)} />
          <Stat label="Commission" value={zar(summary?.revenue.commission ?? 0)} valueClassName="text-ink-muted" />
          <Stat
            label="Distance"
            value={`${int(Math.round(summary?.totalDistanceKm ?? 0))} km`}
            sub={
              summary
                ? `${int(summary.matchedToVehicle)} / ${int(summary.matchedToVehicle + summary.unmatchedToVehicle)} matched`
                : undefined
            }
          />
        </div>
      </Card>

      {/* view toggle */}
      <div className="inline-flex rounded-control border border-paper-line bg-paper-card p-0.5">
        {(['trips', 'analytics'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-[6px] px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              view === v ? 'bg-primary-50 text-primary-700' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <Input
            placeholder="Plate, driver, order ref, address…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); first(); }}
            className="w-72 pl-9"
          />
        </div>
        <select className={controlClass} value={status} onChange={(e) => { setStatus(e.target.value); first(); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select className={controlClass} value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); first(); }}>
          <option value="">All payments</option>
          {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{statusLabel(p)}</option>)}
        </select>
        <select className={controlClass} value={matched} onChange={(e) => { setMatched(e.target.value); first(); }}>
          <option value="">All vehicles</option>
          <option value="matched">Matched to registry</option>
          <option value="unmatched">Unmatched</option>
        </select>
        <div className="flex items-center gap-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">
          <span>From</span>
          <input type="date" className={controlClass} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); first(); }} />
          <span>To</span>
          <input type="date" className={controlClass} value={dateTo} onChange={(e) => { setDateTo(e.target.value); first(); }} />
        </div>
      </div>

      {/* trips table / analytics */}
      {view === 'analytics' ? (
        <BoltAnalytics dateFrom={dateFrom || undefined} dateTo={dateTo || undefined} onSelect={applyDrill} />
      ) : isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <>
          <Table<BoltTrip>
            columns={COLUMNS}
            template={TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No trips match these filters."
            renderCell={(t, key) => {
              switch (key) {
                case 'created':
                  return <span className="font-mono text-xs text-ink-muted">{new Date(t.orderCreatedAt).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>;
                case 'vehicle':
                  return (
                    <div>
                      <p className="font-mono text-xs text-ink-strong">
                        {t.vehicleLicensePlate || '—'}
                        {t.vehicleLicensePlate && !t.vehicleId && (
                          <span className="ml-1 font-sans text-[9px] uppercase tracking-wide text-warning">unmatched</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-faint">{t.vehicleModel || ''}</p>
                    </div>
                  );
                case 'driver':
                  return (
                    <div>
                      <p className="truncate text-sm text-ink-body">{t.driverName || '—'}</p>
                      <p className="truncate text-xs text-ink-faint">{t.categoryName || ''}</p>
                    </div>
                  );
                case 'route':
                  return (
                    <div className="min-w-0">
                      <p className="truncate text-xs text-ink-body">{t.pickupAddress || '—'}</p>
                      <p className="truncate text-xs text-ink-faint">→ {t.destinationAddress || '—'}</p>
                    </div>
                  );
                case 'status':
                  return <StatusBadge kind="bolt" value={t.orderStatus} />;
                case 'payment':
                  return <span className="text-xs capitalize text-ink-muted">{t.paymentMethod?.replace(/_/g, ' ') || '—'}</span>;
                case 'distance':
                  return <span className="font-mono text-xs text-ink-body">{t.rideDistanceMeters != null ? km(t.rideDistanceMeters) : '—'}</span>;
                case 'gross':
                  return <span className="font-mono text-xs text-ink-strong">{t.ridePrice != null ? zar(t.ridePrice) : '—'}</span>;
                case 'net':
                  return <span className="font-mono text-xs text-ink-body">{t.netEarnings != null ? zar(t.netEarnings) : '—'}</span>;
                default:
                  return null;
              }
            }}
          />

          {data?.meta && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-ink-faint">
                Showing {data.data.length ? (data.meta.page - 1) * data.meta.limit + 1 : 0}
                –{(data.meta.page - 1) * data.meta.limit + data.data.length} of {int(data.meta.total)}
              </p>
              {data.meta.totalPages > 1 && (
                <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
