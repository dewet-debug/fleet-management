import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const badRequest = new BadRequestError('Validation failed');
        (badRequest as any).details = details;

        _res.status(400).json({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            details,
          },
        });
        return;
      }
      next(error);
    }
  };
}
