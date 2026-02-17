import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Handle Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        res.status(409).json({
          error: {
            message: `Unique constraint violation on: ${target.join(', ')}`,
            statusCode: 409,
          },
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          error: {
            message: 'Record not found',
            statusCode: 404,
          },
        });
        return;
      }
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: {
        message: 'Invalid data provided',
        statusCode: 400,
      },
    });
    return;
  }

  // Default 500 error
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500,
    },
  });
}
