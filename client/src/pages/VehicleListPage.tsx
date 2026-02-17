import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVehicles, useCreateVehicle } from '../hooks/useVehicles';
import { Button, Input, Select, Badge, Modal, Pagination, LoadingSpinner } from '../components/ui';
import { HiPlus, HiEye } from 'react-icons/hi2';
import { CURRENCY_OPTIONS } from '../utils/currency';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  ACTIVE: 'green',
  IN_SERVICE: 'yellow',
  OUT_OF_SERVICE: 'red',
  RETIRED: 'gray',
};

const defaultForm = {
  vin: '', licensePlate: '', make: '', model: '', year: new Date().getFullYear(),
  color: '', fuelType: 'Gasoline', currentKilometers: 0, purchaseDate: '', purchasePrice: '',
  currency: 'ZAR', notes: '',
  fleetNumber: '', leaseCompany: '', leaseAgreementNo: '', monthlyLeaseCost: '',
  currentBookValue: '', insuranceProvider: '', insurancePolicyNo: '', premiumAmount: '',
};

export default function VehicleListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useVehicles({ page, limit: 20, search, status: statusFilter || undefined });
  const createVehicle = useCreateVehicle();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVehicle.mutateAsync({
        ...form,
        year: Number(form.year),
        currentKilometers: Number(form.currentKilometers),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        monthlyLeaseCost: form.monthlyLeaseCost ? Number(form.monthlyLeaseCost) : undefined,
        currentBookValue: form.currentBookValue ? Number(form.currentBookValue) : undefined,
        premiumAmount: form.premiumAmount ? Number(form.premiumAmount) : undefined,
      } as any);
      toast.success('Vehicle created');
      setShowModal(false);
      setForm(defaultForm);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create vehicle');
    }
  };

  const setField = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <Button onClick={() => setShowModal(true)}>
          <HiPlus className="mr-1" /> Add Vehicle
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'IN_SERVICE', label: 'In Service' },
            { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
            { value: 'RETIRED', label: 'Retired' },
          ]}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">License Plate</th>
                  <th className="px-4 py-3 text-left">Make / Model</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Kilometers</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{v.licensePlate}</td>
                    <td className="px-4 py-3">{v.make} {v.model}</td>
                    <td className="px-4 py-3">{v.year}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColors[v.status]}>{v.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">{v.currentKilometers?.toLocaleString()} km</td>
                    <td className="px-4 py-3">
                      <Link to={`/vehicles/${v.id}`} className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1">
                        <HiEye /> View
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No vehicles found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Vehicle" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="VIN" value={form.vin} onChange={(e) => setField('vin', e.target.value)} required />
            <Input label="License Plate" value={form.licensePlate} onChange={(e) => setField('licensePlate', e.target.value)} required />
            <Input label="Make" value={form.make} onChange={(e) => setField('make', e.target.value)} required />
            <Input label="Model" value={form.model} onChange={(e) => setField('model', e.target.value)} required />
            <Input label="Year" type="number" value={form.year} onChange={(e) => setField('year', e.target.value)} required />
            <Input label="Color" value={form.color} onChange={(e) => setField('color', e.target.value)} required />
            <Select label="Fuel Type" value={form.fuelType} onChange={(e) => setField('fuelType', e.target.value)}
              options={[{ value: 'Gasoline', label: 'Gasoline' }, { value: 'Diesel', label: 'Diesel' }, { value: 'Electric', label: 'Electric' }, { value: 'Hybrid', label: 'Hybrid' }]} />
            <Input label="Current Kilometers" type="number" value={form.currentKilometers} onChange={(e) => setField('currentKilometers', e.target.value)} />
            <Input label="Purchase Price" type="number" value={form.purchasePrice} onChange={(e) => setField('purchasePrice', e.target.value)} />
            <Select label="Currency" value={form.currency} onChange={(e) => setField('currency', e.target.value)}
              options={CURRENCY_OPTIONS} />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          <details className="border border-gray-200 rounded-lg p-3">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">Financial Details (optional)</summary>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Input label="Fleet Number" value={form.fleetNumber || ''} onChange={(e) => setField('fleetNumber', e.target.value)} />
              <Input label="Lease Company" value={form.leaseCompany || ''} onChange={(e) => setField('leaseCompany', e.target.value)} />
              <Input label="Agreement No." value={form.leaseAgreementNo || ''} onChange={(e) => setField('leaseAgreementNo', e.target.value)} />
              <Input label="Monthly Lease Cost" type="number" value={form.monthlyLeaseCost || ''} onChange={(e) => setField('monthlyLeaseCost', e.target.value)} />
              <Input label="Book Value" type="number" value={form.currentBookValue || ''} onChange={(e) => setField('currentBookValue', e.target.value)} />
              <Input label="Insurance Provider" value={form.insuranceProvider || ''} onChange={(e) => setField('insuranceProvider', e.target.value)} />
              <Input label="Policy No." value={form.insurancePolicyNo || ''} onChange={(e) => setField('insurancePolicyNo', e.target.value)} />
              <Input label="Premium Amount" type="number" value={form.premiumAmount || ''} onChange={(e) => setField('premiumAmount', e.target.value)} />
            </div>
          </details>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={createVehicle.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
