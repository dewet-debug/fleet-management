import { useState } from 'react';
import { useServices, useTransitionService, useUpdateService } from '../hooks/useServices';
import { Card, Stat, StatusBadge, Button, Modal, Pagination, LoadingSpinner, Table } from '../components/ui';
import { HiCheck } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'type', header: 'Service Type' },
  { key: 'status', header: 'Status' },
  { key: 'description', header: 'Description' },
  { key: 'actions', header: 'Actions', className: 'text-right' },
];
const TEMPLATE = 'minmax(180px,1fr) 160px 128px minmax(200px,1.4fr) 180px';

export default function ServiceProviderPortalPage() {
  const [page, setPage] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useServices({ page, limit: 20 });
  const transitionService = useTransitionService();
  const updateService = useUpdateService();

  const handleUpdateNotes = async () => {
    if (!selectedService) return;
    try {
      await updateService.mutateAsync({ id: selectedService.id, data: { technicianNotes: notes } });
      toast.success('Notes updated');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleComplete = async (id: string) => {
    try {
      await transitionService.mutateAsync({ id, data: { action: 'COMPLETE', notes: 'Completed by service provider' } });
      toast.success('Service marked as completed');
      setSelectedService(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const rows = (data?.data ?? []) as any[];
  const inProgress = rows.filter((s) => s.status === 'IN_PROGRESS').length;
  const completed = rows.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Service Provider Portal</h1>
          <p className="font-mono text-xs text-ink-faint">Assigned work orders · service company view</p>
        </div>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          {/* KPI strip */}
          <Card bodyClassName="p-0">
            <div className="grid grid-cols-3 divide-x divide-paper-hair">
              <Stat label="On this page" value={rows.length} />
              <Stat label="In progress" value={inProgress} valueClassName="text-warning" />
              <Stat label="Completed" value={completed} valueClassName="text-success" />
            </div>
          </Card>

          <Table<any>
            columns={COLUMNS}
            template={TEMPLATE}
            rows={rows}
            emptyMessage="No service jobs assigned."
            renderCell={(s, key) => {
              switch (key) {
                case 'vehicle':
                  return (
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-ink-strong">{s.vehicle?.licensePlate || '—'}</p>
                      <p className="truncate text-xs text-ink-faint">{s.vehicle?.make} {s.vehicle?.model}</p>
                    </div>
                  );
                case 'type':
                  return <span className="text-sm text-ink-body">{s.serviceType?.name}</span>;
                case 'status':
                  return <StatusBadge kind="service" value={s.status} />;
                case 'description':
                  return <span className="block truncate text-sm text-ink-muted">{s.description}</span>;
                case 'actions':
                  return (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedService(s); setNotes(s.technicianNotes || ''); }}>
                        Details
                      </Button>
                      {s.status === 'IN_PROGRESS' && (
                        <Button size="sm" onClick={() => handleComplete(s.id)}>
                          <HiCheck className="mr-1" /> Complete
                        </Button>
                      )}
                    </div>
                  );
                default:
                  return null;
              }
            }}
          />
          {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedService} onClose={() => setSelectedService(null)} title="Service Details" size="lg">
        {selectedService && (
          <div className="space-y-4">
            <Card bodyClassName="p-4">
              <dl className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Vehicle</dt>
                  <dd className="font-mono text-ink-strong">{selectedService.vehicle?.make} {selectedService.vehicle?.model}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Type</dt>
                  <dd className="text-ink-body">{selectedService.serviceType?.name}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Status</dt>
                  <dd><StatusBadge kind="service" value={selectedService.status} /></dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Description</dt>
                  <dd className="max-w-xs text-right text-ink-body">{selectedService.description}</dd>
                </div>
              </dl>
            </Card>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-body">Technician Notes</label>
              <textarea
                className="w-full rounded-control border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink-body focus:border-primary-400 focus:outline-none"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button size="sm" className="mt-2" onClick={handleUpdateNotes} isLoading={updateService.isPending}>
                Save Notes
              </Button>
            </div>
            {selectedService.status === 'IN_PROGRESS' && (
              <Button className="w-full" onClick={() => handleComplete(selectedService.id)}
                isLoading={transitionService.isPending}>
                <HiCheck className="mr-1" /> Mark as Completed
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
