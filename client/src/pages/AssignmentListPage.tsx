import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAssignments, useCreateAssignment, useEndAssignment } from '../hooks/useAssignments';
import { useVehicles } from '../hooks/useVehicles';
import { useDrivers } from '../hooks/useDrivers';
import { Button, Input, Select, Badge, Modal, ConfirmDialog, Pagination, LoadingSpinner } from '../components/ui';
import { HiPlus, HiStop } from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AssignmentListPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [endId, setEndId] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', driverId: '', startDate: new Date().toISOString().split('T')[0], notes: '' });

  const { data, isLoading } = useAssignments({ page, limit: 20, status: statusFilter || undefined });
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <Button onClick={() => setShowCreate(true)}><HiPlus className="mr-1" /> Create Assignment</Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[{ value: '', label: 'All Statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'ENDED', label: 'Ended' }]} />
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Driver</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-left">End Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{a.vehicle?.licensePlate} - {a.vehicle?.make} {a.vehicle?.model}</td>
                    <td className="px-4 py-3">{a.driver?.firstName} {a.driver?.lastName}</td>
                    <td className="px-4 py-3"><Badge color={a.status === 'ACTIVE' ? 'green' : 'gray'}>{a.status}</Badge></td>
                    <td className="px-4 py-3">{new Date(a.startDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{a.endDate ? new Date(a.endDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      {a.status === 'ACTIVE' && (
                        <Button variant="danger" size="sm" onClick={() => setEndId(a.id)}>
                          <HiStop className="mr-1" /> End
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No assignments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
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
