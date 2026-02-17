import { useState } from 'react';
import { useServiceTypes, useCreateServiceType, useUpdateServiceType } from '../hooks/useServices';
import { Button, Input, Badge, Modal, LoadingSpinner } from '../components/ui';
import { HiPlus, HiPencil } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const defaultForm = { name: '', description: '', category: '', estimatedDuration: '' };

export default function ServiceTypesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useServiceTypes();
  const createType = useCreateServiceType();
  const updateType = useUpdateServiceType();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        await updateType.mutateAsync({ id: editItem.id, data: form });
        toast.success('Updated');
      } else {
        await createType.mutateAsync(form);
        toast.success('Created');
      }
      setShowModal(false);
      setEditItem(null);
      setForm(defaultForm);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || '', category: item.category || '', estimatedDuration: item.estimatedDuration || '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Service Types</h1>
        <Button onClick={() => { setEditItem(null); setForm(defaultForm); setShowModal(true); }}>
          <HiPlus className="mr-1" /> Add Type
        </Button>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">{t.category || '-'}</td>
                  <td className="px-4 py-3">{t.estimatedDuration || '-'}</td>
                  <td className="px-4 py-3"><Badge color={t.isActive ? 'green' : 'red'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(t)} className="text-primary-600 hover:text-primary-800"><HiPencil /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Edit Service Type' : 'Add Service Type'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label="Estimated Duration" value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={createType.isPending || updateType.isPending}>{editItem ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
