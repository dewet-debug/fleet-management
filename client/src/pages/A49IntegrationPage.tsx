import { useState } from 'react';
import { Badge, StatusBadge, Button, Input, LoadingSpinner, Pagination, Card, Table } from '../components/ui';
import IntegrationConsole from '../components/integration/IntegrationConsole';
import {
  HiPlay,
  HiUsers,
  HiWrenchScrewdriver,
  HiDocumentText,
  HiArrowPath,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import {
  useA49Drivers,
  useA49JobCards,
  useA49SyncLogs,
  useSyncA49All,
  useSyncA49Drivers,
  useSyncA49JobCards,
} from '../hooks/useA49';
import type { A49Driver, A49JobCard, A49SyncLog } from '../api/a49';
import { int, zar, lastSynced } from '../theme/format';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const jobCardStatusTone: Record<string, Tone> = {
  'Work In Progress': 'warning',
  'Created - Supplier to Quote': 'neutral',
  'Supplier Quoted': 'warning',
  'Supplier Quote Declined': 'danger',
  'PO Approved': 'success',
  'Closed': 'success',
};

const controlClass =
  'rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body focus:border-primary-400 focus:outline-none';

const dur = (ms: number | null) => (ms ? `${(ms / 1000).toFixed(1)}s` : '—');
const dt = (iso: string) => new Date(iso).toLocaleString();

const TABS = [
  { key: 'overview', label: 'Overview', icon: HiDocumentText },
  { key: 'drivers', label: 'Drivers', icon: HiUsers },
  { key: 'job-cards', label: 'Job Cards', icon: HiWrenchScrewdriver },
  { key: 'logs', label: 'Sync Logs', icon: HiDocumentText },
];

export default function A49IntegrationPage() {
  const [tab, setTab] = useState<'overview' | 'drivers' | 'job-cards' | 'logs'>('overview');

  const { data: driversData } = useA49Drivers({ limit: 1 });
  const { data: jobCardsData } = useA49JobCards({ limit: 1 });
  const { data: logsData } = useA49SyncLogs({ limit: 5 });
  const syncAll = useSyncA49All();
  const syncDrivers = useSyncA49Drivers();
  const syncJobCards = useSyncA49JobCards();

  const lastLog = logsData?.data?.[0] as A49SyncLog | undefined;

  const stats = [
    { label: 'Total drivers', value: int(driversData?.meta?.total ?? 0) },
    { label: 'Total job cards', value: int(jobCardsData?.meta?.total ?? 0) },
    { label: 'Last sync', value: lastLog ? lastSynced(lastLog.startedAt) : 'Never' },
    {
      label: 'Last sync status',
      value: lastLog ? <StatusBadge kind="sync" value={lastLog.status} /> : <Badge tone="neutral">N/A</Badge>,
    },
  ];

  const statusSlot = (
    <>
      <Badge tone="success" dot>Connected</Badge>
      <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
        last synced {lastLog ? lastSynced(lastLog.startedAt) : '—'}
      </span>
    </>
  );

  return (
    <IntegrationConsole
      title="MNC Integration"
      subtitle="Maintenance & driver data · A49 API"
      statusSlot={statusSlot}
      actions={
        <>
          <Button onClick={() => syncAll.mutate()} isLoading={syncAll.isPending}>
            <HiPlay /> Sync All
          </Button>
          <Button variant="secondary" onClick={() => syncDrivers.mutate()} isLoading={syncDrivers.isPending}>
            <HiArrowPath /> Sync Drivers
          </Button>
          <Button variant="secondary" onClick={() => syncJobCards.mutate()} isLoading={syncJobCards.isPending}>
            <HiArrowPath /> Sync Job Cards
          </Button>
        </>
      }
      stats={stats}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as typeof tab)}
    >
      {tab === 'overview' && <OverviewTab />}
      {tab === 'drivers' && <DriversTab />}
      {tab === 'job-cards' && <JobCardsTab />}
      {tab === 'logs' && <SyncLogsTab />}
    </IntegrationConsole>
  );
}

// ---- Overview Tab ----

const OVERVIEW_COLS = [
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'started', header: 'Started' },
  { key: 'duration', header: 'Duration', className: 'text-right' },
  { key: 'records', header: 'Records', className: 'text-right' },
];
const OVERVIEW_TEMPLATE = '130px 130px minmax(160px,1fr) 90px 140px';

function OverviewTab() {
  const { data: logsData, isLoading } = useA49SyncLogs({ limit: 5 });

  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <Card
      title="Recent Sync Logs"
      subtitle={!logsData?.data?.length ? 'Click "Sync All" to pull data from A49' : undefined}
      bodyClassName="p-0"
    >
      <Table<A49SyncLog>
        columns={OVERVIEW_COLS}
        template={OVERVIEW_TEMPLATE}
        rows={logsData?.data ?? []}
        emptyMessage='No sync logs yet. Click "Sync All" to pull data from A49.'
        renderCell={(log, key) => {
          switch (key) {
            case 'type':
              return <span className="font-mono text-xs text-ink-strong">{log.syncType}</span>;
            case 'status':
              return <StatusBadge kind="sync" value={log.status} />;
            case 'started':
              return <span className="font-mono text-xs text-ink-muted">{dt(log.startedAt)}</span>;
            case 'duration':
              return <span className="font-mono text-xs text-ink-body">{dur(log.durationMs)}</span>;
            case 'records':
              return (
                <span className="font-mono text-xs text-ink-body">
                  {log.recordsFetched}F / {log.recordsCreated}C / {log.recordsUpdated}U
                </span>
              );
            default:
              return null;
          }
        }}
      />
    </Card>
  );
}

// ---- Drivers Tab ----

const DRIVER_COLS = [
  { key: 'driver', header: 'Driver' },
  { key: 'contact', header: 'Contact' },
  { key: 'plate', header: 'License Plate' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'status', header: 'Status' },
  { key: 'odo', header: 'Current ODO', className: 'text-right' },
  { key: 'kmY', header: 'KM Yesterday', className: 'text-right' },
  { key: 'kmMtd', header: 'KM MTD', className: 'text-right' },
];
const DRIVER_TEMPLATE = 'minmax(180px,1fr) 130px 120px 130px 120px 110px 120px 100px';

function DriversTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useA49Drivers({ page, limit: 20, search: search || undefined });

  return (
    <div className="space-y-4">
      <div className="relative">
        <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
        <Input
          placeholder="Search by name, plate, email, phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-96 pl-9"
        />
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<A49Driver>
            columns={DRIVER_COLS}
            template={DRIVER_TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No drivers found. Run a sync first."
            renderCell={(d, key) => {
              switch (key) {
                case 'driver':
                  return (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-body">{d.driverFullName}</p>
                      <p className="truncate text-xs text-ink-faint">{d.driverEmail}</p>
                    </div>
                  );
                case 'contact':
                  return <span className="font-mono text-xs text-ink-muted">{d.driverContactNumber || '—'}</span>;
                case 'plate':
                  return <span className="font-mono text-xs text-ink-strong">{d.licensePlate || '—'}</span>;
                case 'vehicle':
                  return <span className="text-xs text-ink-body">{d.vehicleType || '—'}</span>;
                case 'status':
                  return <Badge tone={d.vehicleStatus === 'Active' ? 'success' : 'neutral'}>{d.vehicleStatus || 'N/A'}</Badge>;
                case 'odo':
                  return <span className="font-mono text-xs text-ink-body">{d.currentOdo != null ? int(d.currentOdo) : '—'}</span>;
                case 'kmY':
                  return <span className="font-mono text-xs text-ink-body">{d.kmYesterday != null ? int(d.kmYesterday) : '—'}</span>;
                case 'kmMtd':
                  return <span className="font-mono text-xs text-ink-body">{d.kmMonthToDate != null ? int(d.kmMonthToDate) : '—'}</span>;
                default:
                  return null;
              }
            }}
          />
          {data?.meta && (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}

// ---- Job Cards Tab ----

const JOB_CARD_COLS = [
  { key: 'number', header: 'Job Card #' },
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'merchant', header: 'Merchant' },
  { key: 'opened', header: 'Opened' },
  { key: 'quoted', header: 'Quoted (excl VAT)', className: 'text-right' },
  { key: 'po', header: 'PO (excl VAT)', className: 'text-right' },
  { key: 'insurance', header: 'Insurance', className: 'text-center' },
];
const JOB_CARD_TEMPLATE = '110px 120px 150px minmax(150px,1fr) 130px 100px 130px 120px 90px';

function JobCardsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useA49JobCards({
    page, limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <Input
            placeholder="Search by card #, plate, merchant…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-96 pl-9"
          />
        </div>
        <select
          className={controlClass}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="Work In Progress">Work In Progress</option>
          <option value="Created - Supplier to Quote">Created - Supplier to Quote</option>
          <option value="Supplier Quoted">Supplier Quoted</option>
          <option value="Supplier Quote Declined">Supplier Quote Declined</option>
          <option value="PO Approved">PO Approved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<A49JobCard>
            columns={JOB_CARD_COLS}
            template={JOB_CARD_TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No job cards found. Run a sync first."
            renderCell={(jc, key) => {
              switch (key) {
                case 'number':
                  return <span className="font-mono text-xs font-medium text-ink-strong">#{jc.jobCardNumber}</span>;
                case 'type':
                  return <span className="text-xs text-ink-body">{jc.jobCardType || '—'}</span>;
                case 'status':
                  return <Badge tone={jobCardStatusTone[jc.jobCardStatus || ''] ?? 'neutral'}>{jc.jobCardStatus || 'N/A'}</Badge>;
                case 'vehicle':
                  return (
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-ink-strong">{jc.registrationNumber}</p>
                      <p className="truncate text-xs text-ink-faint">{jc.associatedMake} {jc.associatedModel}</p>
                    </div>
                  );
                case 'merchant':
                  return <span className="truncate text-xs text-ink-body">{jc.associatedMerchant || '—'}</span>;
                case 'opened':
                  return <span className="font-mono text-xs text-ink-muted">{jc.jobCardOpenedDate ? new Date(jc.jobCardOpenedDate).toLocaleDateString() : '—'}</span>;
                case 'quoted':
                  return <span className="font-mono text-xs text-ink-body">{jc.quotedTotalsExclVat != null ? zar(jc.quotedTotalsExclVat) : '—'}</span>;
                case 'po':
                  return <span className="font-mono text-xs text-ink-body">{jc.poTotalExclVat != null ? zar(jc.poTotalExclVat) : '—'}</span>;
                case 'insurance':
                  return jc.insuranceRelated
                    ? <Badge tone="warning">Yes</Badge>
                    : <span className="text-xs text-ink-faint">No</span>;
                default:
                  return null;
              }
            }}
          />
          {data?.meta && (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}

// ---- Sync Logs Tab ----

const LOG_COLS = [
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'triggered', header: 'Triggered' },
  { key: 'started', header: 'Started' },
  { key: 'duration', header: 'Duration', className: 'text-right' },
  { key: 'fetched', header: 'Fetched', className: 'text-right' },
  { key: 'created', header: 'Created', className: 'text-right' },
  { key: 'updated', header: 'Updated', className: 'text-right' },
  { key: 'errors', header: 'Errors', className: 'text-right' },
];
const LOG_TEMPLATE = '120px 130px 100px minmax(150px,1fr) 80px 80px 80px 80px 70px';

function SyncLogsTab() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useA49SyncLogs({
    page, limit: 20,
    syncType: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          className={controlClass}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="DRIVERS">Drivers</option>
          <option value="JOB_CARDS">Job Cards</option>
        </select>
        <select
          className={controlClass}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PARTIAL">Partial</option>
          <option value="FAILED">Failed</option>
          <option value="STARTED">Started</option>
        </select>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<A49SyncLog>
            columns={LOG_COLS}
            template={LOG_TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No sync logs found."
            renderCell={(log, key) => {
              switch (key) {
                case 'type':
                  return <span className="font-mono text-xs text-ink-strong">{log.syncType}</span>;
                case 'status':
                  return <StatusBadge kind="sync" value={log.status} />;
                case 'triggered':
                  return <span className="text-xs text-ink-muted">{log.triggeredBy}</span>;
                case 'started':
                  return <span className="font-mono text-xs text-ink-muted">{dt(log.startedAt)}</span>;
                case 'duration':
                  return <span className="font-mono text-xs text-ink-body">{dur(log.durationMs)}</span>;
                case 'fetched':
                  return <span className="font-mono text-xs text-ink-body">{log.recordsFetched}</span>;
                case 'created':
                  return <span className="font-mono text-xs text-ink-body">{log.recordsCreated}</span>;
                case 'updated':
                  return <span className="font-mono text-xs text-ink-body">{log.recordsUpdated}</span>;
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
        </>
      )}
    </div>
  );
}
