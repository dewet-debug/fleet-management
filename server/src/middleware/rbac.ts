import { Response, NextFunction } from 'express';
import { RequestWithUser } from './auth';
import { ForbiddenError } from '../utils/errors';

export function authorize(...roles: string[]) {
  return (req: RequestWithUser, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('No user found on request'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
