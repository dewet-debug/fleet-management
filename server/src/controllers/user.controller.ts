import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import * as userService from '../services/user.service';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await userService.listUsers({ page, limit, role, search });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.params.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { user: currentUser } = req as RequestWithUser;
    const user = await userService.createUser(req.body, currentUser.id);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { user: currentUser } = req as RequestWithUser;
    const user = await userService.updateUser(req.params.id, req.body, currentUser.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { user: currentUser } = req as RequestWithUser;
    await userService.deleteUser(req.params.id, currentUser.id);

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.params.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}
