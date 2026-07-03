import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVehicles, useCreateVehicle } from '../hooks/useVehicles';
import type { Vehicle } from '../api/vehicles';
import { Button, Input, Select, StatusBadge, Table, Modal, Pagination, LoadingSpinner } from '../components/ui';
import { HiPlus, HiMagnifyingGlass } from 'react-icons/hi2';
import { CURRENCY_OPTIONS } from '../utils/currency';
import { int } from '../theme/format';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_SERVICE', label: 'In service' },
  { value: 'OUT_OF_SERVICE', label: 'Out of service' },
  { value: 'RETIRED', label: 'Retired' },
];

const COLUMNS = [
  { key: 'plate', header: 'Plate' },
  { key: 'model', header: 'Make / Model' },
  { key: 'fleet', header: 'Fleet no' },
  { key: 'status', header: 'Status' },
  { key: 'odometer', header: 'Odometer', className: 'text-right' },
  { key: 'driver', header: 'Driver' },
];
const TEMPLATE = '128px minmax(180px,1fr) 110px 132px 130px 170px';

const defaultForm = {
  vin: '', licensePlate: '', make: '', model: '', year: new Date().getFullYear(),
  color: '', fuelType: 'Gasoline', currentKilometers: 0, purchaseDate: '', purchasePrice: '',
  currency: 'ZAR', notes: '',
  fleetNumber: '', leaseCompany: '', leaseAgreementNo: '', monthlyLeaseCost: '',
  currentBookValue: '', insuranceProvider: '', insurancePolicyNo: '', premiumAmount: '',
};

export default function VehicleListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading, isFetching } = useVehicles({ page, limit: 1000, search, status: statusFilter || undefined });
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
      } as Partial<Vehicle>);
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
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Vehicles</h1>
          <p className="font-mono text-xs text-ink-faint">Fleet registry · vehicles &amp; assignments</p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Updating…</span>}
          <Button onClick={() => setShowModal(true)}>
            <HiPlus className="mr-1" /> Add vehicle
          </Button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <Input
            placeholder="Plate, make, model…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-72 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s.value;
            return (
              <button
                key={s.value || 'all'}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                className={`rounded-pill border px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-primary-200 bg-primary-50 text-primary-700'
                    : 'border-paper-line text-ink-muted hover:text-ink'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <>
          <Table<Vehicle>
            columns={COLUMNS}
            template={TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No vehicles found."
            onRowClick={(v) => navigate(`/vehicles/${v.id}`)}
            renderCell={(v, key) => {
              const driver = (v as any).assignments?.[0]?.driver;
              switch (key) {
                case 'plate':
                  return <span className="font-mono text-sm text-ink-strong">{v.licensePlate}</span>;
                case 'model':
                  return (
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-body">{v.make} {v.model}</p>
                      <p className="font-mono text-xs text-ink-faint">{v.year}</p>
                    </div>
                  );
                case 'fleet':
                  return <span className="font-mono text-xs text-ink-muted">{v.fleetNumber || '—'}</span>;
                case 'status':
                  return <StatusBadge kind="vehicle" value={v.status} />;
                case 'odometer':
                  return (
                    <span className="font-mono text-xs text-ink-body">
                      {v.currentKilometers != null ? `${int(v.currentKilometers)} km` : '—'}
                    </span>
                  );
                case 'driver':
                  return (
                    <span className="truncate text-sm text-ink-body">
                      {driver ? `${driver.firstName} ${driver.lastName}` : <span className="text-ink-faint">—</span>}
                    </span>
                  );
                default:
                  return null;
              }
            }}
          />

          {data?.meta && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-ink-faint">
                Showing {data.data.length ? (data.meta.page - 1) * data.meta.limit + 1 : 0}
                –{(data.meta.page - 1) * data.meta.limit + data.data.length} of {int(data.meta.total)}
              </p>
              {data.meta.totalPages > 1 && (
                <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
              )}
            </div>
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
          <details className="border border-paper-line rounded-control p-3">
            <summary className="text-sm font-medium text-ink-body cursor-pointer">Financial Details (optional)</summary>
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
