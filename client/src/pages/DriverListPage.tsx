import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDrivers, useCreateDriver } from '../hooks/useDrivers';
import { Button, Input, Select, Badge, Modal, Pagination, LoadingSpinner } from '../components/ui';
import { HiPlus, HiEye } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'green' | 'gray' | 'red'> = {
  ACTIVE: 'green', INACTIVE: 'gray', SUSPENDED: 'red',
};

const defaultForm = {
  employeeId: '', firstName: '', lastName: '', email: '', phone: '',
  licenseNumber: '', licenseExpiry: '', notes: '',
};

export default function DriverListPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useDrivers({ page, limit: 20, search, status: statusFilter || undefined });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <Button onClick={() => setShowModal(true)}><HiPlus className="mr-1" /> Add Driver</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search drivers..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'SUSPENDED', label: 'Suspended' },
          ]} />
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">License #</th>
                  <th className="px-4 py-3 text-left">License Expiry</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{d.employeeId}</td>
                    <td className="px-4 py-3">{d.firstName} {d.lastName}</td>
                    <td className="px-4 py-3">{d.email}</td>
                    <td className="px-4 py-3">{d.licenseNumber}</td>
                    <td className="px-4 py-3">{new Date(d.licenseExpiry).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge color={statusColors[d.status]}>{d.status}</Badge></td>
                    <td className="px-4 py-3">
                      <Link to={`/drivers/${d.id}`} className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1">
                        <HiEye /> View
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No drivers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
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
