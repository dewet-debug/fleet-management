import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDriver, useUpdateDriver, useDeleteDriver, useDriverCosts } from '../hooks/useDrivers';
import { Card, Badge, Button, Input, Modal, ConfirmDialog, LoadingSpinner } from '../components/ui';
import { HiArrowLeft, HiPencil, HiTrash } from 'react-icons/hi2';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'green' | 'gray' | 'red'> = {
  ACTIVE: 'green', INACTIVE: 'gray', SUSPENDED: 'red',
};

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: driver, isLoading } = useDriver(id!);
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const [tab, setTab] = useState<'overview' | 'costs' | 'assignments'>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [costPeriod, setCostPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const { data: costData } = useDriverCosts(id!, costPeriod);

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
  if (!driver) return <p className="text-center text-gray-500 py-12">Driver not found</p>;

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id: _, createdAt: __, updatedAt: ___, assignments: ____, ...data } = editForm;
      await updateDriver.mutateAsync({ id: id!, data });
      toast.success('Driver updated');
      setShowEdit(false);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const handleDelete = async () => {
    try {
      await deleteDriver.mutateAsync(id!);
      toast.success('Driver deleted');
      navigate('/drivers');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/drivers" className="text-gray-500 hover:text-gray-700"><HiArrowLeft className="text-xl" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{driver.firstName} {driver.lastName}</h1>
          <p className="text-gray-500">{driver.employeeId} &middot; {driver.email}</p>
        </div>
        <Badge color={statusColors[driver.status]}>{driver.status}</Badge>
        <Button variant="secondary" size="sm" onClick={() => { setEditForm(driver); setShowEdit(true); }}>
          <HiPencil className="mr-1" /> Edit
        </Button>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <HiTrash className="mr-1" /> Delete
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(['overview', 'costs', 'assignments'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <Card title="Driver Details">
          <dl className="space-y-3 text-sm">
            {[
              ['Phone', driver.phone || 'N/A'],
              ['License Number', driver.licenseNumber],
              ['License Expiry', new Date(driver.licenseExpiry).toLocaleDateString()],
              ['Notes', driver.notes || 'N/A'],
              ['Created', new Date(driver.createdAt).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {tab === 'costs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={costPeriod}
              onChange={(e) => setCostPeriod(e.target.value as 'weekly' | 'monthly')}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {costData && (
              <div className="text-sm text-gray-600">
                Lifetime: <span className="font-semibold text-gray-900">{formatCurrency(costData.lifetimeCost, 'ZAR')}</span>
                {' '}({costData.lifetimeServices} services)
              </div>
            )}
          </div>
          <Card>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Services</th>
                  <th className="px-4 py-3 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costData?.periods?.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.periodLabel}</td>
                    <td className="px-4 py-3">{p.serviceCount}</td>
                    <td className="px-4 py-3">{formatCurrency(p.totalCost, 'ZAR')}</td>
                  </tr>
                ))}
                {(!costData?.periods || costData.periods.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No service costs recorded</td></tr>
                )}
              </tbody>
            </table>
          </Card>
          <Card title="Cost by Vehicle">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Services</th>
                  <th className="px-4 py-3 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costData?.costByVehicle?.map((item: any) => (
                  <tr key={item.vehicleId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.vehicleName}</td>
                    <td className="px-4 py-3">{item.serviceCount}</td>
                    <td className="px-4 py-3">{formatCurrency(item.totalCost, 'ZAR')}</td>
                  </tr>
                ))}
                {(!costData?.costByVehicle || costData.costByVehicle.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No vehicle cost data</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'assignments' && (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Start Date</th>
                <th className="px-4 py-3 text-left">End Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {driver.assignments?.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.vehicle?.make} {a.vehicle?.model} ({a.vehicle?.licensePlate})</td>
                  <td className="px-4 py-3"><Badge color={a.status === 'ACTIVE' ? 'green' : 'gray'}>{a.status}</Badge></td>
                  <td className="px-4 py-3">{new Date(a.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{a.endDate ? new Date(a.endDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {(!driver.assignments || driver.assignments.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No assignments</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Driver" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
            <Input label="Last Name" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
            <Input label="Phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="License Number" value={editForm.licenseNumber || ''} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} />
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={editForm.status || ''}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <Input label="Notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" isLoading={updateDriver.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Delete Driver" message={`Are you sure you want to delete ${driver.firstName} ${driver.lastName}?`} variant="danger" />
    </div>
  );
}
