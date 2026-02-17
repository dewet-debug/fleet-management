import prisma from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';
import { parsePagination, paginatedResponse } from '../utils/pagination';

export async function listAssignments(params: {
  page: number; limit: number; status?: string; vehicleId?: string; driverId?: string;
}) {
  const { page, limit } = params;
  const { skip } = parsePagination({ page: String(page), limit: String(limit) });

  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.vehicleId) where.vehicleId = params.vehicleId;
  if (params.driverId) where.driverId = params.driverId;

  const [assignments, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      include: { vehicle: true, driver: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.assignment.count({ where }),
  ]);

  return paginatedResponse(assignments, total, { page, limit, skip });
}

export async function createAssignment(data: {
  vehicleId: string; driverId: string; startDate: string; notes?: string;
}, userId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new NotFoundError('Vehicle not found');
  if (vehicle.status !== 'ACTIVE') throw new BadRequestError('Vehicle is not active');

  const driver = await prisma.driver.findUnique({ where: { id: data.driverId } });
  if (!driver) throw new NotFoundError('Driver not found');
  if (driver.status !== 'ACTIVE') throw new BadRequestError('Driver is not active');

  // End current active assignments for vehicle and driver
  await prisma.assignment.updateMany({
    where: { vehicleId: data.vehicleId, status: 'ACTIVE' },
    data: { status: 'ENDED', endDate: new Date() },
  });
  await prisma.assignment.updateMany({
    where: { driverId: data.driverId, status: 'ACTIVE' },
    data: { status: 'ENDED', endDate: new Date() },
  });

  const assignment = await prisma.assignment.create({
    data: {
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      startDate: new Date(data.startDate),
      notes: data.notes,
      status: 'ACTIVE',
      createdBy: userId,
    },
    include: { vehicle: true, driver: true },
  });

  await createAuditLog(prisma, userId, 'CREATE', 'Assignment', assignment.id);
  return assignment;
}

export async function endAssignment(id: string, userId: string) {
  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Assignment not found');
  if (existing.status !== 'ACTIVE') throw new BadRequestError('Assignment is not active');

  const assignment = await prisma.assignment.update({
    where: { id },
    data: { status: 'ENDED', endDate: new Date() },
    include: { vehicle: true, driver: true },
  });

  await createAuditLog(prisma, userId, 'END', 'Assignment', id);
  return assignment;
}
