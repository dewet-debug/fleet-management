import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function generateAccessToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY });
}

export function generateRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): any {
  return jwt.verify(token, env.JWT_SECRET);
}

export function verifyRefreshToken(token: string): any {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
