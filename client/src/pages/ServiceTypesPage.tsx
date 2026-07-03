import { useState } from 'react';
import { useServiceTypes, useCreateServiceType, useUpdateServiceType } from '../hooks/useServices';
import { Button, Input, Badge, Modal, LoadingSpinner, Table } from '../components/ui';
import { HiPlus, HiPencil } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const defaultForm = { name: '', description: '', category: '', estimatedDuration: '' };

const COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'category', header: 'Category' },
  { key: 'duration', header: 'Duration' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: '', className: 'text-right' },
];
const TEMPLATE = 'minmax(180px,1fr) 160px 140px 120px 80px';

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
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Service Types</h1>
          <p className="font-mono text-xs text-ink-faint">Maintenance &amp; repair categories</p>
        </div>
        <Button onClick={() => { setEditItem(null); setForm(defaultForm); setShowModal(true); }}>
          <HiPlus /> Add Type
        </Button>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <Table
          columns={COLUMNS}
          template={TEMPLATE}
          rows={data?.data ?? []}
          emptyMessage="No service types found."
          renderCell={(t: any, key) => {
            switch (key) {
              case 'name':
                return <span className="text-sm font-semibold text-ink">{t.name}</span>;
              case 'category':
                return <span className="text-sm text-ink-body">{t.category || '—'}</span>;
              case 'duration':
                return <span className="font-mono text-xs text-ink-muted">{t.estimatedDuration || '—'}</span>;
              case 'status':
                return <Badge tone={t.isActive ? 'success' : 'neutral'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>;
              case 'actions':
                return (
                  <div className="flex justify-end">
                    <button
                      onClick={() => openEdit(t)}
                      className="rounded-control p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-primary-600"
                      aria-label="Edit service type"
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
