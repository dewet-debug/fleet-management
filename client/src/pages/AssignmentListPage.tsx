import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAssignments, useCreateAssignment, useEndAssignment } from '../hooks/useAssignments';
import { useVehicles } from '../hooks/useVehicles';
import { useDrivers } from '../hooks/useDrivers';
import type { Assignment } from '../api/assignments';
import { Button, Input, Select, Badge, Table, Modal, ConfirmDialog, Pagination, LoadingSpinner } from '../components/ui';
import { HiPlus, HiStop } from 'react-icons/hi2';
import { int } from '../theme/format';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ENDED', label: 'Ended' },
];

const COLUMNS = [
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'driver', header: 'Driver' },
  { key: 'status', header: 'Status' },
  { key: 'start', header: 'Start' },
  { key: 'end', header: 'End' },
  { key: 'actions', header: '', className: 'text-right' },
];
const TEMPLATE = 'minmax(200px,1fr) 170px 120px 120px 120px 90px';

const fmtDate = (val?: string | null) => (val ? new Date(val).toLocaleDateString() : '—');

export default function AssignmentListPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [endId, setEndId] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', driverId: '', startDate: new Date().toISOString().split('T')[0], notes: '' });

  const { data, isLoading, isFetching } = useAssignments({ page, limit: 20, status: statusFilter || undefined });
  const { data: vehicles } = useVehicles({ limit: 100 });
  const { data: drivers } = useDrivers({ limit: 100 });
  const createAssignment = useCreateAssignment();
  const endAssignment = useEndAssignment();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAssignment.mutateAsync(form);
      toast.success('Assignment created');
      setShowCreate(false);
      setForm({ vehicleId: '', driverId: '', startDate: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEnd = async () => {
    if (!endId) return;
    try {
      await endAssignment.mutateAsync(endId);
      toast.success('Assignment ended');
      setEndId(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Assignments</h1>
          <p className="font-mono text-xs text-ink-faint">Vehicle ↔ driver assignments</p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Updating…</span>}
          <Button onClick={() => setShowCreate(true)}><HiPlus className="mr-1" /> Create assignment</Button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((s) => {
          const active = statusFilter === s.value;
          return (
            <button
              key={s.value || 'all'}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={`rounded-pill border px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-paper-line text-ink-muted hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<Assignment>
            columns={COLUMNS}
            template={TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No assignments found."
            renderCell={(a, key) => {
              const row = a as any;
              switch (key) {
                case 'vehicle':
                  return (
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-ink-strong">{row.vehicle?.licensePlate || '—'}</p>
                      <p className="truncate text-xs text-ink-faint">{row.vehicle?.make} {row.vehicle?.model}</p>
                    </div>
                  );
                case 'driver':
                  return (
                    <span className="truncate text-sm text-ink-body">
                      {row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : '—'}
                    </span>
                  );
                case 'status':
                  return a.status === 'ACTIVE'
                    ? <Badge tone="success">Active</Badge>
                    : <Badge tone="neutral">{a.status}</Badge>;
                case 'start':
                  return <span className="font-mono text-xs text-ink-body">{fmtDate(a.startDate)}</span>;
                case 'end':
                  return <span className="font-mono text-xs text-ink-body">{fmtDate(a.endDate)}</span>;
                case 'actions':
                  return a.status === 'ACTIVE' ? (
                    <div className="flex justify-end">
                      <Button variant="danger" size="sm" onClick={() => setEndId(a.id)}>
                        <HiStop className="mr-1" /> End
                      </Button>
                    </div>
                  ) : null;
                default:
                  return null;
              }
            }}
          />

          {data?.pagination && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-ink-faint">
                Showing {data.data.length ? (data.pagination.page - 1) * data.pagination.limit + 1 : 0}
                –{(data.pagination.page - 1) * data.pagination.limit + data.data.length} of {int(data.pagination.total)}
              </p>
              {data.pagination.totalPages > 1 && (
                <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
              )}
            </div>
          )}
        </>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Assignment">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            options={[{ value: '', label: 'Select vehicle...' },
              ...(vehicles?.data?.filter((v: any) => v.status === 'ACTIVE').map((v: any) => ({
                value: v.id, label: `${v.licensePlate} - ${v.make} ${v.model}`,
              })) || [])]} />
          <Select label="Driver" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}
            options={[{ value: '', label: 'Select driver...' },
              ...(drivers?.data?.filter((d: any) => d.status === 'ACTIVE').map((d: any) => ({
                value: d.id, label: `${d.employeeId} - ${d.firstName} ${d.lastName}`,
              })) || [])]} />
          <Input label="Start Date" type="date" value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createAssignment.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!endId} onClose={() => setEndId(null)} onConfirm={handleEnd}
        title="End Assignment" message="Are you sure you want to end this assignment?" variant="danger" />
    </div>
  );
}
