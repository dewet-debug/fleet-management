import { useState, useRef } from 'react';
import { Card, Badge, Button, LoadingSpinner } from '../components/ui';
import {
  HiArrowUpTray,
  HiArrowDownTray,
  HiCheckCircle,
  HiXCircle,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import { useUploadVehicles, useUploadDrivers, useUploadServices, useUploadAssignments } from '../hooks/useBulkUpload';
import { getTemplateUrl, BulkUploadResult } from '../api/bulkUpload';
import toast from 'react-hot-toast';

const tabs = [
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'services', label: 'Services' },
  { key: 'assignments', label: 'Assignments' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const columnInfo: Record<TabKey, { required: string[]; optional: string[] }> = {
  vehicles: {
    required: ['vin', 'licensePlate', 'make', 'model', 'year', 'color', 'fuelType'],
    optional: ['currentKilometers', 'purchaseDate', 'purchasePrice', 'currency', 'notes', 'fleetNumber', 'leaseCompany', 'leaseAgreementNo', 'monthlyLeaseCost', 'currentBookValue', 'insuranceProvider', 'insurancePolicyNo', 'premiumAmount'],
  },
  drivers: {
    required: ['employeeId', 'firstName', 'lastName', 'email', 'licenseNumber', 'licenseExpiry'],
    optional: ['phone', 'notes'],
  },
  services: {
    required: ['licensePlate', 'serviceType', 'description'],
    optional: ['scheduledDate', 'laborCost', 'partsCost', 'vatAmount', 'totalCostExclVat', 'totalCostInclVat', 'invoiceNumber', 'currency'],
  },
  assignments: {
    required: ['licensePlate', 'employeeId', 'startDate'],
    optional: ['notes'],
  },
};

export default function BulkUploadPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('vehicles');
  const [results, setResults] = useState<Record<string, BulkUploadResult | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const vehiclesMutation = useUploadVehicles();
  const driversMutation = useUploadDrivers();
  const servicesMutation = useUploadServices();
  const assignmentsMutation = useUploadAssignments();

  const mutations: Record<TabKey, typeof vehiclesMutation> = {
    vehicles: vehiclesMutation,
    drivers: driversMutation,
    services: servicesMutation,
    assignments: assignmentsMutation,
  };

  const currentMutation = mutations[activeTab];
  const currentResult = results[activeTab] || null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await currentMutation.mutateAsync(file);
      setResults((prev) => ({ ...prev, [activeTab]: result }));
      if (result.failed === 0) {
        toast.success(`All ${result.success} ${activeTab} imported successfully`);
      } else {
        toast.error(`${result.failed} of ${result.total} rows failed`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const token = localStorage.getItem('accessToken');
    const url = getTemplateUrl(activeTab);
    const link = document.createElement('a');
    // Use fetch to include auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        link.href = URL.createObjectURL(blob);
        link.download = `${activeTab}-template.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch(() => toast.error('Failed to download template'));
  };

  const info = columnInfo[activeTab];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="!p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h2>
                <Button variant="secondary" onClick={handleDownloadTemplate}>
                  <HiArrowDownTray className="mr-1" /> Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiArrowUpTray className="mx-auto text-4xl text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-3">
                  Upload an Excel file (.xlsx) with your {activeTab} data
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUpload}
                  className="hidden"
                  id="bulk-upload"
                />
                <Button
                  onClick={() => fileRef.current?.click()}
                  isLoading={currentMutation.isPending}
                >
                  <HiArrowUpTray className="mr-1" /> Select File
                </Button>
              </div>

              {currentMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <LoadingSpinner size="sm" /> Processing upload...
                </div>
              )}
            </div>
          </Card>

          {/* Results */}
          {currentResult && (
            <Card className="!p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Results</h3>

              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Total:</span>
                  <span className="font-bold">{currentResult.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HiCheckCircle className="text-green-500" />
                  <span className="text-sm text-gray-500">Success:</span>
                  <span className="font-bold text-green-600">{currentResult.success}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HiXCircle className="text-red-500" />
                  <span className="text-sm text-gray-500">Failed:</span>
                  <span className="font-bold text-red-600">{currentResult.failed}</span>
                </div>
              </div>

              {currentResult.success > 0 && currentResult.failed === 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  <HiCheckCircle className="text-lg" />
                  All rows imported successfully!
                </div>
              )}

              {currentResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                    <HiExclamationTriangle /> {currentResult.errors.length} error(s) found
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Field</th>
                          <th className="px-3 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentResult.errors.map((err, idx) => (
                          <tr key={idx} className="text-red-700 bg-red-50">
                            <td className="px-3 py-2 font-mono">{err.row}</td>
                            <td className="px-3 py-2">{err.field || '-'}</td>
                            <td className="px-3 py-2">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Column Reference */}
        <div>
          <Card className="!p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Column Reference</h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Required Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.required.map((col) => (
                    <Badge key={col} color="red">{col}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Optional Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.optional.map((col) => (
                    <Badge key={col} color="gray">{col}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {(activeTab === 'services' || activeTab === 'assignments') && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-1">Lookup Columns</p>
                {activeTab === 'services' && (
                  <p><strong>licensePlate</strong> and <strong>serviceType</strong> are matched by name — use exact values from the system.</p>
                )}
                {activeTab === 'assignments' && (
                  <p><strong>licensePlate</strong> and <strong>employeeId</strong> are matched by value — use exact values from the system.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
