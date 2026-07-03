import { useState, useRef } from 'react';
import { Card, Badge, Button, LoadingSpinner, Table } from '../components/ui';
import {
  HiOutlineArrowUpTray,
  HiOutlineArrowDownTray,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
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

const ERROR_COLUMNS = [
  { key: 'row', header: 'Row' },
  { key: 'field', header: 'Field' },
  { key: 'message', header: 'Error' },
];
const ERROR_TEMPLATE = '72px 160px 1fr';

export default function BulkUploadPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('vehicles');
  const [results, setResults] = useState<Record<string, BulkUploadResult | null>>({});
  const [dragging, setDragging] = useState(false);
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

  const processFile = async (file: File) => {
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
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
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
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Bulk Upload</h1>
          <p className="font-mono text-xs text-ink-faint">Import fleet records from Excel · .xlsx</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-control border border-paper-line bg-paper-card p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-[6px] px-4 py-1.5 text-sm font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-primary-50 text-primary-700' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upload Area */}
        <div className="space-y-4 lg:col-span-2">
          <Card
            title={`Upload ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            actions={
              <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                <HiOutlineArrowDownTray className="mr-1" /> Download Template
              </Button>
            }
          >
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-card border-2 border-dashed p-8 text-center transition-colors ${
                  dragging
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-paper-line bg-paper-sunken hover:border-primary-500'
                }`}
              >
                <HiOutlineArrowUpTray className="mx-auto mb-3 text-4xl text-ink-ghost" />
                <p className="mb-1 text-sm text-ink-body">
                  Drop an Excel file here, or click to browse
                </p>
                <p className="font-mono text-xs text-ink-faint">
                  .xlsx / .xls with your {activeTab} data
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUpload}
                  className="hidden"
                  id="bulk-upload"
                />
                <div className="mt-4">
                  <Button
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                    isLoading={currentMutation.isPending}
                  >
                    <HiOutlineArrowUpTray className="mr-1" /> Select File
                  </Button>
                </div>
              </div>

              {currentMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <LoadingSpinner size="sm" /> Processing upload…
                </div>
              )}
            </div>
          </Card>

          {/* Results */}
          {currentResult && (
            <Card title="Upload Results">
              <div className="space-y-4">
                <div className="grid grid-cols-3 divide-x divide-paper-hair rounded-card border border-paper-line">
                  <div className="flex flex-col gap-1.5 px-4 py-3.5">
                    <span className="font-mono text-meta uppercase text-ink-ghost">Total</span>
                    <span className="font-mono text-stat font-semibold text-ink-strong">{currentResult.total}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-4 py-3.5">
                    <span className="font-mono text-meta uppercase text-ink-ghost">Success</span>
                    <span className="font-mono text-stat font-semibold text-success">{currentResult.success}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-4 py-3.5">
                    <span className="font-mono text-meta uppercase text-ink-ghost">Failed</span>
                    <span className="font-mono text-stat font-semibold text-danger">{currentResult.failed}</span>
                  </div>
                </div>

                {currentResult.success > 0 && currentResult.failed === 0 && (
                  <div className="flex items-center gap-2 rounded-control bg-success-bg px-3 py-3 text-sm text-success">
                    <HiOutlineCheckCircle className="text-lg" />
                    All rows imported successfully!
                  </div>
                )}

                {currentResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-danger">
                      <HiOutlineExclamationTriangle /> {currentResult.errors.length} error(s) found
                    </div>
                    <Table<{ id: number; row: number; field?: string; message: string }>
                      columns={ERROR_COLUMNS}
                      template={ERROR_TEMPLATE}
                      rows={currentResult.errors.map((err, idx) => ({ id: idx, ...err }))}
                      emptyMessage="No errors."
                      renderCell={(err, key) => {
                        switch (key) {
                          case 'row':
                            return (
                              <span className="inline-flex items-center gap-1.5">
                                <HiOutlineXCircle className="text-danger" />
                                <span className="font-mono text-xs text-ink-body">{err.row}</span>
                              </span>
                            );
                          case 'field':
                            return err.field
                              ? <Badge tone="danger">{err.field}</Badge>
                              : <span className="text-ink-faint">—</span>;
                          case 'message':
                            return <span className="text-sm text-ink-body">{err.message}</span>;
                          default:
                            return null;
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Column Reference */}
        <div>
          <Card title="Column Reference">
            <div className="space-y-3">
              <div>
                <p className="mb-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">Required Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.required.map((col) => (
                    <Badge key={col} tone="danger" dot={false}>{col}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">Optional Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.optional.map((col) => (
                    <Badge key={col} tone="neutral" dot={false}>{col}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {(activeTab === 'services' || activeTab === 'assignments') && (
              <div className="mt-4 rounded-control bg-info-bg px-3 py-3 text-sm text-info">
                <p className="mb-1 font-semibold">Lookup Columns</p>
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
