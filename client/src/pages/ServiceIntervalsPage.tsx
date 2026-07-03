import { useState } from 'react';
import { useServiceIntervals, useCreateServiceInterval, useUpdateServiceInterval, useServiceTypes } from '../hooks/useServices';
import { Button, Input, Select, Badge, Modal, LoadingSpinner, Table } from '../components/ui';
import { HiPlus, HiPencil } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const defaultForm = { serviceTypeId: '', vehicleMake: '', vehicleModel: '', kilometerInterval: '', timeIntervalDays: '' };

const COLUMNS = [
  { key: 'serviceType', header: 'Service Type' },
  { key: 'make', header: 'Make' },
  { key: 'model', header: 'Model' },
  { key: 'km', header: 'Km Interval', className: 'text-right' },
  { key: 'days', header: 'Days', className: 'text-right' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: '', className: 'text-right' },
];
const TEMPLATE = 'minmax(160px,1fr) 130px 130px 120px 80px 120px 80px';

export default function ServiceIntervalsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useServiceIntervals();
  const { data: serviceTypes } = useServiceTypes();
  const createInterval = useCreateServiceInterval();
  const updateInterval = useUpdateServiceInterval();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { serviceTypeId: form.serviceTypeId };
      if (form.vehicleMake) payload.vehicleMake = form.vehicleMake;
      if (form.vehicleModel) payload.vehicleModel = form.vehicleModel;
      if (form.kilometerInterval) payload.kilometerInterval = Number(form.kilometerInterval);
      if (form.timeIntervalDays) payload.timeIntervalDays = Number(form.timeIntervalDays);

      if (editItem) {
        await updateInterval.mutateAsync({ id: editItem.id, data: payload });
        toast.success('Updated');
      } else {
        await createInterval.mutateAsync(payload);
        toast.success('Created');
      }
      setShowModal(false);
      setEditItem(null);
      setForm(defaultForm);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      serviceTypeId: item.serviceTypeId, vehicleMake: item.vehicleMake || '',
      vehicleModel: item.vehicleModel || '', kilometerInterval: item.kilometerInterval?.toString() || '',
      timeIntervalDays: item.timeIntervalDays?.toString() || '',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Service Intervals</h1>
          <p className="font-mono text-xs text-ink-faint">Distance &amp; time-based maintenance schedules</p>
        </div>
        <Button onClick={() => { setEditItem(null); setForm(defaultForm); setShowModal(true); }}>
          <HiPlus /> Add Interval
        </Button>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <Table
          columns={COLUMNS}
          template={TEMPLATE}
          rows={data?.data ?? []}
          emptyMessage="No service intervals found."
          renderCell={(i: any, key) => {
            switch (key) {
              case 'serviceType':
                return <span className="text-sm font-semibold text-ink">{i.serviceType?.name}</span>;
              case 'make':
                return <span className="text-sm text-ink-body">{i.vehicleMake || 'All'}</span>;
              case 'model':
                return <span className="text-sm text-ink-body">{i.vehicleModel || 'All'}</span>;
              case 'km':
                return <span className="font-mono text-xs text-ink-body">{i.kilometerInterval ? `${i.kilometerInterval.toLocaleString()} km` : '—'}</span>;
              case 'days':
                return <span className="font-mono text-xs text-ink-body">{i.timeIntervalDays || '—'}</span>;
              case 'status':
                return <Badge tone={i.isActive ? 'success' : 'neutral'}>{i.isActive ? 'Active' : 'Inactive'}</Badge>;
              case 'actions':
                return (
                  <div className="flex justify-end">
                    <button
                      onClick={() => openEdit(i)}
                      className="rounded-control p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-primary-600"
                      aria-label="Edit interval"
                    >
                      <HiPencil />
                    </button>
                  </div>
                );
              default:
                return null;
            }
          }}
        />
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Edit Interval' : 'Add Interval'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Service Type" value={form.serviceTypeId}
            onChange={(e) => setForm({ ...form, serviceTypeId: e.target.value })}
            options={[{ value: '', label: 'Select...' },
              ...(serviceTypes?.data?.map((t: any) => ({ value: t.id, label: t.name })) || [])]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vehicle Make (optional)" value={form.vehicleMake}
              onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })} />
            <Input label="Vehicle Model (optional)" value={form.vehicleModel}
              onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} />
            <Input label="Kilometer Interval" type="number" value={form.kilometerInterval}
              onChange={(e) => setForm({ ...form, kilometerInterval: e.target.value })} />
            <Input label="Time Interval (days)" type="number" value={form.timeIntervalDays}
              onChange={(e) => setForm({ ...form, timeIntervalDays: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={createInterval.isPending || updateInterval.isPending}>{editItem ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
