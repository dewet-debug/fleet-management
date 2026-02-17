import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useService, useTransitionService, useUpdateService } from '../hooks/useServices';
import { Card, Badge, Button, Input, Modal, LoadingSpinner } from '../components/ui';
import { HiArrowLeft, HiCamera, HiTrash, HiArrowRight } from 'react-icons/hi2';
import { uploadPhoto, deletePhoto } from '../api/uploads';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'gray' | 'blue' | 'purple' | 'yellow' | 'green'> = {
  DRAFT: 'gray', SCHEDULED: 'blue', AUTHORIZED: 'purple', IN_PROGRESS: 'yellow',
  COMPLETED: 'green', APPROVED: 'green', RETURNED: 'gray',
};

const TRANSITIONS: Record<string, { action: string; label: string; color: string }[]> = {
  DRAFT: [{ action: 'SCHEDULE', label: 'Schedule', color: 'bg-blue-600 hover:bg-blue-700' }],
  SCHEDULED: [{ action: 'AUTHORIZE', label: 'Authorize', color: 'bg-purple-600 hover:bg-purple-700' }],
  AUTHORIZED: [{ action: 'START', label: 'Start Work', color: 'bg-yellow-600 hover:bg-yellow-700' }],
  IN_PROGRESS: [{ action: 'COMPLETE', label: 'Complete', color: 'bg-green-600 hover:bg-green-700' }],
  COMPLETED: [{ action: 'APPROVE', label: 'Approve', color: 'bg-emerald-600 hover:bg-emerald-700' }],
  APPROVED: [{ action: 'RETURN', label: 'Return Vehicle', color: 'bg-gray-600 hover:bg-gray-700' }],
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: service, isLoading } = useService(id!);
  const transitionService = useTransitionService();
  const updateService = useUpdateService();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'details' | 'photos' | 'history'>('details');
  const [transitionModal, setTransitionModal] = useState<{ action: string; label: string } | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState('GENERAL');
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
  if (!service) return <p className="text-center text-gray-500 py-12">Service record not found</p>;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/services" className="text-gray-500 hover:text-gray-700"><HiArrowLeft className="text-xl" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {service.serviceType?.name} - {service.vehicle?.make} {service.vehicle?.model}
          </h1>
          <p className="text-gray-500">{service.vehicle?.licensePlate} &middot; ID: {service.id.slice(0, 8)}</p>
        </div>
        <Badge color={statusColors[service.status] || 'gray'}>{service.status.replace('_', ' ')}</Badge>
        {availableTransitions.map((t) => (
          <button key={t.action} onClick={() => setTransitionModal(t)}
            className={`${t.color} text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1`}>
            <HiArrowRight /> {t.label}
          </button>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(['details', 'photos', 'history'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </nav>
      </div>

      {tab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Service Information">
            <dl className="space-y-3 text-sm">
              {[
                ['Description', service.description],
                ['Service Type', service.serviceType?.name],
                ['Provider', service.serviceProvider?.name || 'N/A'],
                ['Scheduled Date', service.scheduledDate ? new Date(service.scheduledDate).toLocaleDateString() : 'N/A'],
                ['Labor Cost', service.laborCost != null ? formatCurrency(service.laborCost, service.currency) : 'N/A'],
                ['Parts Cost', service.partsCost != null ? formatCurrency(service.partsCost, service.currency) : 'N/A'],
                ['Additional Charges', service.additionalCharges != null ? formatCurrency(service.additionalCharges, service.currency) : 'N/A'],
                ['Subtotal (excl. VAT)', service.totalCostExclVat != null ? formatCurrency(service.totalCostExclVat, service.currency) : 'N/A'],
                ['VAT', service.vatAmount != null ? formatCurrency(service.vatAmount, service.currency) : 'N/A'],
                ['Total (incl. VAT)', service.totalCostInclVat != null ? formatCurrency(service.totalCostInclVat, service.currency) : 'N/A'],
                ['Invoice #', service.invoiceNumber || 'N/A'],
                ['Payment Method', service.paymentMethod || 'N/A'],
                ['Warranty Claim', service.isWarrantyClaim ? 'Yes' : 'No'],
                ['Assigned Driver', service.driver ? `${service.driver.firstName} ${service.driver.lastName}` : 'N/A'],
                ['Kilometers at Service', service.kilometersAtService ? `${service.kilometersAtService.toLocaleString()} km` : 'N/A'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Condition & Notes">
            <dl className="space-y-3 text-sm">
              {[
                ['Condition Before', service.conditionBefore || 'N/A'],
                ['Condition After', service.conditionAfter || 'N/A'],
                ['Technician Notes', service.technicianNotes || 'N/A'],
                ['Internal Notes', service.internalNotes || 'N/A'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900 max-w-xs text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Timeline">
            <dl className="space-y-3 text-sm">
              {[
                ['Created', service.createdAt, service.createdByUser],
                ['Authorized', service.authorizedAt, service.authorizedByUser],
                ['Started', service.startedAt, null],
                ['Completed', service.completedAt, null],
                ['Approved', service.approvedAt, service.approvedByUser],
                ['Returned', service.returnedAt, null],
              ].filter(([, date]) => date).map(([label, date, user]: any) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(date).toLocaleString()}
                    {user && ` by ${user.firstName} ${user.lastName}`}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {tab === 'photos' && (
        <div className="space-y-4">
          <Card title="Upload Photo">
            <div className="flex gap-3 items-end">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={photoType}
                onChange={(e) => setPhotoType(e.target.value)}>
                {['GENERAL', 'BEFORE_SERVICE', 'DURING_SERVICE', 'AFTER_SERVICE', 'DAMAGE'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <Input placeholder="Caption (optional)" value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)} className="flex-1" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload}
                className="hidden" id="photo-upload" />
              <Button onClick={() => fileInputRef.current?.click()} isLoading={uploading}>
                <HiCamera className="mr-1" /> Upload
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {service.photos?.map((photo: any) => (
              <div key={photo.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <img src={photo.url} alt={photo.caption || 'Service photo'} className="w-full h-40 object-cover" />
                <div className="p-3">
                  <Badge color="blue">{photo.type.replace(/_/g, ' ')}</Badge>
                  {photo.caption && <p className="text-sm text-gray-600 mt-1">{photo.caption}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {photo.uploadedByUser?.firstName} {photo.uploadedByUser?.lastName}
                  </p>
                  <button onClick={() => handleDeletePhoto(photo.id)}
                    className="mt-2 text-red-500 hover:text-red-700 text-sm inline-flex items-center gap-1">
                    <HiTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
            {(!service.photos || service.photos.length === 0) && (
              <p className="text-gray-500 text-sm col-span-full py-8 text-center">No photos uploaded</p>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <Card title="Status History">
          <div className="space-y-4">
            {service.statusHistory?.map((h: any) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">
                    {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                  </p>
                  <p className="text-gray-500">
                    {new Date(h.createdAt).toLocaleString()} by {h.changedByUser?.firstName} {h.changedByUser?.lastName}
                  </p>
                  {h.notes && <p className="text-gray-600 mt-1">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={!!transitionModal} onClose={() => setTransitionModal(null)}
        title={`${transitionModal?.label} Service`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to change the status to <strong>{transitionModal?.label}</strong>?
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
