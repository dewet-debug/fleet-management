import prisma from '../config/database';
import { UnauthorizedError } from '../utils/errors';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { comparePassword } from '../utils/password';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });

  const { passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(token: string) {
  const payload = verifyRefreshToken(token);
  if (!payload) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = generateRefreshToken({ userId: user.id });

  const { passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
