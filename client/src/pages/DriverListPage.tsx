import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDrivers, useCreateDriver } from '../hooks/useDrivers';
import { Button, Input, Badge, StatusBadge, Modal, Pagination, LoadingSpinner, Table } from '../components/ui';
import { HiPlus, HiMagnifyingGlass } from 'react-icons/hi2';
import { int } from '../theme/format';
import toast from 'react-hot-toast';

const defaultForm = {
  employeeId: '', firstName: '', lastName: '', email: '', phone: '',
  licenseNumber: '', licenseExpiry: '', notes: '',
};

const controlClass =
  'rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body focus:border-primary-400 focus:outline-none';

const COLUMNS = [
  { key: 'name', header: 'Driver' },
  { key: 'employee', header: 'Employee ID' },
  { key: 'phone', header: 'Phone' },
  { key: 'licence', header: 'Licence' },
  { key: 'status', header: 'Status' },
];
const TEMPLATE = 'minmax(200px,1fr) 140px 150px minmax(180px,240px) 130px';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Licence expiry warning: danger if past, warning if within ~30 days. */
function licenceExpiry(expiry: string) {
  const date = new Date(expiry);
  const label = isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  if (isNaN(date.getTime())) return { label, badge: null as null | JSX.Element };
  const days = Math.floor((date.getTime() - Date.now()) / DAY_MS);
  if (days < 0) return { label, badge: <Badge tone="danger">Expired</Badge> };
  if (days <= 30) return { label, badge: <Badge tone="warning">{days}d left</Badge> };
  return { label, badge: null };
}

export default function DriverListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading, isFetching } = useDrivers({ page, limit: 1000, search, status: statusFilter || undefined });
  const createDriver = useCreateDriver();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDriver.mutateAsync(form);
      toast.success('Driver created');
      setShowModal(false);
      setForm(defaultForm);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create driver'); }
  };

  const setField = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const rows = (data?.data ?? []) as any[];

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Drivers</h1>
          <p className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
            {int(rows.length)} driver{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Updating…</span>}
          <Button onClick={() => setShowModal(true)}><HiPlus className="mr-1" /> Add Driver</Button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <Input
            placeholder="Name, email, licence…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-72 pl-9"
          />
        </div>
        <select className={controlClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<any>
            columns={COLUMNS}
            template={TEMPLATE}
            rows={rows}
            onRowClick={(d) => navigate(`/drivers/${d.id}`)}
            emptyMessage="No drivers found."
            renderCell={(d, key) => {
              switch (key) {
                case 'name':
                  return (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-strong">{d.firstName} {d.lastName}</p>
                      <p className="truncate text-xs text-ink-faint">{d.email || '—'}</p>
                    </div>
                  );
                case 'employee':
                  return <span className="font-mono text-xs text-ink-body">{d.employeeId || '—'}</span>;
                case 'phone':
                  return <span className="font-mono text-xs text-ink-body">{d.phone || '—'}</span>;
                case 'licence': {
                  const { label, badge } = licenceExpiry(d.licenseExpiry);
                  return (
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-ink-strong">{d.licenseNumber || '—'}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs text-ink-faint">{label}</span>
                        {badge}
                      </div>
                    </div>
                  );
                }
                case 'status':
                  return <StatusBadge kind="driver" value={d.status} />;
                default:
                  return null;
              }
            }}
          />
          {data?.meta && data.meta.totalPages > 1 && (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Driver" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employee ID" value={form.employeeId} onChange={(e) => setField('employeeId', e.target.value)} required />
            <Input label="First Name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
            <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            <Input label="License Number" value={form.licenseNumber} onChange={(e) => setField('licenseNumber', e.target.value)} required />
            <Input label="License Expiry" type="date" value={form.licenseExpiry} onChange={(e) => setField('licenseExpiry', e.target.value)} required />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={createDriver.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
