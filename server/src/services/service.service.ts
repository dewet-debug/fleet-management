import prisma from '../config/database';
import { parsePagination, paginatedResponse } from '../utils/pagination';
import { createAuditLog } from '../utils/audit';
import { BadRequestError, NotFoundError } from '../utils/errors';

const TRANSITIONS: Record<string, { action: string; to: string }[]> = {
  DRAFT: [{ action: 'SCHEDULE', to: 'SCHEDULED' }],
  SCHEDULED: [{ action: 'AUTHORIZE', to: 'AUTHORIZED' }],
  AUTHORIZED: [{ action: 'START', to: 'IN_PROGRESS' }],
  IN_PROGRESS: [{ action: 'COMPLETE', to: 'COMPLETED' }],
  COMPLETED: [{ action: 'APPROVE', to: 'APPROVED' }],
  APPROVED: [{ action: 'RETURN', to: 'RETURNED' }],
};

// Service Type Config
export async function listServiceTypes(query: any) {
  const { page, limit, skip } = parsePagination(query);
  const where: any = {};
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const [data, total] = await Promise.all([
    prisma.serviceTypeConfig.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.serviceTypeConfig.count({ where }),
  ]);
  return paginatedResponse(data, total, { page, limit, skip });
}

export async function createServiceType(data: any, userId: string) {
  const serviceType = await prisma.serviceTypeConfig.create({ data });
  await createAuditLog(prisma, userId, 'CREATE', 'ServiceTypeConfig', serviceType.id);
  return serviceType;
}

export async function updateServiceType(id: string, data: any, userId: string) {
  const serviceType = await prisma.serviceTypeConfig.update({ where: { id }, data });
  await createAuditLog(prisma, userId, 'UPDATE', 'ServiceTypeConfig', id);
  return serviceType;
}

export async function deleteServiceType(id: string, userId: string) {
  await prisma.serviceTypeConfig.update({ where: { id }, data: { isActive: false } });
  await createAuditLog(prisma, userId, 'DELETE', 'ServiceTypeConfig', id);
}

// Service Interval Config
export async function listServiceIntervals(query: any) {
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.serviceIntervalConfig.findMany({
      skip,
      take: limit,
      include: { serviceType: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceIntervalConfig.count(),
  ]);
  return paginatedResponse(data, total, { page, limit, skip });
}

export async function createServiceInterval(data: any, userId: string) {
  const interval = await prisma.serviceIntervalConfig.create({
    data,
    include: { serviceType: true },
  });
  await createAuditLog(prisma, userId, 'CREATE', 'ServiceIntervalConfig', interval.id);
  return interval;
}

export async function updateServiceInterval(id: string, data: any, userId: string) {
  const interval = await prisma.serviceIntervalConfig.update({
    where: { id },
    data,
    include: { serviceType: true },
  });
  await createAuditLog(prisma, userId, 'UPDATE', 'ServiceIntervalConfig', id);
  return interval;
}

export async function deleteServiceInterval(id: string, userId: string) {
  await prisma.serviceIntervalConfig.update({ where: { id }, data: { isActive: false } });
  await createAuditLog(prisma, userId, 'DELETE', 'ServiceIntervalConfig', id);
}

// Service Records
export async function listServiceRecords(query: any) {
  const { page, limit, skip } = parsePagination(query);
  const where: any = {};
  if (query.status) {
    const statuses = query.status.split(',').map((s: string) => s.trim());
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.serviceProviderId) where.serviceProviderId = query.serviceProviderId;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.createdAt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
  }

  const [data, total] = await Promise.all([
    prisma.serviceRecord.findMany({
      where,
      skip,
      take: limit,
      include: {
        vehicle: true,
        serviceProvider: true,
        serviceType: true,
        driver: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceRecord.count({ where }),
  ]);
  return paginatedResponse(data, total, { page, limit, skip });
}

export async function getServiceRecordById(id: string) {
  const record = await prisma.serviceRecord.findUnique({
    where: { id },
    include: {
      vehicle: true,
      serviceProvider: true,
      serviceType: true,
      driver: { select: { id: true, firstName: true, lastName: true } },
      authorizedByUser: { select: { id: true, firstName: true, lastName: true } },
      approvedByUser: { select: { id: true, firstName: true, lastName: true } },
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
      statusHistory: {
        include: { changedByUser: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
      },
      photos: {
        include: { uploadedByUser: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!record) throw new NotFoundError('Service record not found');
  return record;
}

export async function createServiceRecord(data: any, userId: string) {
  if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
  if (data.invoiceDate) data.invoiceDate = new Date(data.invoiceDate);

  // Before creating the record, find active driver for this vehicle
  const activeAssignment = await prisma.assignment.findFirst({
    where: { vehicleId: data.vehicleId, status: 'ACTIVE' },
  });

  const record = await prisma.serviceRecord.create({
    data: {
      ...data,
      status: 'DRAFT',
      createdBy: userId,
      driverId: data.driverId || activeAssignment?.driverId || null,
    },
    include: {
      vehicle: true,
      serviceType: true,
      serviceProvider: true,
      driver: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.serviceStatusHistory.create({
    data: {
      serviceRecordId: record.id,
      toStatus: 'DRAFT',
      changedBy: userId,
      notes: 'Service record created',
    },
  });

  await createAuditLog(prisma, userId, 'CREATE', 'ServiceRecord', record.id);
  return record;
}

export async function updateServiceRecord(id: string, data: any, userId: string) {
  if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
  if (data.invoiceDate) data.invoiceDate = new Date(data.invoiceDate);

  const existing = await prisma.serviceRecord.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Service record not found');
  if (!['DRAFT', 'SCHEDULED'].includes(existing.status)) {
    throw new BadRequestError('Can only edit service records in DRAFT or SCHEDULED status');
  }

  const record = await prisma.serviceRecord.update({
    where: { id },
    data,
    include: {
      vehicle: true,
      serviceType: true,
      serviceProvider: true,
      driver: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  await createAuditLog(prisma, userId, 'UPDATE', 'ServiceRecord', id);
  return record;
}

export async function transitionServiceRecord(id: string, action: string, userId: string, notes?: string) {
  const record = await prisma.serviceRecord.findUnique({ where: { id } });
  if (!record) throw new NotFoundError('Service record not found');

  const validTransitions = TRANSITIONS[record.status] || [];
  const transition = validTransitions.find((t) => t.action === action);
  if (!transition) {
    throw new BadRequestError(`Cannot perform action '${action}' on status '${record.status}'`);
  }

  const updateData: any = { status: transition.to };

  switch (transition.to) {
    case 'AUTHORIZED':
      updateData.authorizedBy = userId;
      updateData.authorizedAt = new Date();
      break;
    case 'IN_PROGRESS':
      updateData.startedAt = new Date();
      break;
    case 'COMPLETED':
      updateData.completedAt = new Date();
      break;
    case 'APPROVED':
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
      break;
    case 'RETURNED':
      updateData.returnedAt = new Date();
      break;
  }

  const updated = await prisma.serviceRecord.update({
    where: { id },
    data: updateData,
    include: {
      vehicle: true,
      serviceType: true,
      serviceProvider: true,
      driver: { select: { id: true, firstName: true, lastName: true } },
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.serviceStatusHistory.create({
    data: {
      serviceRecordId: id,
      fromStatus: record.status,
      toStatus: transition.to,
      changedBy: userId,
      notes,
    },
  });

  await createAuditLog(prisma, userId, 'TRANSITION', 'ServiceRecord', id, {
    from: record.status,
    to: transition.to,
    action,
  });

  return updated;
}

// Photo management
export async function createPhoto(data: {
  serviceRecordId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  type: string;
  caption?: string;
  uploadedBy: string;
}) {
  const record = await prisma.serviceRecord.findUnique({ where: { id: data.serviceRecordId } });
  if (!record) throw new NotFoundError('Service record not found');

  const photo = await prisma.photo.create({ data: data as any });
  await createAuditLog(prisma, data.uploadedBy, 'UPLOAD_PHOTO', 'Photo', photo.id);
  return photo;
}

export async function deletePhoto(id: string, userId: string) {
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) throw new NotFoundError('Photo not found');
  await prisma.photo.delete({ where: { id } });
  await createAuditLog(prisma, userId, 'DELETE_PHOTO', 'Photo', id);
  return photo;
}

// Service Record deletion
export async function deleteServiceRecord(id: string, userId: string) {
  const existing = await prisma.serviceRecord.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Service record not found');

  await prisma.serviceStatusHistory.deleteMany({ where: { serviceRecordId: id } });
  await prisma.photo.deleteMany({ where: { serviceRecordId: id } });
  await prisma.serviceRecord.delete({ where: { id } });
  await createAuditLog(prisma, userId, 'DELETE', 'ServiceRecord', id);
}

export async function bulkDeleteServiceRecords(ids: string[], userId: string) {
  const deleted: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const id of ids) {
    try {
      const existing = await prisma.serviceRecord.findUnique({ where: { id } });
      if (!existing) {
        failed.push({ id, reason: 'Service record not found' });
        continue;
      }

      await prisma.serviceStatusHistory.deleteMany({ where: { serviceRecordId: id } });
      await prisma.photo.deleteMany({ where: { serviceRecordId: id } });
      await prisma.serviceRecord.delete({ where: { id } });
      await createAuditLog(prisma, userId, 'DELETE', 'ServiceRecord', id);
      deleted.push(id);
    } catch {
      failed.push({ id, reason: 'Unexpected error' });
    }
  }

  return { deleted, failed };
}

// Driver cost analysis
export async function getDriverCosts(driverId: string, period: 'weekly' | 'monthly') {
  const records = await prisma.serviceRecord.findMany({
    where: { driverId },
    select: {
      id: true,
      totalCostInclVat: true,
      totalCostExclVat: true,
      vatAmount: true,
      laborCost: true,
      partsCost: true,
      additionalCharges: true,
      currency: true,
      createdAt: true,
      vehicle: { select: { licensePlate: true, make: true, model: true } },
      serviceType: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group by period
  const groups: Record<string, { periodLabel: string; serviceCount: number; totalCost: number; records: any[] }> = {};

  for (const r of records) {
    const date = new Date(r.createdAt);
    let key: string;
    let label: string;

    if (period === 'weekly') {
      // Get ISO week start (Monday)
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      key = weekStart.toISOString().slice(0, 10);
      label = `Week of ${key}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      label = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    if (!groups[key]) {
      groups[key] = { periodLabel: label, serviceCount: 0, totalCost: 0, records: [] };
    }
    groups[key].serviceCount++;
    groups[key].totalCost += r.totalCostInclVat || 0;
    groups[key].records.push(r);
  }

  const lifetimeCost = records.reduce((sum, r) => sum + (r.totalCostInclVat || 0), 0);
  const lifetimeServices = records.length;

  // Group by vehicle
  const vehicleMap: Record<string, { vehicleName: string; serviceCount: number; totalCost: number }> = {};
  for (const r of records) {
    if (!r.vehicle) continue;
    const vehicleId = `${r.vehicle.licensePlate}`;
    const vehicleName = `${r.vehicle.make} ${r.vehicle.model} (${r.vehicle.licensePlate})`;
    if (!vehicleMap[vehicleId]) vehicleMap[vehicleId] = { vehicleName, serviceCount: 0, totalCost: 0 };
    vehicleMap[vehicleId].serviceCount++;
    vehicleMap[vehicleId].totalCost += r.totalCostInclVat || 0;
  }
  const costByVehicle = Object.entries(vehicleMap).map(([vehicleId, data]) => ({
    vehicleId,
    ...data,
  }));

  return {
    periods: Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v),
    lifetimeCost,
    lifetimeServices,
    costByVehicle,
  };
}
