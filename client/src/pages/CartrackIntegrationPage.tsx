import { useState } from 'react';
import { Card, Badge, Button, Input, Modal, ConfirmDialog, LoadingSpinner, Pagination } from '../components/ui';
import {
  HiPlay,
  HiCog6Tooth,
  HiTruck,
  HiDocumentText,
  HiCheck,
  HiXMark,
  HiTrash,
  HiPlus,
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
import toast from 'react-hot-toast';

const syncStatusColors: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  SYNCED: 'green', PENDING: 'yellow', ERROR: 'red', NOT_FOUND: 'red',
};

const logStatusColors: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  COMPLETED: 'green', IN_PROGRESS: 'yellow', STARTED: 'yellow', PARTIAL: 'yellow', FAILED: 'red', CANCELLED: 'gray',
};

export default function CartrackIntegrationPage() {
  const [tab, setTab] = useState<'overview' | 'config' | 'vehicles' | 'logs'>('overview');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Cartrack Integration</h1>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {([
            { key: 'overview', label: 'Overview', icon: HiDocumentText },
            { key: 'config', label: 'Configuration', icon: HiCog6Tooth },
            { key: 'vehicles', label: 'Fleet Vehicles', icon: HiTruck },
            { key: 'logs', label: 'Sync Logs', icon: HiDocumentText },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="text-sm" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'config' && <ConfigTab />}
      {tab === 'vehicles' && <FleetVehiclesTab />}
      {tab === 'logs' && <SyncLogsTab />}
    </div>
  );
}

// ---- Overview Tab ----

function OverviewTab() {
  const { data: config, isLoading: configLoading } = useCartrackConfig();
  const { data: scheduler } = useSchedulerStatus();
  const { data: fleetData } = useFleetVehicles({ limit: 1 });
  const { data: logsData } = useSyncLogs({ limit: 5 });
  const triggerSync = useTriggerSync();

  if (configLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <p className="text-xs text-gray-500">Integration</p>
          <Badge color={config?.isEnabled ? 'green' : 'red'}>
            {config?.isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500">Scheduler</p>
          <Badge color={scheduler?.isRunning ? 'green' : 'gray'}>
            {scheduler?.isRunning ? `Running (${scheduler.intervalMinutes}m)` : 'Stopped'}
          </Badge>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500">Sync Status</p>
          <Badge color={scheduler?.isSyncing ? 'yellow' : 'gray'}>
            {scheduler?.isSyncing ? 'Syncing...' : 'Idle'}
          </Badge>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500">Fleet Vehicles</p>
          <p className="text-2xl font-bold text-gray-900">{fleetData?.pagination?.total ?? 0}</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => triggerSync.mutate('FULL')} isLoading={triggerSync.isPending}>
          <HiPlay className="mr-1" /> Sync Now
        </Button>
      </div>

      <Card title="Recent Sync Logs">
        {logsData?.data?.length === 0 ? (
          <p className="text-sm text-gray-500">No sync logs yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Triggered</th>
                <th className="px-4 py-3 text-left">Started</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logsData?.data?.map((log: SyncLog) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{log.syncType}</td>
                  <td className="px-4 py-3"><Badge color={logStatusColors[log.status]}>{log.status}</Badge></td>
                  <td className="px-4 py-3">{log.triggeredBy}</td>
                  <td className="px-4 py-3">{new Date(log.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}</td>
                  <td className="px-4 py-3">{log.recordsFetched}F / {log.recordsCreated}C / {log.recordsUpdated}U</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
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
    <div className="space-y-6">
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" checked={getValue('isEnabled')} onChange={(e) => setField('isEnabled', e.target.checked)} />
              Enable Integration
            </label>
          </div>
          <Input label="Sync Interval (minutes)" type="number" value={getValue('syncIntervalMinutes')} onChange={(e) => setField('syncIntervalMinutes', parseInt(e.target.value, 10) || 15)} className="max-w-xs" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['vehicleSyncEnabled', 'tripSyncEnabled', 'driverSyncEnabled', 'alertSyncEnabled', 'fuelSyncEnabled'].map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="rounded border-gray-300" checked={getValue(key)} onChange={(e) => setField(key, e.target.checked)} />
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
        <Input placeholder="Search by plate..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <Button onClick={() => setShowAdd(true)}><HiPlus className="mr-1" /> Add Vehicle</Button>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">License Plate</th>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Cartrack ID</th>
                  <th className="px-4 py-3 text-left">Sync Status</th>
                  <th className="px-4 py-3 text-left">Last Synced</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((fv: FleetVehicle) => (
                  <tr key={fv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{fv.licensePlate}</td>
                    <td className="px-4 py-3">{fv.vehicle?.make} {fv.vehicle?.model} ({fv.vehicle?.year})</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fv.cartrackVehicleId || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge color={syncStatusColors[fv.syncStatus]}>{fv.syncStatus}</Badge>
                      {fv.syncErrorMessage && <p className="text-xs text-red-500 mt-1">{fv.syncErrorMessage}</p>}
                    </td>
                    <td className="px-4 py-3">{fv.lastSyncedAt ? new Date(fv.lastSyncedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setShowDelete(fv)} className="text-red-600 hover:text-red-800">
                        <HiTrash />
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No fleet vehicles registered</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Vehicle to Cartrack Sync">
        <div className="space-y-4">
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
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
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {['FULL', 'VEHICLES', 'TRIPS', 'DRIVERS', 'ALERTS', 'FUEL', 'VEHICLE_GROUPS'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {['STARTED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Triggered</th>
                  <th className="px-4 py-3 text-left">Started</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Fetched</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3 text-left">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((log: SyncLog) => (
                  <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <td className="px-4 py-3 font-medium">{log.syncType}</td>
                    <td className="px-4 py-3"><Badge color={logStatusColors[log.status]}>{log.status}</Badge></td>
                    <td className="px-4 py-3">{log.triggeredBy}</td>
                    <td className="px-4 py-3">{new Date(log.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}</td>
                    <td className="px-4 py-3">{log.recordsFetched}</td>
                    <td className="px-4 py-3">{log.recordsCreated}</td>
                    <td className="px-4 py-3">{log.recordsUpdated}</td>
                    <td className="px-4 py-3">{log.recordsErrored > 0 ? <span className="text-red-600">{log.recordsErrored}</span> : '0'}</td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No sync logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
