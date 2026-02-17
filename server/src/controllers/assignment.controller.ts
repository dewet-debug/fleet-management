import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import * as assignmentService from '../services/assignment.service';

export async function listAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const vehicleId = req.query.vehicleId as string | undefined;
    const driverId = req.query.driverId as string | undefined;

    const result = await assignmentService.listAssignments({
      page,
      limit,
      status,
      vehicleId,
      driverId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const assignment = await assignmentService.createAssignment(req.body, user.id);

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

export async function endAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const assignment = await assignmentService.endAssignment(req.params.id, user.id);

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}
