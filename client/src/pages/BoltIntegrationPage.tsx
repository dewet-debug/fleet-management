import { useState } from 'react';
import { Badge, StatusBadge, Button, Card, Table, Pagination, LoadingSpinner } from '../components/ui';
import IntegrationConsole from '../components/integration/IntegrationConsole';
import { HiCloudArrowDown, HiDocumentText } from 'react-icons/hi2';
import { useBoltStatus, useBoltSync, useBoltSyncLogs } from '../hooks/useBolt';
import type { BoltSyncLog } from '../api/bolt';
import { int, lastSynced } from '../theme/format';

/** YYYY-MM-DD from local date parts (never UTC). */
const toLocalYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-ZA') : '—');

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
    {
      label: 'Latest trip',
      value: status?.latestTripAt ? new Date(status.latestTripAt).toLocaleDateString('en-ZA') : '—',
    },
    {
      label: 'Last sync',
      value: status?.lastSync ? <StatusBadge kind="sync" value={status.lastSync.status} /> : '—',
    },
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
      {tab === 'download' && <DownloadTab connected={connected} running={running} />}
      {tab === 'logs' && <SyncLogsTab />}
    </IntegrationConsole>
  );
}

// ---- Download Tab ----

const dateInputClass =
  'rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body font-mono focus:border-primary-400 focus:outline-none';

function DownloadTab({ connected, running }: { connected: boolean; running: boolean }) {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const [dateFrom, setDateFrom] = useState(toLocalYmd(weekAgo));
  const [dateTo, setDateTo] = useState(toLocalYmd(today));
  const sync = useBoltSync();

  const invalidRange = dateFrom > dateTo;
  const disabled = !connected || running || sync.isPending || invalidRange;

  return (
    <Card title="Download trips">
      {!connected ? (
        <div className="rounded-control bg-warning-bg px-3 py-2 text-sm text-warning">
          Bolt API credentials aren't configured (BOLT_CLIENT_ID / BOLT_CLIENT_SECRET in server/.env).
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">From</span>
              <input
                type="date"
                className={dateInputClass}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">To</span>
              <input
                type="date"
                className={dateInputClass}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
            <Button
              onClick={() => sync.mutate({ dateFrom, dateTo })}
              isLoading={sync.isPending}
              disabled={disabled}
            >
              <HiCloudArrowDown /> Download trips
            </Button>
          </div>

          <p className="font-mono text-xs text-ink-faint">
            Trips are downloaded per day (SAST) and matched to vehicles by plate. Large ranges take a few
            minutes — watch the sync log.
          </p>

          {running && (
            <p className="font-mono text-xs text-ink-muted">A sync is currently running…</p>
          )}
        </div>
      )}
    </Card>
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
              return (
                <span className="font-mono text-xs text-ink-muted">
                  {new Date(log.startedAt).toLocaleString('en-ZA')}
                </span>
              );
            case 'duration':
              return (
                <span className="font-mono text-xs text-ink-body">
                  {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
                </span>
              );
            case 'records':
              return (
                <span className="font-mono text-xs text-ink-body">
                  {log.recordsFetched}F / {log.recordsCreated}C / {log.recordsUpdated}U / {log.recordsMatched}M
                </span>
              );
            case 'errors':
              return (
                <span className={`font-mono text-xs ${log.recordsErrored > 0 ? 'text-danger' : 'text-ink-body'}`}>
                  {log.recordsErrored}
                </span>
              );
            default:
              return null;
          }
        }}
      />
      {data?.meta && (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
