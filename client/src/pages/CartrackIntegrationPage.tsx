import { useState } from 'react';
import { Card, Badge, StatusBadge, Button, Input, Modal, ConfirmDialog, LoadingSpinner, Pagination, Table } from '../components/ui';
import IntegrationConsole from '../components/integration/IntegrationConsole';
import {
  HiPlay,
  HiCog6Tooth,
  HiTruck,
  HiDocumentText,
  HiTrash,
  HiPlus,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import {
  useCartrackConfig,
  useUpdateCartrackConfig,
  useTestConnection,
  useFleetVehicles,
  useAddFleetVehicle,
  useRemoveFleetVehicle,
  useTriggerSync,
  useSchedulerStatus,
  useSyncLogs,
} from '../hooks/useCartrack';
import { useVehicles } from '../hooks/useVehicles';
import type { FleetVehicle, SyncLog } from '../api/cartrack';
import { int, lastSynced } from '../theme/format';
import toast from 'react-hot-toast';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const fleetSyncTone: Record<string, Tone> = {
  SYNCED: 'success', PENDING: 'warning', ERROR: 'danger', NOT_FOUND: 'danger',
};

const controlClass =
  'rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body focus:border-primary-400 focus:outline-none';

const dur = (ms: number | null) => (ms ? `${(ms / 1000).toFixed(1)}s` : '—');
const dt = (iso: string) => new Date(iso).toLocaleString();

const TABS = [
  { key: 'overview', label: 'Overview', icon: HiDocumentText },
  { key: 'config', label: 'Configuration', icon: HiCog6Tooth },
  { key: 'vehicles', label: 'Fleet Vehicles', icon: HiTruck },
  { key: 'logs', label: 'Sync Logs', icon: HiDocumentText },
];

export default function CartrackIntegrationPage() {
  const [tab, setTab] = useState<'overview' | 'config' | 'vehicles' | 'logs'>('overview');

  const { data: config } = useCartrackConfig();
  const { data: scheduler } = useSchedulerStatus();
  const { data: fleetData } = useFleetVehicles({ limit: 1 });
  const { data: logsData } = useSyncLogs({ limit: 5 });
  const triggerSync = useTriggerSync();

  const lastLog = logsData?.data?.[0] as SyncLog | undefined;

  const stats = [
    {
      label: 'Integration',
      value: config?.isEnabled ? 'Enabled' : 'Disabled',
      valueClassName: config?.isEnabled ? 'text-success' : 'text-danger',
    },
    {
      label: 'Scheduler',
      value: scheduler?.isRunning ? `Running · ${scheduler.intervalMinutes}m` : 'Stopped',
    },
    {
      label: 'Sync status',
      value: scheduler?.isSyncing ? 'Syncing…' : 'Idle',
      valueClassName: scheduler?.isSyncing ? 'text-warning' : 'text-ink-strong',
    },
    { label: 'Fleet vehicles', value: int(fleetData?.pagination?.total ?? 0) },
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
      title="Cartrack Integration"
      subtitle="Vehicle telematics · Cartrack Fleet API"
      statusSlot={statusSlot}
      actions={
        <Button onClick={() => triggerSync.mutate('FULL')} isLoading={triggerSync.isPending}>
          <HiPlay /> Sync now
        </Button>
      }
      stats={stats}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as typeof tab)}
    >
      {tab === 'overview' && <OverviewTab />}
      {tab === 'config' && <ConfigTab />}
      {tab === 'vehicles' && <FleetVehiclesTab />}
      {tab === 'logs' && <SyncLogsTab />}
    </IntegrationConsole>
  );
}

// ---- Overview Tab ----

const OVERVIEW_COLS = [
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'triggered', header: 'Triggered' },
  { key: 'started', header: 'Started' },
  { key: 'duration', header: 'Duration', className: 'text-right' },
  { key: 'records', header: 'Records', className: 'text-right' },
];
const OVERVIEW_TEMPLATE = '120px 130px 110px minmax(160px,1fr) 90px 140px';

function OverviewTab() {
  const { data: logsData, isLoading } = useSyncLogs({ limit: 5 });

  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <Card title="Recent Sync Logs" bodyClassName="p-0">
      <Table<SyncLog>
        columns={OVERVIEW_COLS}
        template={OVERVIEW_TEMPLATE}
        rows={logsData?.data ?? []}
        emptyMessage="No sync logs yet."
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

// ---- Config Tab ----

function ConfigTab() {
  const { data: config, isLoading } = useCartrackConfig();
  const updateConfig = useUpdateCartrackConfig();
  const testConnection = useTestConnection();
  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);

  if (isLoading) return <LoadingSpinner size="lg" />;

  const setField = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const getValue = (key: string) => form[key] !== undefined ? form[key] : (config as any)?.[key] ?? '';

  const handleSave = () => {
    updateConfig.mutate(form, { onSuccess: () => { setForm({}); setDirty(false); } });
  };

  return (
    <div className="space-y-4">
      <Card title="API Credentials">
        <div className="grid grid-cols-2 gap-4">
          <Input label="API Base URL" value={getValue('apiBaseUrl')} onChange={(e) => setField('apiBaseUrl', e.target.value)} />
          <Input label="Username" value={getValue('apiUsername')} onChange={(e) => setField('apiUsername', e.target.value)} />
          <Input label="API Password" type="password" value={form.apiPassword ?? ''} placeholder="Enter new password" onChange={(e) => setField('apiPassword', e.target.value)} />
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => testConnection.mutate()} isLoading={testConnection.isPending}>
              Test Connection
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Sync Settings">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink-body">
              <input type="checkbox" className="rounded border-paper-line" checked={getValue('isEnabled')} onChange={(e) => setField('isEnabled', e.target.checked)} />
              Enable Integration
            </label>
          </div>
          <Input label="Sync Interval (minutes)" type="number" value={getValue('syncIntervalMinutes')} onChange={(e) => setField('syncIntervalMinutes', parseInt(e.target.value, 10) || 15)} className="max-w-xs" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['vehicleSyncEnabled', 'tripSyncEnabled', 'driverSyncEnabled', 'alertSyncEnabled', 'fuelSyncEnabled'].map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink-body">
                <input type="checkbox" className="rounded border-paper-line" checked={getValue(key)} onChange={(e) => setField(key, e.target.checked)} />
                {key.replace('SyncEnabled', '').replace(/([A-Z])/g, ' $1').trim()} Sync
              </label>
            ))}
          </div>
        </div>
      </Card>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={updateConfig.isPending}>Save Configuration</Button>
        </div>
      )}
    </div>
  );
}

// ---- Fleet Vehicles Tab ----

const FLEET_COLS = [
  { key: 'plate', header: 'License Plate' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'cartrackId', header: 'Cartrack ID' },
  { key: 'sync', header: 'Sync Status' },
  { key: 'lastSynced', header: 'Last Synced' },
  { key: 'actions', header: '', className: 'text-right' },
];
const FLEET_TEMPLATE = '120px minmax(160px,1fr) 130px 160px 150px 60px';

function FleetVehiclesTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState<FleetVehicle | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const { data, isLoading } = useFleetVehicles({ page, limit: 20, search: search || undefined });
  const { data: allVehicles } = useVehicles({ limit: 100 });
  const addVehicle = useAddFleetVehicle();
  const removeVehicle = useRemoveFleetVehicle();

  const handleAdd = () => {
    const vehicle = allVehicles?.data?.find((v: any) => v.id === selectedVehicleId);
    if (!vehicle) { toast.error('Select a vehicle'); return; }
    addVehicle.mutate(
      { vehicleId: vehicle.id, licensePlate: vehicle.licensePlate },
      { onSuccess: () => { setShowAdd(false); setSelectedVehicleId(''); } },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <Input placeholder="Search by plate…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-72 pl-9" />
        </div>
        <Button onClick={() => setShowAdd(true)}><HiPlus /> Add Vehicle</Button>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<FleetVehicle>
            columns={FLEET_COLS}
            template={FLEET_TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No fleet vehicles registered."
            renderCell={(fv, key) => {
              switch (key) {
                case 'plate':
                  return <span className="font-mono text-xs text-ink-strong">{fv.licensePlate}</span>;
                case 'vehicle':
                  return <span className="text-sm text-ink-body">{fv.vehicle?.make} {fv.vehicle?.model} ({fv.vehicle?.year})</span>;
                case 'cartrackId':
                  return <span className="font-mono text-xs text-ink-faint">{fv.cartrackVehicleId || '—'}</span>;
                case 'sync':
                  return (
                    <div>
                      <Badge tone={fleetSyncTone[fv.syncStatus] ?? 'neutral'}>{fv.syncStatus}</Badge>
                      {fv.syncErrorMessage && <p className="mt-1 text-xs text-danger">{fv.syncErrorMessage}</p>}
                    </div>
                  );
                case 'lastSynced':
                  return <span className="font-mono text-xs text-ink-muted">{fv.lastSyncedAt ? lastSynced(fv.lastSyncedAt) : '—'}</span>;
                case 'actions':
                  return (
                    <button onClick={() => setShowDelete(fv)} className="text-danger hover:brightness-90" aria-label="Remove">
                      <HiTrash />
                    </button>
                  );
                default:
                  return null;
              }
            }}
          />
          {data?.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Vehicle to Cartrack Sync">
        <div className="space-y-4">
          <select className={`w-full ${controlClass}`} value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
            <option value="">Select a vehicle...</option>
            {allVehicles?.data?.map((v: any) => (
              <option key={v.id} value={v.id}>{v.licensePlate} — {v.make} {v.model} ({v.year})</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} isLoading={addVehicle.isPending}>Add</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!showDelete}
        onClose={() => setShowDelete(null)}
        onConfirm={() => { if (showDelete) removeVehicle.mutate(showDelete.id, { onSuccess: () => setShowDelete(null) }); }}
        title="Remove Fleet Vehicle"
        message={`Remove ${showDelete?.licensePlate} from Cartrack sync?`}
        variant="danger"
      />
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
const LOG_TEMPLATE = '110px 130px 100px minmax(150px,1fr) 80px 80px 80px 80px 70px';

function SyncLogsTab() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useSyncLogs({
    page,
    limit: 20,
    syncType: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select className={controlClass} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {['FULL', 'VEHICLES', 'TRIPS', 'DRIVERS', 'ALERTS', 'FUEL', 'VEHICLE_GROUPS'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className={controlClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {['STARTED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<SyncLog>
            columns={LOG_COLS}
            template={LOG_TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No sync logs found."
            onRowClick={(log) => setExpandedId(expandedId === log.id ? null : log.id)}
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
          {data?.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
