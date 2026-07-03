import { useState } from 'react';
import { Badge, StatusBadge, Button, Card, Table, Pagination, LoadingSpinner } from '../components/ui';
import IntegrationConsole from '../components/integration/IntegrationConsole';
import { HiCloudArrowDown, HiDocumentText, HiOutlineInformationCircle } from 'react-icons/hi2';
import { useBoltStatus, useBoltSync, useBoltSyncLogs } from '../hooks/useBolt';
import type { BoltSyncLog, BoltStatus, BoltTimeBasis } from '../api/bolt';
import { int, lastSynced } from '../theme/format';

/** YYYY-MM-DD from local date parts (never UTC). */
const toLocalYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-ZA') : '—');

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const firstOfMonth = (offset: number) => { const d = new Date(); d.setMonth(d.getMonth() + offset, 1); return d; };
const lastOfMonth = (offset: number) => { const d = new Date(); d.setMonth(d.getMonth() + offset + 1, 0); return d; };

const TABS = [
  { key: 'download', label: 'Download', icon: HiCloudArrowDown },
  { key: 'logs', label: 'Sync logs', icon: HiDocumentText },
];

export default function BoltIntegrationPage() {
  const [tab, setTab] = useState<'download' | 'logs'>('download');
  const { data: status } = useBoltStatus();

  const connected = !!status?.connected;
  const running = !!status?.running;

  const statusSlot = connected ? (
    <>
      <Badge tone="success" dot>Connected</Badge>
      <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
        last synced {status?.lastSync ? lastSynced(status.lastSync.startedAt) : 'never'}
      </span>
    </>
  ) : (
    <Badge tone="warning">Credentials not set</Badge>
  );

  const stats = [
    { label: 'Total trips', value: int(status?.totalTrips ?? 0) },
    { label: 'Data span', value: status?.earliestTripAt ? `${shortDate(status.earliestTripAt)} → ${shortDate(status.latestTripAt)}` : '—' },
    { label: 'Last sync', value: status?.lastSync ? <StatusBadge kind="sync" value={status.lastSync.status} /> : '—' },
    { label: 'Status', value: running ? 'Running…' : 'Idle' },
  ];

  return (
    <IntegrationConsole
      title="Bolt"
      subtitle="Fleet Integration API · commercial trip data"
      statusSlot={statusSlot}
      stats={stats}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as typeof tab)}
    >
      {tab === 'download' && <DownloadTab status={status} connected={connected} running={running} />}
      {tab === 'logs' && <SyncLogsTab />}
    </IntegrationConsole>
  );
}

// ---- Download Tab ----

const ctrl =
  'rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body font-mono focus:border-primary-400 focus:outline-none';

const PRESETS: { key: string; label: string; range: () => [Date, Date] }[] = [
  { key: '7d', label: 'Last 7 days', range: () => [daysAgo(7), new Date()] },
  { key: '30d', label: 'Last 30 days', range: () => [daysAgo(30), new Date()] },
  { key: '90d', label: 'Last 90 days', range: () => [daysAgo(90), new Date()] },
  { key: 'thisMonth', label: 'This month', range: () => [firstOfMonth(0), new Date()] },
  { key: 'lastMonth', label: 'Last month', range: () => [firstOfMonth(-1), lastOfMonth(-1)] },
];

function DownloadTab({ status, connected, running }: { status?: BoltStatus; connected: boolean; running: boolean }) {
  const [dateFrom, setDateFrom] = useState(toLocalYmd(daysAgo(7)));
  const [dateTo, setDateTo] = useState(toLocalYmd(new Date()));
  const [timeBasis, setTimeBasis] = useState<BoltTimeBasis>('created');
  const [preset, setPreset] = useState<string>('7d');
  const sync = useBoltSync();

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const [f, t] = p.range();
    setDateFrom(toLocalYmd(f));
    setDateTo(toLocalYmd(t));
    setPreset(p.key);
  };

  const invalidRange = dateFrom > dateTo;
  const rangeDays = Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1;
  const disabled = !connected || running || sync.isPending || invalidRange;

  if (!connected) {
    return (
      <Card title="Download trips">
        <div className="rounded-control bg-warning-bg px-3 py-2.5 text-sm text-warning">
          Bolt API credentials aren't configured. Add <span className="font-mono">BOLT_CLIENT_ID</span> /
          <span className="font-mono"> BOLT_CLIENT_SECRET</span> to <span className="font-mono">server/.env</span>, then reload.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Download trips" subtitle="pull orders from Bolt into the app">
        <div className="space-y-4">
          {/* period presets */}
          <div>
            <p className="mb-1.5 font-mono text-meta uppercase tracking-wider text-ink-ghost">Period</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p)}
                  className={`rounded-control border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    preset === p.key
                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                      : 'border-paper-line text-ink-muted hover:bg-paper-sunken'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* custom range + time basis + company */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">From</span>
              <input type="date" className={ctrl} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPreset('custom'); }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">To</span>
              <input type="date" className={ctrl} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPreset('custom'); }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Filter by</span>
              <select className={ctrl} value={timeBasis} onChange={(e) => setTimeBasis(e.target.value as BoltTimeBasis)}>
                <option value="created">Order created date</option>
                <option value="price_review">Fare finalised date</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Company</span>
              <span className={`${ctrl} inline-flex items-center text-ink-muted`}>
                {status?.companyIds?.length ? status.companyIds.join(', ') : 'auto (all)'}
              </span>
            </label>
            <Button
              onClick={() => sync.mutate({ dateFrom, dateTo, timeRangeFilterType: timeBasis })}
              isLoading={sync.isPending}
              disabled={disabled}
            >
              <HiCloudArrowDown /> Download {!invalidRange && rangeDays > 0 ? `(${rangeDays}d)` : ''}
            </Button>
          </div>

          {invalidRange && <p className="font-mono text-xs text-danger">"From" must be on or before "To".</p>}
          {!invalidRange && rangeDays > 45 && (
            <p className="font-mono text-xs text-warning">Large range ({rangeDays} days) — this runs in the background and may take several minutes.</p>
          )}
          {running && <p className="font-mono text-xs text-ink-muted">A sync is currently running — watch the Sync logs tab.</p>}
        </div>
      </Card>

      {/* what gets pulled + how to filter afterwards */}
      <Card>
        <div className="flex items-start gap-2.5 text-sm text-ink-body">
          <HiOutlineInformationCircle className="mt-0.5 shrink-0 text-lg text-info" />
          <div className="space-y-1.5">
            <p>
              A download pulls <strong>every order</strong> in the selected period — all statuses (finished, cancelled,
              rejected, no-response, no-show) and payment types — day by day (SAST), and matches each to a vehicle by
              plate. It's idempotent: re-downloading a period updates existing trips.
            </p>
            <p className="text-ink-muted">
              <strong>Filter by</strong> chooses which timestamp the date range applies to — the order's created time
              (default) or when the fare was finalised (price review).
            </p>
            <p className="text-ink-muted">
              Once downloaded, slice the data on the <strong>Bolt Trips</strong> page (status, payment method, matched /
              unmatched to registry, date range, and free-text search on plate / driver / order ref / address), and in
              <strong> Driver Performance</strong> and <strong>Profitability</strong>.
            </p>
            <p className="font-mono text-xs text-ink-faint">
              Note: Bolt limits how far back the API allows — if a start date is too old the sync log shows INVALID_START_DATE.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---- Sync Logs Tab ----

const LOG_COLS = [
  { key: 'status', header: 'Status' },
  { key: 'window', header: 'Window' },
  { key: 'started', header: 'Started' },
  { key: 'duration', header: 'Duration', className: 'text-right' },
  { key: 'records', header: 'Records', className: 'text-right' },
  { key: 'errors', header: 'Errors', className: 'text-right' },
];
const LOG_TEMPLATE = '120px minmax(180px,1fr) minmax(160px,1fr) 90px 200px 80px';

function SyncLogsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBoltSyncLogs({ page, limit: 20 });

  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <Table<BoltSyncLog>
        columns={LOG_COLS}
        template={LOG_TEMPLATE}
        rows={data?.data ?? []}
        emptyMessage="No sync logs yet. Download some trips to get started."
        renderCell={(log, key) => {
          switch (key) {
            case 'status':
              return <StatusBadge kind="sync" value={log.status} />;
            case 'window':
              return (
                <span className="font-mono text-xs text-ink-muted">
                  {shortDate(log.windowStart)} → {shortDate(log.windowEnd)}
                </span>
              );
            case 'started':
              return <span className="font-mono text-xs text-ink-muted">{new Date(log.startedAt).toLocaleString('en-ZA')}</span>;
            case 'duration':
              return <span className="font-mono text-xs text-ink-body">{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}</span>;
            case 'records':
              return (
                <span className="font-mono text-xs text-ink-body">
                  {log.recordsFetched}F / {log.recordsCreated}C / {log.recordsUpdated}U / {log.recordsMatched}M
                </span>
              );
            case 'errors':
              return <span className={`font-mono text-xs ${log.recordsErrored > 0 ? 'text-danger' : 'text-ink-body'}`}>{log.recordsErrored}</span>;
            default:
              return null;
          }
        }}
      />
      {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}
    </div>
  );
}
