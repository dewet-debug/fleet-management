import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useServices, useCreateService, useServiceTypes } from '../hooks/useServices';
import { useVehicles } from '../hooks/useVehicles';
import { Button, Input, Select, Badge, Modal, Pagination, LoadingSpinner } from '../components/ui';
import { HiPlus, HiEye, HiXMark } from 'react-icons/hi2';
import { formatCurrency, CURRENCY_OPTIONS } from '../utils/currency';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'gray' | 'blue' | 'purple' | 'yellow' | 'green' | 'red'> = {
  DRAFT: 'gray', SCHEDULED: 'blue', AUTHORIZED: 'purple', IN_PROGRESS: 'yellow',
  COMPLETED: 'green', APPROVED: 'green', RETURNED: 'gray',
};

export default function ServiceListPage() {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Service Records</h1>
        <Button onClick={() => setShowCreate(true)}><HiPlus className="mr-1" /> New Service</Button>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
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
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <HiXMark /> Clear Filters
          </button>
        )}
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Service Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Scheduled</th>
                  <th className="px-4 py-3 text-left">Cost</th>
                  <th className="px-4 py-3 text-left">Driver</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{s.vehicle?.licensePlate} - {s.vehicle?.make} {s.vehicle?.model}</td>
                    <td className="px-4 py-3">{s.serviceType?.name}</td>
                    <td className="px-4 py-3"><Badge color={statusColors[s.status]}>{s.status.replace('_', ' ')}</Badge></td>
                    <td className="px-4 py-3">{s.serviceProvider?.name || '-'}</td>
                    <td className="px-4 py-3">{s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">{s.totalCostInclVat ? formatCurrency(s.totalCostInclVat, s.currency) : '-'}</td>
                    <td className="px-4 py-3">{s.driver ? `${s.driver.firstName} ${s.driver.lastName}` : '-'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/services/${s.id}`} className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1">
                        <HiEye /> View
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No service records</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
