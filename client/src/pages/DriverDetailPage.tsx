import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useDriver, useUpdateDriver, useDeleteDriver, useDriverCosts } from '../hooks/useDrivers';
import { Card, Badge, StatusBadge, Table, Button, Input, Select, Modal, ConfirmDialog, LoadingSpinner } from '../components/ui';
import { HiOutlineArrowLeft, HiPencil, HiTrash } from 'react-icons/hi2';
import { formatCurrency } from '../utils/currency';
import { int } from '../theme/format';
import toast from 'react-hot-toast';

/** label–value row for info blocks (mono values) */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right font-mono text-sm text-ink-strong">{value ?? '—'}</dd>
    </div>
  );
}

const fmtDate = (val?: string | null) => (val ? new Date(val).toLocaleDateString() : '—');

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
  if (!driver) return <p className="py-12 text-center text-ink-faint">Driver not found</p>;

  const d = driver as any;

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

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'costs', label: 'Costs' },
    { key: 'assignments', label: 'Assignments' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start gap-4">
        <Link to="/drivers" className="mt-1 text-ink-muted hover:text-ink">
          <HiOutlineArrowLeft className="text-xl" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink">{d.firstName} {d.lastName}</h1>
          <p className="font-mono text-xs text-ink-faint">
            {d.employeeId || '—'} · {d.email} · {d.phone || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind="driver" value={d.status} />
          <Button variant="secondary" size="sm" onClick={() => { setEditForm(driver); setShowEdit(true); }}>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Driver Details">
            <dl className="divide-y divide-paper-hair">
              <Field label="Employee ID" value={d.employeeId || '—'} />
              <Field label="Phone" value={d.phone || '—'} />
              <Field label="Licence number" value={d.licenseNumber || '—'} />
              <Field label="Licence expiry" value={fmtDate(d.licenseExpiry)} />
              <Field label="Created" value={fmtDate(d.createdAt)} />
            </dl>
          </Card>
          <Card title="Notes">
            <p className="text-sm text-ink-body">
              {d.notes || <span className="text-ink-faint">No notes recorded.</span>}
            </p>
          </Card>
        </div>
      )}

      {/* COSTS */}
      {tab === 'costs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={costPeriod}
              onChange={(e) => setCostPeriod(e.target.value as 'weekly' | 'monthly')}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
            {costData && (
              <div className="text-sm text-ink-muted">
                Lifetime:{' '}
                <span className="font-mono font-semibold text-ink-strong">{formatCurrency(costData.lifetimeCost, 'ZAR')}</span>
                {' '}({int(costData.lifetimeServices)} services)
              </div>
            )}
          </div>

          <Card title="Service Cost by Period" bodyClassName="p-0">
            <Table<any>
              columns={[
                { key: 'period', header: 'Period' },
                { key: 'services', header: 'Services', className: 'text-right' },
                { key: 'cost', header: 'Total Cost', className: 'text-right' },
              ]}
              template="1fr 120px 150px"
              rows={(costData?.periods ?? []).map((p: any, idx: number) => ({ id: idx, ...p }))}
              emptyMessage="No service costs recorded"
              renderCell={(p, key) => {
                switch (key) {
                  case 'period':
                    return <span className="text-sm text-ink-body">{p.periodLabel}</span>;
                  case 'services':
                    return <span className="font-mono text-xs text-ink-body">{int(p.serviceCount)}</span>;
                  case 'cost':
                    return <span className="font-mono text-xs text-ink-strong">{formatCurrency(p.totalCost, 'ZAR')}</span>;
                  default:
                    return null;
                }
              }}
            />
          </Card>

          <Card title="Cost by Vehicle" bodyClassName="p-0">
            <Table<any>
              columns={[
                { key: 'vehicle', header: 'Vehicle' },
                { key: 'services', header: 'Services', className: 'text-right' },
                { key: 'cost', header: 'Total Cost', className: 'text-right' },
              ]}
              template="1fr 120px 150px"
              rows={(costData?.costByVehicle ?? []).map((item: any) => ({ id: item.vehicleId, ...item }))}
              emptyMessage="No vehicle cost data"
              renderCell={(item, key) => {
                switch (key) {
                  case 'vehicle':
                    return <span className="text-sm text-ink-body">{item.vehicleName}</span>;
                  case 'services':
                    return <span className="font-mono text-xs text-ink-body">{int(item.serviceCount)}</span>;
                  case 'cost':
                    return <span className="font-mono text-xs text-ink-strong">{formatCurrency(item.totalCost, 'ZAR')}</span>;
                  default:
                    return null;
                }
              }}
            />
          </Card>
        </div>
      )}

      {/* ASSIGNMENTS */}
      {tab === 'assignments' && (
        <Table<any>
          columns={[
            { key: 'vehicle', header: 'Vehicle' },
            { key: 'status', header: 'Status' },
            { key: 'start', header: 'Start' },
            { key: 'end', header: 'End' },
          ]}
          template="1fr 140px 150px 150px"
          rows={d.assignments ?? []}
          emptyMessage="No assignments"
          renderCell={(a, key) => {
            switch (key) {
              case 'vehicle':
                return (
                  <span className="text-sm text-ink-body">
                    {a.vehicle?.make} {a.vehicle?.model}{' '}
                    <span className="font-mono text-xs text-ink-faint">({a.vehicle?.licensePlate})</span>
                  </span>
                );
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

      {/* Edit modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Driver" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
            <Input label="Last Name" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
            <Input label="Phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="License Number" value={editForm.licenseNumber || ''} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} />
            <Select
              label="Status"
              value={editForm.status || ''}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]}
            />
          </div>
          <Input label="Notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" isLoading={updateDriver.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Delete Driver" message={`Are you sure you want to delete ${d.firstName} ${d.lastName}?`} variant="danger" />
    </div>
  );
}
