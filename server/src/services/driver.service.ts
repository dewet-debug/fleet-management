import prisma from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';
import { parsePagination, paginatedResponse } from '../utils/pagination';

export async function listDrivers(params: {
  page: number; limit: number; status?: string; search?: string;
}) {
  const { page, limit } = params;
  const { skip } = parsePagination({ page: String(page), limit: String(limit) });

  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search } },
      { lastName: { contains: params.search } },
      { email: { contains: params.search } },
      { employeeId: { contains: params.search } },
    ];
  }

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { vehicle: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.driver.count({ where }),
  ]);

  return paginatedResponse(drivers, total, { page, limit, skip });
}

export async function getDriverById(id: string) {
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { vehicle: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!driver) throw new NotFoundError('Driver not found');
  return driver;
}

export async function createDriver(data: any, userId: string) {
  const driverData = { ...data, licenseExpiry: new Date(data.licenseExpiry) };
  const driver = await prisma.driver.create({ data: driverData });
  await createAuditLog(prisma, userId, 'CREATE', 'Driver', driver.id);
  return driver;
}

export async function updateDriver(id: string, data: any, userId: string) {
  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Driver not found');
  if (data.licenseExpiry) data.licenseExpiry = new Date(data.licenseExpiry);

  const driver = await prisma.driver.update({ where: { id }, data });
  await createAuditLog(prisma, userId, 'UPDATE', 'Driver', id);
  return driver;
}

export async function deleteDriver(id: string, userId: string) {
  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Driver not found');

  const activeAssignment = await prisma.assignment.findFirst({
    where: { driverId: id, status: 'ACTIVE' },
  });
  if (activeAssignment) throw new BadRequestError('Cannot delete driver with active assignment');

  await prisma.driver.delete({ where: { id } });
  await createAuditLog(prisma, userId, 'DELETE', 'Driver', id);
}

export async function bulkDeleteDrivers(ids: string[], userId: string) {
  const deleted: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const id of ids) {
    try {
      const existing = await prisma.driver.findUnique({ where: { id } });
      if (!existing) {
        failed.push({ id, reason: 'Driver not found' });
        continue;
      }

      const activeAssignment = await prisma.assignment.findFirst({
        where: { driverId: id, status: 'ACTIVE' },
      });
      if (activeAssignment) {
        failed.push({ id, reason: 'Cannot delete driver with active assignment' });
        continue;
      }

      await prisma.driver.delete({ where: { id } });
      await createAuditLog(prisma, userId, 'DELETE', 'Driver', id);
      deleted.push(id);
    } catch {
      failed.push({ id, reason: 'Unexpected error' });
    }
  }

  return { deleted, failed };
}
