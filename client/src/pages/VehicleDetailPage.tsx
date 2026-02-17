import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVehicle, useUpdateVehicle, useDeleteVehicle, useUpdateKilometers, useVehicleCosts } from '../hooks/useVehicles';
import { Card, Badge, Button, Input, Select, Modal, ConfirmDialog, LoadingSpinner } from '../components/ui';
import { HiArrowLeft, HiPencil, HiTrash } from 'react-icons/hi2';
import { formatCurrency, CURRENCY_OPTIONS } from '../utils/currency';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  ACTIVE: 'green', IN_SERVICE: 'yellow', OUT_OF_SERVICE: 'red', RETIRED: 'gray',
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicle, isLoading } = useVehicle(id!);
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const updateKilometers = useUpdateKilometers();
  const { data: costData } = useVehicleCosts(id!);

  const [tab, setTab] = useState<'overview' | 'financials' | 'assignments' | 'services'>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [kilometers, setKilometers] = useState('');
  const [editForm, setEditForm] = useState<any>({});

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
  if (!vehicle) return <p className="text-center text-gray-500 py-12">Vehicle not found</p>;

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateVehicle.mutateAsync({ id: id!, data: editForm });
      toast.success('Vehicle updated');
      setShowEdit(false);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const handleDelete = async () => {
    try {
      await deleteVehicle.mutateAsync(id!);
      toast.success('Vehicle deleted');
      navigate('/vehicles');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleKilometersUpdate = async () => {
    if (!kilometers) return;
    try {
      await updateKilometers.mutateAsync({ id: id!, kilometers: Number(kilometers) });
      toast.success('Kilometers updated');
      setKilometers('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'financials', label: 'Financials' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'services', label: 'Service History' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/vehicles" className="text-gray-500 hover:text-gray-700"><HiArrowLeft className="text-xl" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.make} {vehicle.model} ({vehicle.year})</h1>
          <p className="text-gray-500">{vehicle.licensePlate} &middot; VIN: {vehicle.vin}</p>
        </div>
        <Badge color={statusColors[vehicle.status]}>{vehicle.status.replace('_', ' ')}</Badge>
        <Button variant="secondary" size="sm" onClick={() => { setEditForm(vehicle); setShowEdit(true); }}>
          <HiPencil className="mr-1" /> Edit
        </Button>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <HiTrash className="mr-1" /> Delete
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.label}</button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Vehicle Details">
            <dl className="space-y-3 text-sm">
              {[
                ['Color', vehicle.color],
                ['Fuel Type', vehicle.fuelType],
                ['Odometer', `${vehicle.currentKilometers?.toLocaleString()} km`],
                ['Purchase Date', vehicle.purchaseDate ? new Date(vehicle.purchaseDate).toLocaleDateString() : 'N/A'],
                ['Purchase Price', formatCurrency(vehicle.purchasePrice, vehicle.currency)],
                ['Currency', vehicle.currency || 'ZAR'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Update Kilometers">
            <div className="flex gap-2">
              <Input type="number" placeholder="New kilometers" value={kilometers} onChange={(e) => setKilometers(e.target.value)} />
              <Button onClick={handleKilometersUpdate} isLoading={updateKilometers.isPending}>Update</Button>
            </div>
            {vehicle.notes && <p className="mt-4 text-sm text-gray-600"><span className="font-medium">Notes:</span> {vehicle.notes}</p>}
          </Card>
        </div>
      )}

      {tab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Lease Information">
              <dl className="space-y-3 text-sm">
                {[
                  ['Fleet Number', vehicle.fleetNumber || 'N/A'],
                  ['Lease Company', vehicle.leaseCompany || 'N/A'],
                  ['Agreement No.', vehicle.leaseAgreementNo || 'N/A'],
                  ['Lease Start', vehicle.leaseStartDate ? new Date(vehicle.leaseStartDate).toLocaleDateString() : 'N/A'],
                  ['Lease End', vehicle.leaseEndDate ? new Date(vehicle.leaseEndDate).toLocaleDateString() : 'N/A'],
                  ['Monthly Cost', vehicle.monthlyLeaseCost != null ? formatCurrency(vehicle.monthlyLeaseCost, vehicle.currency) : 'N/A'],
                  ['Book Value', vehicle.currentBookValue != null ? formatCurrency(vehicle.currentBookValue, vehicle.currency) : 'N/A'],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Insurance">
              <dl className="space-y-3 text-sm">
                {[
                  ['Provider', vehicle.insuranceProvider || 'N/A'],
                  ['Policy No.', vehicle.insurancePolicyNo || 'N/A'],
                  ['Coverage', vehicle.coverageType || 'N/A'],
                  ['Policy Start', vehicle.policyStartDate ? new Date(vehicle.policyStartDate).toLocaleDateString() : 'N/A'],
                  ['Policy Expiry', vehicle.policyExpiryDate ? new Date(vehicle.policyExpiryDate).toLocaleDateString() : 'N/A'],
                  ['Premium', vehicle.premiumAmount != null ? formatCurrency(vehicle.premiumAmount, vehicle.currency) : 'N/A'],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Registration & Warranty">
              <dl className="space-y-3 text-sm">
                {[
                  ['Registration Expiry', vehicle.registrationExpiry ? new Date(vehicle.registrationExpiry).toLocaleDateString() : 'N/A'],
                  ['Warranty Expiry', vehicle.warrantyExpiry ? new Date(vehicle.warrantyExpiry).toLocaleDateString() : 'N/A'],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          {/* Cost Analysis */}
          <h3 className="text-lg font-semibold text-gray-900 mt-6">Cost Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="!p-4">
              <p className="text-2xl font-bold text-gray-900">{costData ? formatCurrency(costData.lifetimeCost, vehicle.currency) : '...'}</p>
              <p className="text-xs text-gray-500">Lifetime Service Cost</p>
            </Card>
            <Card className="!p-4">
              <p className="text-2xl font-bold text-gray-900">{costData ? costData.lifetimeServices : '...'}</p>
              <p className="text-xs text-gray-500">Total Services</p>
            </Card>
            <Card className="!p-4">
              <p className="text-2xl font-bold text-gray-900">{costData ? formatCurrency(costData.averageCostPerService, vehicle.currency) : '...'}</p>
              <p className="text-xs text-gray-500">Avg Cost / Service</p>
            </Card>
            <Card className="!p-4">
              <p className="text-2xl font-bold text-gray-900">{costData ? formatCurrency(costData.costPerKm, vehicle.currency) : '...'}</p>
              <p className="text-xs text-gray-500">Cost / km</p>
            </Card>
          </div>

          {/* Cost by Service Type */}
          <Card title="Cost by Service Type" className="mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Service Type</th>
                  <th className="px-4 py-3 text-left">Count</th>
                  <th className="px-4 py-3 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costData?.costByServiceType?.map((item: any) => (
                  <tr key={item.serviceType} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.serviceType}</td>
                    <td className="px-4 py-3">{item.count}</td>
                    <td className="px-4 py-3">{formatCurrency(item.totalCost, vehicle.currency)}</td>
                  </tr>
                ))}
                {(!costData?.costByServiceType || costData.costByServiceType.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No service cost data</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Monthly Cost Breakdown */}
          <Card title="Monthly Cost Breakdown" className="mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Month</th>
                  <th className="px-4 py-3 text-left">Services</th>
                  <th className="px-4 py-3 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costData?.monthlyBreakdown?.map((item: any) => (
                  <tr key={item.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.label}</td>
                    <td className="px-4 py-3">{item.serviceCount}</td>
                    <td className="px-4 py-3">{formatCurrency(item.totalCost, vehicle.currency)}</td>
                  </tr>
                ))}
                {(!costData?.monthlyBreakdown || costData.monthlyBreakdown.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No monthly cost data</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Cost by Driver */}
          <Card title="Cost by Driver" className="mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Driver</th>
                  <th className="px-4 py-3 text-left">Services</th>
                  <th className="px-4 py-3 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costData?.costByDriver?.map((item: any) => (
                  <tr key={item.driverId || 'unassigned'} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.driverName}</td>
                    <td className="px-4 py-3">{item.serviceCount}</td>
                    <td className="px-4 py-3">{formatCurrency(item.totalCost, vehicle.currency)}</td>
                  </tr>
                ))}
                {(!costData?.costByDriver || costData.costByDriver.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No driver cost data</td></tr>
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
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Start Date</th>
                <th className="px-4 py-3 text-left">End Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicle.assignments?.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.driver?.firstName} {a.driver?.lastName}</td>
                  <td className="px-4 py-3"><Badge color={a.status === 'ACTIVE' ? 'green' : 'gray'}>{a.status}</Badge></td>
                  <td className="px-4 py-3">{new Date(a.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{a.endDate ? new Date(a.endDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {(!vehicle.assignments || vehicle.assignments.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No assignments</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'services' && (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Service Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Cost</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicle.serviceRecords?.map((s: any) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.serviceType?.name || 'N/A'}</td>
                  <td className="px-4 py-3"><Badge color="blue">{s.status}</Badge></td>
                  <td className="px-4 py-3">{s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">{s.totalCostInclVat ? formatCurrency(s.totalCostInclVat, s.currency) : '-'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/services/${s.id}`} className="text-primary-600 hover:text-primary-800">View</Link>
                  </td>
                </tr>
              ))}
              {(!vehicle.serviceRecords || vehicle.serviceRecords.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No service records</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Vehicle" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Make" value={editForm.make || ''} onChange={(e) => setEditForm({ ...editForm, make: e.target.value })} />
            <Input label="Model" value={editForm.model || ''} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} />
            <Input label="Color" value={editForm.color || ''} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} />
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={editForm.status || ''}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="IN_SERVICE">In Service</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
              <option value="RETIRED">Retired</option>
            </select>
            <Select label="Currency" value={editForm.currency || 'ZAR'}
              onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
              options={CURRENCY_OPTIONS} />
          </div>
          <Input label="Notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" isLoading={updateVehicle.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Delete Vehicle" message={`Are you sure you want to delete ${vehicle.make} ${vehicle.model}?`} variant="danger" />
    </div>
  );
}
