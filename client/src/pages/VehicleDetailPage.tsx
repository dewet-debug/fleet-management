import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useVehicle, useUpdateVehicle, useDeleteVehicle, useUpdateKilometers, useVehicleCosts } from '../hooks/useVehicles';
import { useBoltTrips } from '../hooks/useBolt';
import type { BoltTrip } from '../api/bolt';
import { Card, Stat, Badge, StatusBadge, Table, Button, Input, Select, Modal, ConfirmDialog, LoadingSpinner } from '../components/ui';
import { HiOutlineArrowLeft, HiPencil, HiTrash } from 'react-icons/hi2';
import { formatCurrency, CURRENCY_OPTIONS } from '../utils/currency';
import { zar, km, int } from '../theme/format';
import toast from 'react-hot-toast';

/** label–value row for the Overview info blocks */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right font-mono text-sm text-ink-strong">{value ?? '—'}</dd>
    </div>
  );
}

/** Signal-styled cost table (mono numbers, sunken header, hairline dividers) */
function DataTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-paper-hair bg-paper-sunken font-mono text-meta uppercase tracking-wide text-ink-ghost">
            {headers.map((h, i) => (
              <th key={i} className={clsx('px-4 py-2.5 font-normal', i > 0 ? 'text-right' : 'text-left')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-ink-faint">{empty}</td></tr>
          )}
          {rows.map((cells, ri) => (
            <tr key={ri} className="border-b border-paper-hair last:border-0 hover:bg-paper-sunken">
              {cells.map((c, ci) => (
                <td key={ci} className={clsx('px-4 py-3', ci > 0 ? 'text-right font-mono text-ink-strong' : 'text-ink-body')}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fmtDate = (val?: string | null) => (val ? new Date(val).toLocaleDateString() : '—');

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

  const { data: boltTrips } = useBoltTrips({ search: vehicle?.licensePlate, limit: 6 });

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
  if (!vehicle) return <p className="py-12 text-center text-ink-faint">Vehicle not found</p>;

  const v = vehicle as any;

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateVehicle.mutateAsync({ id: id!, data: editForm });
      setShowEdit(false);
    } catch {
      // Toast is handled by the useUpdateVehicle hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVehicle.mutateAsync(id!);
      navigate('/vehicles');
    } catch {
      // Toast is handled by the useDeleteVehicle hook
    }
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

  const money = (amount: number | null | undefined) =>
    amount != null ? formatCurrency(amount, v.currency) : '—';

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start gap-4">
        <Link to="/vehicles" className="mt-1 text-ink-muted hover:text-ink">
          <HiOutlineArrowLeft className="text-xl" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink">
            {v.make} {v.model} <span className="font-mono text-ink-muted">{v.year}</span>
          </h1>
          <p className="font-mono text-xs text-ink-faint">{v.licensePlate} · VIN {v.vin}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind="vehicle" value={v.status} />
          <Button variant="secondary" size="sm" onClick={() => { setEditForm(vehicle); setShowEdit(true); }}>
            <HiPencil /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <HiTrash /> Delete
          </Button>
        </div>
      </div>

      {/* tab bar */}
      <div className="border-b border-paper-line">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                '-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-ink-muted hover:text-ink-body'
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Identity">
              <dl className="divide-y divide-paper-hair">
                <Field label="Color" value={v.color || '—'} />
                <Field label="Fuel type" value={v.fuelType || '—'} />
                <Field label="Odometer" value={v.currentKilometers != null ? `${int(v.currentKilometers)} km` : '—'} />
                <Field label="Purchase date" value={fmtDate(v.purchaseDate)} />
                <Field label="Purchase price" value={money(v.purchasePrice)} />
              </dl>
            </Card>
            <Card title="Lease">
              <dl className="divide-y divide-paper-hair">
                <Field label="Fleet number" value={v.fleetNumber || '—'} />
                <Field label="Lease company" value={v.leaseCompany || '—'} />
                <Field label="Agreement no" value={v.leaseAgreementNo || '—'} />
                <Field label="Start" value={fmtDate(v.leaseStartDate)} />
                <Field label="End" value={fmtDate(v.leaseEndDate)} />
                <Field label="Monthly cost" value={money(v.monthlyLeaseCost)} />
                <Field label="Book value" value={money(v.currentBookValue)} />
              </dl>
            </Card>
            <Card title="Insurance">
              <dl className="divide-y divide-paper-hair">
                <Field label="Provider" value={v.insuranceProvider || '—'} />
                <Field label="Policy no" value={v.insurancePolicyNo || '—'} />
                <Field label="Coverage" value={v.coverageType || '—'} />
                <Field label="Start" value={fmtDate(v.policyStartDate)} />
                <Field label="Expiry" value={fmtDate(v.policyExpiryDate)} />
                <Field label="Premium" value={money(v.premiumAmount)} />
              </dl>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card title="Update Kilometers">
              <div className="flex gap-2">
                <Input type="number" placeholder="New kilometers" value={kilometers} onChange={(e) => setKilometers(e.target.value)} />
                <Button onClick={handleKilometersUpdate} isLoading={updateKilometers.isPending}>Update</Button>
              </div>
            </Card>
            <Card title="Notes">
              <p className="text-sm text-ink-body">{v.notes || <span className="text-ink-faint">No notes recorded.</span>}</p>
            </Card>
          </div>

          <Card title="Recent Bolt trips" subtitle={v.licensePlate} bodyClassName="p-0">
            <Table<BoltTrip>
              columns={[
                { key: 'created', header: 'Created' },
                { key: 'driver', header: 'Driver' },
                { key: 'status', header: 'Status' },
                { key: 'distance', header: 'Distance', className: 'text-right' },
                { key: 'gross', header: 'Gross', className: 'text-right' },
              ]}
              template="150px 1fr 128px 96px 96px"
              rows={boltTrips?.data ?? []}
              emptyMessage="No Bolt trips for this vehicle."
              renderCell={(t, key) => {
                switch (key) {
                  case 'created':
                    return <span className="font-mono text-xs text-ink-muted">{new Date(t.orderCreatedAt).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>;
                  case 'driver':
                    return <span className="truncate text-sm text-ink-body">{t.driverName || '—'}</span>;
                  case 'status':
                    return <StatusBadge kind="bolt" value={t.orderStatus} />;
                  case 'distance':
                    return <span className="font-mono text-xs text-ink-body">{t.rideDistanceMeters != null ? km(t.rideDistanceMeters) : '—'}</span>;
                  case 'gross':
                    return <span className="font-mono text-xs text-ink-strong">{t.ridePrice != null ? zar(t.ridePrice) : '—'}</span>;
                  default:
                    return null;
                }
              }}
            />
          </Card>
        </div>
      )}

      {/* FINANCIALS */}
      {tab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Lease Information">
              <dl className="divide-y divide-paper-hair">
                <Field label="Fleet number" value={v.fleetNumber || '—'} />
                <Field label="Lease company" value={v.leaseCompany || '—'} />
                <Field label="Agreement no" value={v.leaseAgreementNo || '—'} />
                <Field label="Lease start" value={fmtDate(v.leaseStartDate)} />
                <Field label="Lease end" value={fmtDate(v.leaseEndDate)} />
                <Field label="Monthly cost" value={money(v.monthlyLeaseCost)} />
                <Field label="Book value" value={money(v.currentBookValue)} />
              </dl>
            </Card>
            <Card title="Insurance">
              <dl className="divide-y divide-paper-hair">
                <Field label="Provider" value={v.insuranceProvider || '—'} />
                <Field label="Policy no" value={v.insurancePolicyNo || '—'} />
                <Field label="Coverage" value={v.coverageType || '—'} />
                <Field label="Policy start" value={fmtDate(v.policyStartDate)} />
                <Field label="Policy expiry" value={fmtDate(v.policyExpiryDate)} />
                <Field label="Premium" value={money(v.premiumAmount)} />
              </dl>
            </Card>
            <Card title="Registration & Warranty">
              <dl className="divide-y divide-paper-hair">
                <Field label="Registration expiry" value={fmtDate(v.registrationExpiry)} />
                <Field label="Warranty expiry" value={fmtDate(v.warrantyExpiry)} />
              </dl>
            </Card>
          </div>

          {/* Cost Analysis KPIs */}
          <Card title="Cost Analysis" bodyClassName="p-0">
            <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair md:grid-cols-4 md:divide-y-0">
              <Stat label="Lifetime cost" value={costData ? formatCurrency(costData.lifetimeCost, v.currency) : '—'} />
              <Stat label="Total services" value={costData ? int(costData.lifetimeServices) : '—'} />
              <Stat label="Avg cost / service" value={costData ? formatCurrency(costData.averageCostPerService, v.currency) : '—'} />
              <Stat label="Cost per km" value={costData ? formatCurrency(costData.costPerKm, v.currency) : '—'} />
            </div>
          </Card>

          <Card title="Cost by Service Type" bodyClassName="p-0">
            <DataTable
              headers={['Service Type', 'Count', 'Total Cost']}
              empty="No service cost data"
              rows={(costData?.costByServiceType ?? []).map((item: any) => [
                item.serviceType,
                int(item.count),
                formatCurrency(item.totalCost, v.currency),
              ])}
            />
          </Card>

          <Card title="Monthly Cost Breakdown" bodyClassName="p-0">
            <DataTable
              headers={['Month', 'Services', 'Total Cost']}
              empty="No monthly cost data"
              rows={(costData?.monthlyBreakdown ?? []).map((item: any) => [
                item.label,
                int(item.serviceCount),
                formatCurrency(item.totalCost, v.currency),
              ])}
            />
          </Card>

          <Card title="Cost by Driver" bodyClassName="p-0">
            <DataTable
              headers={['Driver', 'Services', 'Total Cost']}
              empty="No driver cost data"
              rows={(costData?.costByDriver ?? []).map((item: any) => [
                item.driverName,
                int(item.serviceCount),
                formatCurrency(item.totalCost, v.currency),
              ])}
            />
          </Card>
        </div>
      )}

      {/* ASSIGNMENTS */}
      {tab === 'assignments' && (
        <Table<any>
          columns={[
            { key: 'driver', header: 'Driver' },
            { key: 'status', header: 'Status' },
            { key: 'start', header: 'Start' },
            { key: 'end', header: 'End' },
          ]}
          template="1fr 140px 150px 150px"
          rows={v.assignments ?? []}
          emptyMessage="No assignments"
          renderCell={(a, key) => {
            switch (key) {
              case 'driver':
                return <span className="text-sm text-ink-body">{a.driver?.firstName} {a.driver?.lastName}</span>;
              case 'status':
                return a.status === 'ACTIVE'
                  ? <Badge tone="success">Active</Badge>
                  : <Badge tone="neutral">{a.status}</Badge>;
              case 'start':
                return <span className="font-mono text-xs text-ink-body">{fmtDate(a.startDate)}</span>;
              case 'end':
                return <span className="font-mono text-xs text-ink-body">{fmtDate(a.endDate)}</span>;
              default:
                return null;
            }
          }}
        />
      )}

      {/* SERVICE HISTORY */}
      {tab === 'services' && (
        <Table<any>
          columns={[
            { key: 'type', header: 'Service Type' },
            { key: 'status', header: 'Status' },
            { key: 'date', header: 'Date' },
            { key: 'cost', header: 'Cost', className: 'text-right' },
            { key: 'view', header: '', className: 'text-right' },
          ]}
          template="1fr 150px 140px 140px 80px"
          rows={v.serviceRecords ?? []}
          emptyMessage="No service records"
          renderCell={(s, key) => {
            switch (key) {
              case 'type':
                return <span className="text-sm text-ink-body">{s.serviceType?.name || '—'}</span>;
              case 'status':
                return <StatusBadge kind="service" value={s.status} />;
              case 'date':
                return <span className="font-mono text-xs text-ink-body">{fmtDate(s.scheduledDate)}</span>;
              case 'cost':
                return <span className="font-mono text-xs text-ink-strong">{s.totalCostInclVat != null ? formatCurrency(s.totalCostInclVat, s.currency) : '—'}</span>;
              case 'view':
                return <Link to={`/services/${s.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-800">View</Link>;
              default:
                return null;
            }
          }}
        />
      )}

      {/* Edit modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Vehicle" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Make" value={editForm.make || ''} onChange={(e) => setEditForm({ ...editForm, make: e.target.value })} />
            <Input label="Model" value={editForm.model || ''} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} />
            <Input label="Color" value={editForm.color || ''} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} />
            <Select
              label="Status"
              value={editForm.status || ''}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'IN_SERVICE', label: 'In Service' },
                { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
                { value: 'RETIRED', label: 'Retired' },
              ]}
            />
            <Select label="Currency" value={editForm.currency || 'ZAR'}
              onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
              options={CURRENCY_OPTIONS} />
            <Input
              label="Monthly lease cost"
              type="number"
              value={editForm.monthlyLeaseCost ?? ''}
              onChange={(e) => setEditForm({ ...editForm, monthlyLeaseCost: e.target.value === '' ? null : Number(e.target.value) })}
            />
            <Input
              label="Insurance premium (monthly)"
              type="number"
              value={editForm.premiumAmount ?? ''}
              onChange={(e) => setEditForm({ ...editForm, premiumAmount: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
          <Input label="Notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" isLoading={updateVehicle.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Delete Vehicle" message={`Are you sure you want to delete ${v.make} ${v.model}?`} variant="danger" />
    </div>
  );
}
