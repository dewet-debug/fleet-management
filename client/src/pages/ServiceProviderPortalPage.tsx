import { useState } from 'react';
import { useServices, useTransitionService, useUpdateService } from '../hooks/useServices';
import { Card, Badge, Button, Input, Modal, Pagination, LoadingSpinner } from '../components/ui';
import { HiWrenchScrewdriver, HiCheck } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'gray' | 'blue' | 'purple' | 'yellow' | 'green'> = {
  DRAFT: 'gray', SCHEDULED: 'blue', AUTHORIZED: 'purple', IN_PROGRESS: 'yellow',
  COMPLETED: 'green', APPROVED: 'green', RETURNED: 'gray',
};

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <HiWrenchScrewdriver className="text-2xl text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Service Provider Portal</h1>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Service Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{s.vehicle?.licensePlate} - {s.vehicle?.make} {s.vehicle?.model}</td>
                    <td className="px-4 py-3">{s.serviceType?.name}</td>
                    <td className="px-4 py-3"><Badge color={statusColors[s.status]}>{s.status.replace('_', ' ')}</Badge></td>
                    <td className="px-4 py-3 max-w-xs truncate">{s.description}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedService(s); setNotes(s.technicianNotes || ''); }}>
                        Details
                      </Button>
                      {s.status === 'IN_PROGRESS' && (
                        <Button size="sm" onClick={() => handleComplete(s.id)}>
                          <HiCheck className="mr-1" /> Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedService} onClose={() => setSelectedService(null)} title="Service Details" size="lg">
        {selectedService && (
          <div className="space-y-4">
            <Card>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Vehicle</dt><dd>{selectedService.vehicle?.make} {selectedService.vehicle?.model}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd>{selectedService.serviceType?.name}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><Badge color={statusColors[selectedService.status]}>{selectedService.status}</Badge></dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Description</dt><dd className="max-w-xs text-right">{selectedService.description}</dd></div>
              </dl>
            </Card>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technician Notes</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={4}
                value={notes} onChange={(e) => setNotes(e.target.value)} />
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
