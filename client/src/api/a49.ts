import client from './client';

export interface A49Driver {
  id: string;
  externalId: string;
  company: string | null;
  licensePlate: string | null;
  vehicleType: string | null;
  vehicleStatus: string | null;
  driverFullName: string;
  driverPersonalCode: string | null;
  dateDriverAssigned: string | null;
  driverContactNumber: string | null;
  driverEmail: string | null;
  driverAddress: string | null;
  currentOdo: number | null;
  kmYesterday: number | null;
  kmMonthToDate: number | null;
  fetchedAt: string;
}

export interface A49JobCard {
  id: string;
  jobCardNumber: string;
  jobCardType: string | null;
  jobCardStatus: string | null;
  quotedTotalsExclVat: number | null;
  poTotalExclVat: number | null;
  poNumber: string | null;
  registrationNumber: string | null;
  associatedMake: string | null;
  associatedModel: string | null;
  lastRecordedOdo: number | null;
  currentOdo: number | null;
  insuranceRelated: boolean;
  associatedMerchant: string | null;
  jobCardOpenedDate: string | null;
  bookedInDate: string | null;
  dateQuoteSubmitted: string | null;
  poApprovedDate: string | null;
  dateRepairStarted: string | null;
  dateRepairCompleted: string | null;
  jobCardClosedDate: string | null;
  totalOemPartPriceExclVat: number | null;
  totalLabourHoursExclVat: number | null;
  totalLabourCostPerHourExclVat: number | null;
  fetchedAt: string;
}

export interface A49SyncLog {
  id: string;
  syncType: string;
  status: string;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsErrored: number;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface A49PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function syncA49All() {
  const { data } = await client.post('/a49/sync');
  return data;
}

export async function syncA49Drivers() {
  const { data } = await client.post('/a49/sync/drivers');
  return data;
}

export async function syncA49JobCards() {
  const { data } = await client.post('/a49/sync/job-cards');
  return data;
}

export async function fetchA49Drivers(params: { page?: number; limit?: number; search?: string }) {
  const { data } = await client.get<A49PaginatedResponse<A49Driver>>('/a49/drivers', { params });
  return data;
}

export async function fetchA49JobCards(params: { page?: number; limit?: number; status?: string; search?: string }) {
  const { data } = await client.get<A49PaginatedResponse<A49JobCard>>('/a49/job-cards', { params });
  return data;
}

export async function fetchA49SyncLogs(params: { page?: number; limit?: number; syncType?: string; status?: string }) {
  const { data } = await client.get<A49PaginatedResponse<A49SyncLog>>('/a49/sync-logs', { params });
  return data;
}
