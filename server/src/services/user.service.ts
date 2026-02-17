import prisma from '../config/database';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import { createAuditLog } from '../utils/audit';
import { parsePagination, paginatedResponse } from '../utils/pagination';

const userSelect = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
};

export async function listUsers(params: { page: number; limit: number; role?: string; search?: string }) {
  const { page, limit } = params;
  const { skip } = parsePagination({ page: String(page), limit: String(limit) });

  const where: any = {};
  if (params.role) where.role = params.role;
  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search } },
      { lastName: { contains: params.search } },
      { email: { contains: params.search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return paginatedResponse(users, total, { page, limit, skip });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function createUser(data: {
  email: string; password: string; firstName: string; lastName: string; role: string;
}, performedByUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new BadRequestError('Email already in use');

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, role: data.role },
    select: userSelect,
  });

  if (performedByUserId) {
    await createAuditLog(prisma, performedByUserId, 'CREATE', 'User', user.id);
  }
  return user;
}

export async function updateUser(id: string, data: any, performedByUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('User not found');

  const user = await prisma.user.update({ where: { id }, data, select: userSelect });
  if (performedByUserId) {
    await createAuditLog(prisma, performedByUserId, 'UPDATE', 'User', id);
  }
  return user;
}

export async function deleteUser(id: string, performedByUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('User not found');

  const user = await prisma.user.update({ where: { id }, data: { isActive: false }, select: userSelect });
  if (performedByUserId) {
    await createAuditLog(prisma, performedByUserId, 'DELETE', 'User', id);
  }
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await createAuditLog(prisma, userId, 'PASSWORD_CHANGE', 'User', userId);
}
