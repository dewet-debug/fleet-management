import { useState, useRef, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useService, useTransitionService } from '../hooks/useServices';
import { Card, Stat, Badge, StatusBadge, Button, Input, Modal, LoadingSpinner } from '../components/ui';
import { HiOutlineArrowLeft, HiCamera, HiTrash, HiArrowRight, HiCheck } from 'react-icons/hi2';
import { uploadPhoto, deletePhoto } from '../api/uploads';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../utils/currency';
import { zarExact } from '../theme/format';
import { SERVICE_ORDER, SERVICE_STATUS } from '../theme/status';
import toast from 'react-hot-toast';

const TRANSITIONS: Record<string, { action: string; label: string }[]> = {
  DRAFT: [{ action: 'SCHEDULE', label: 'Schedule' }],
  SCHEDULED: [{ action: 'AUTHORIZE', label: 'Authorize' }],
  AUTHORIZED: [{ action: 'START', label: 'Start Work' }],
  IN_PROGRESS: [{ action: 'COMPLETE', label: 'Complete' }],
  COMPLETED: [{ action: 'APPROVE', label: 'Approve' }],
  APPROVED: [{ action: 'RETURN', label: 'Return Vehicle' }],
};

const PHOTO_SLOTS: [string, string][] = [
  ['BEFORE_SERVICE', 'Before'],
  ['DURING_SERVICE', 'During'],
  ['AFTER_SERVICE', 'After'],
  ['DAMAGE', 'Damage'],
];

const fmtDate = (val?: string | null) => (val ? new Date(val).toLocaleDateString() : '—');
const fmtDateTime = (val?: string | null) => (val ? new Date(val).toLocaleString() : '—');

/** label–value row (Signal): muted label, mono value. */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="max-w-[60%] text-right font-mono text-sm text-ink-strong">{value ?? '—'}</dd>
    </div>
  );
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: service, isLoading } = useService(id!);
  const transitionService = useTransitionService();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'details' | 'photos' | 'history'>('details');
  const [transitionModal, setTransitionModal] = useState<{ action: string; label: string } | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState('GENERAL');
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
  if (!service) return <p className="py-12 text-center text-ink-faint">Service record not found</p>;

  const handleTransition = async () => {
    if (!transitionModal) return;
    try {
      await transitionService.mutateAsync({
        id: id!, data: { action: transitionModal.action, notes: transitionNotes },
      });
      toast.success(`Status changed to ${transitionModal.label}`);
      setTransitionModal(null);
      setTransitionNotes('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Transition failed'); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadPhoto(id!, file, photoType, photoCaption);
      toast.success('Photo uploaded');
      queryClient.invalidateQueries({ queryKey: ['services', id] });
      setPhotoCaption('');
    } catch (err: any) { toast.error('Upload failed'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
      toast.success('Photo deleted');
      queryClient.invalidateQueries({ queryKey: ['services', id] });
    } catch { toast.error('Failed to delete photo'); }
  };

  const availableTransitions = TRANSITIONS[service.status] || [];
  const isReturned = service.status === 'RETURNED';
  const currentIndex = isReturned ? SERVICE_ORDER.length : SERVICE_ORDER.indexOf(service.status as any);

  const stepTimes: Record<string, string | null | undefined> = {
    DRAFT: service.createdAt,
    SCHEDULED: service.scheduledDate,
    AUTHORIZED: service.authorizedAt,
    IN_PROGRESS: service.startedAt,
    COMPLETED: service.completedAt,
    APPROVED: service.approvedAt,
  };

  const hasPhotos = Array.isArray(service.photos) && service.photos.length > 0;
  const cur = service.currency;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start gap-4">
        <Link to="/services" className="mt-1 text-ink-muted hover:text-ink"><HiOutlineArrowLeft className="text-xl" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink">
            {service.serviceType?.name} <span className="text-ink-muted">·</span> {service.vehicle?.make} {service.vehicle?.model}
          </h1>
          <p className="font-mono text-xs text-ink-faint">{service.vehicle?.licensePlate} · ID {service.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind="service" value={service.status} />
          {availableTransitions.map((t) => (
            <Button key={t.action} size="sm" onClick={() => setTransitionModal(t)}>
              <HiArrowRight /> {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* workflow stepper */}
      <Card title="Workflow" actions={isReturned ? <Badge tone="danger">Returned</Badge> : undefined}>
        <div className="flex items-start overflow-x-auto">
          {SERVICE_ORDER.map((step, i) => {
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future';
            const ts = stepTimes[step];
            return (
              <Fragment key={step}>
                {i > 0 && (
                  <div className={clsx('mt-[13px] h-0.5 min-w-[24px] flex-1', i <= currentIndex ? 'bg-success' : 'bg-paper-line')} />
                )}
                <div className="flex min-w-[92px] flex-col items-center gap-1.5 px-1 text-center">
                  <div
                    className={clsx(
                      'flex h-7 w-7 items-center justify-center rounded-pill border-2 text-xs font-bold',
                      state === 'done' && 'border-success bg-success text-white',
                      state === 'current' && 'border-primary-500 bg-primary-50 text-primary-700',
                      state === 'future' && 'border-paper-line text-ink-faint'
                    )}
                  >
                    {state === 'done' ? <HiCheck /> : i + 1}
                  </div>
                  <span className={clsx('text-xs font-semibold', state === 'future' ? 'text-ink-faint' : 'text-ink-body')}>
                    {SERVICE_STATUS[step].label}
                  </span>
                  {ts && <span className="font-mono text-meta text-ink-ghost">{fmtDate(ts)}</span>}
                </div>
              </Fragment>
            );
          })}
        </div>
      </Card>

      {/* cost breakdown */}
      <Card title="Cost Breakdown" bodyClassName="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair md:grid-cols-4 md:divide-y-0">
          <Stat label="Labour" value={service.laborCost != null ? zarExact(service.laborCost) : '—'} />
          <Stat label="Parts" value={service.partsCost != null ? zarExact(service.partsCost) : '—'} />
          <Stat label="VAT" value={service.vatAmount != null ? zarExact(service.vatAmount) : '—'} />
          <Stat
            label="Total incl. VAT"
            value={service.totalCostInclVat != null ? zarExact(service.totalCostInclVat) : '—'}
            valueClassName="text-success"
          />
        </div>
      </Card>

      {/* photo slots */}
      {hasPhotos && (
        <Card title="Photos">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {PHOTO_SLOTS.map(([type, label]) => {
              const photo = service.photos?.find((p: any) => p.type === type);
              return (
                <div key={type} className="space-y-1.5">
                  <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">{label}</span>
                  {photo ? (
                    <img src={photo.url} alt={photo.caption || label} className="h-32 w-full rounded-control border border-paper-hair object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-control border border-dashed border-paper-line text-xs text-ink-faint">
                      No photo
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* tab bar */}
      <div className="border-b border-paper-line">
        <nav className="flex gap-6">
          {(['details', 'photos', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                '-mb-px border-b-2 px-1 pb-3 text-sm font-medium capitalize transition-colors',
                tab === t ? 'border-primary-500 text-primary-700' : 'border-transparent text-ink-muted hover:text-ink-body'
              )}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'details' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Service Information">
            <dl className="divide-y divide-paper-hair">
              <Field label="Description" value={service.description} />
              <Field label="Service Type" value={service.serviceType?.name} />
              <Field label="Provider" value={service.serviceProvider?.name || '—'} />
              <Field label="Scheduled Date" value={fmtDate(service.scheduledDate)} />
              <Field label="Labor Cost" value={service.laborCost != null ? formatCurrency(service.laborCost, cur) : '—'} />
              <Field label="Parts Cost" value={service.partsCost != null ? formatCurrency(service.partsCost, cur) : '—'} />
              <Field label="Additional Charges" value={service.additionalCharges != null ? formatCurrency(service.additionalCharges, cur) : '—'} />
              <Field label="Subtotal (excl. VAT)" value={service.totalCostExclVat != null ? formatCurrency(service.totalCostExclVat, cur) : '—'} />
              <Field label="VAT" value={service.vatAmount != null ? formatCurrency(service.vatAmount, cur) : '—'} />
              <Field label="Total (incl. VAT)" value={service.totalCostInclVat != null ? formatCurrency(service.totalCostInclVat, cur) : '—'} />
              <Field label="Invoice #" value={service.invoiceNumber || '—'} />
              <Field label="Payment Method" value={service.paymentMethod || '—'} />
              <Field label="Warranty Claim" value={service.isWarrantyClaim ? 'Yes' : 'No'} />
              <Field label="Assigned Driver" value={service.driver ? `${service.driver.firstName} ${service.driver.lastName}` : '—'} />
              <Field label="Kilometers at Service" value={service.kilometersAtService ? `${service.kilometersAtService.toLocaleString()} km` : '—'} />
            </dl>
          </Card>
          <div className="space-y-4">
            <Card title="Condition & Notes">
              <dl className="divide-y divide-paper-hair">
                <Field label="Condition Before" value={service.conditionBefore || '—'} />
                <Field label="Condition After" value={service.conditionAfter || '—'} />
                <Field label="Technician Notes" value={service.technicianNotes || '—'} />
                <Field label="Internal Notes" value={service.internalNotes || '—'} />
              </dl>
            </Card>
            <Card title="Timeline">
              <dl className="divide-y divide-paper-hair">
                {[
                  ['Created', service.createdAt, service.createdByUser],
                  ['Authorized', service.authorizedAt, service.authorizedByUser],
                  ['Started', service.startedAt, null],
                  ['Completed', service.completedAt, null],
                  ['Approved', service.approvedAt, service.approvedByUser],
                  ['Returned', service.returnedAt, null],
                ].filter(([, date]) => date).map(([label, date, user]: any) => (
                  <Field
                    key={label}
                    label={label}
                    value={`${fmtDateTime(date)}${user ? ` · ${user.firstName} ${user.lastName}` : ''}`}
                  />
                ))}
              </dl>
            </Card>
          </div>
        </div>
      )}

      {tab === 'photos' && (
        <div className="space-y-4">
          <Card title="Upload Photo">
            <div className="flex flex-wrap items-end gap-3">
              <select
                className="rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body focus:border-primary-400 focus:outline-none"
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value)}
              >
                {['GENERAL', 'BEFORE_SERVICE', 'DURING_SERVICE', 'AFTER_SERVICE', 'DAMAGE'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <Input placeholder="Caption (optional)" value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)} className="flex-1" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
              <Button onClick={() => fileInputRef.current?.click()} isLoading={uploading}>
                <HiCamera /> Upload
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {service.photos?.map((photo: any) => (
              <div key={photo.id} className="overflow-hidden rounded-card border border-paper-line bg-paper-card">
                <img src={photo.url} alt={photo.caption || 'Service photo'} className="h-40 w-full object-cover" />
                <div className="space-y-1 p-3">
                  <Badge tone="info">{photo.type.replace(/_/g, ' ')}</Badge>
                  {photo.caption && <p className="text-sm text-ink-body">{photo.caption}</p>}
                  <p className="font-mono text-xs text-ink-faint">
                    {photo.uploadedByUser?.firstName} {photo.uploadedByUser?.lastName}
                  </p>
                  <button onClick={() => handleDeletePhoto(photo.id)}
                    className="inline-flex items-center gap-1 text-sm text-danger hover:brightness-95">
                    <HiTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
            {(!service.photos || service.photos.length === 0) && (
              <p className="col-span-full py-8 text-center text-sm text-ink-faint">No photos uploaded</p>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <Card title="Status History">
          <div className="space-y-4">
            {service.statusHistory?.map((h: any) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-pill bg-primary-400" />
                <div>
                  <p className="font-medium text-ink">
                    {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                  </p>
                  <p className="font-mono text-xs text-ink-faint">
                    {fmtDateTime(h.createdAt)} · {h.changedByUser?.firstName} {h.changedByUser?.lastName}
                  </p>
                  {h.notes && <p className="mt-1 text-ink-body">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={!!transitionModal} onClose={() => setTransitionModal(null)}
        title={`${transitionModal?.label} Service`}>
        <div className="space-y-4">
          <p className="text-sm text-ink-body">
            Are you sure you want to change the status to <strong className="text-ink">{transitionModal?.label}</strong>?
          </p>
          <Input label="Notes (optional)" value={transitionNotes}
            onChange={(e) => setTransitionNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTransitionModal(null)}>Cancel</Button>
            <Button onClick={handleTransition} isLoading={transitionService.isPending}>
              Confirm {transitionModal?.label}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
