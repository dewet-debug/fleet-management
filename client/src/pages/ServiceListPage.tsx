import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useServices, useCreateService, useServiceTypes } from '../hooks/useServices';
import { useVehicles } from '../hooks/useVehicles';
import { Button, Input, Select, Modal, Pagination, LoadingSpinner, Table, StatusBadge } from '../components/ui';
import { HiPlus, HiXMark } from 'react-icons/hi2';
import { zar } from '../theme/format';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'ref', header: 'Ref' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'provider', header: 'Provider' },
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'cost', header: 'Cost', className: 'text-right' },
];
const TEMPLATE = '110px minmax(200px,1fr) 160px 160px 128px 120px';

export default function ServiceListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    vehicleId: '', serviceTypeConfigId: '', description: '',
    scheduledDate: '', serviceProviderId: '',
  });

  const hasDateFilter = dateFrom || dateTo;
  const { data, isLoading } = useServices({
    page, limit: 20,
    status: statusFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: serviceTypes } = useServiceTypes();
  const { data: vehicles } = useVehicles({ limit: 100 });
  const createService = useCreateService();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        vehicleId: form.vehicleId,
        serviceTypeConfigId: form.serviceTypeConfigId,
        description: form.description,
      };
      if (form.scheduledDate) payload.scheduledDate = form.scheduledDate;
      if (form.serviceProviderId) payload.serviceProviderId = form.serviceProviderId;
      await createService.mutateAsync(payload);
      toast.success('Service record created');
      setShowCreate(false);
      setForm({ vehicleId: '', serviceTypeConfigId: '', description: '', scheduledDate: '', serviceProviderId: '' });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Service Records</h1>
          <p className="font-mono text-xs text-ink-faint">Maintenance workflow &amp; cost tracking</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><HiPlus /> New Service</Button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'DRAFT,SCHEDULED,AUTHORIZED', label: 'Pending (Draft/Scheduled/Authorized)' },
            ...['DRAFT', 'SCHEDULED', 'AUTHORIZED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'RETURNED']
              .map((s) => ({ value: s, label: s.replace('_', ' ') })),
          ]} />
        <Input label="From" type="date" value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="max-w-[180px]" />
        <Input label="To" type="date" value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="max-w-[180px]" />
        {(statusFilter || hasDateFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1); setSearchParams({}); }}
            className="inline-flex items-center gap-1 rounded-control border border-paper-line px-3 py-2 text-sm text-ink-muted hover:bg-paper-sunken hover:text-ink"
          >
            <HiXMark /> Clear Filters
          </button>
        )}
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<any>
            columns={COLUMNS}
            template={TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No service records"
            onRowClick={(s) => navigate(`/services/${s.id}`)}
            renderCell={(s, key) => {
              switch (key) {
                case 'ref':
                  return <span className="font-mono text-xs text-ink-muted">{s.invoiceNumber || s.id.slice(0, 8)}</span>;
                case 'vehicle':
                  return (
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-ink-strong">{s.vehicle?.licensePlate || '—'}</p>
                      <p className="truncate text-xs text-ink-faint">{s.vehicle?.make} {s.vehicle?.model}</p>
                    </div>
                  );
                case 'provider':
                  return <span className="truncate text-sm text-ink-body">{s.serviceProvider?.name || '—'}</span>;
                case 'type':
                  return <span className="truncate text-sm text-ink-body">{s.serviceType?.name || '—'}</span>;
                case 'status':
                  return <StatusBadge kind="service" value={s.status} />;
                case 'cost':
                  return <span className="font-mono text-xs text-ink-strong">{s.totalCostInclVat != null ? zar(s.totalCostInclVat) : '—'}</span>;
                default:
                  return null;
              }
            }}
          />
          {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Service Record" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            options={[{ value: '', label: 'Select vehicle...' },
              ...(vehicles?.data?.map((v: any) => ({ value: v.id, label: `${v.licensePlate} - ${v.make} ${v.model}` })) || [])]} />
          <Select label="Service Type" value={form.serviceTypeConfigId}
            onChange={(e) => setForm({ ...form, serviceTypeConfigId: e.target.value })}
            options={[{ value: '', label: 'Select type...' },
              ...(serviceTypes?.data?.map((t: any) => ({ value: t.id, label: t.name })) || [])]} />
          <Input label="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Input label="Scheduled Date" type="date" value={form.scheduledDate}
            onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createService.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
