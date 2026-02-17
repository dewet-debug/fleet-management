import { PrismaClient } from '@prisma/client';

export async function createAuditLog(
  prisma: PrismaClient,
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details?: any,
  ipAddress?: string
) {
  return prisma.auditLog.create({
    data: {
      userId: userId || null,
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
    },
  });
}
