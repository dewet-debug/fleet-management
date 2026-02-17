import { useState } from 'react';
import { useServiceIntervals, useCreateServiceInterval, useUpdateServiceInterval, useServiceTypes } from '../hooks/useServices';
import { Button, Input, Select, Badge, Modal, LoadingSpinner } from '../components/ui';
import { HiPlus, HiPencil } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const defaultForm = { serviceTypeId: '', vehicleMake: '', vehicleModel: '', kilometerInterval: '', timeIntervalDays: '' };

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Service Intervals</h1>
        <Button onClick={() => { setEditItem(null); setForm(defaultForm); setShowModal(true); }}>
          <HiPlus className="mr-1" /> Add Interval
        </Button>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Service Type</th>
                <th className="px-4 py-3 text-left">Vehicle Make</th>
                <th className="px-4 py-3 text-left">Vehicle Model</th>
                <th className="px-4 py-3 text-left">Kilometer Interval</th>
                <th className="px-4 py-3 text-left">Time Interval (days)</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map((i: any) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{i.serviceType?.name}</td>
                  <td className="px-4 py-3">{i.vehicleMake || 'All'}</td>
                  <td className="px-4 py-3">{i.vehicleModel || 'All'}</td>
                  <td className="px-4 py-3">{i.kilometerInterval ? `${i.kilometerInterval.toLocaleString()} km` : '-'}</td>
                  <td className="px-4 py-3">{i.timeIntervalDays || '-'}</td>
                  <td className="px-4 py-3"><Badge color={i.isActive ? 'green' : 'red'}>{i.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(i)} className="text-primary-600 hover:text-primary-800"><HiPencil /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
