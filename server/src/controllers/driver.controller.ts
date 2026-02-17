import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import * as driverService from '../services/driver.service';
import * as serviceService from '../services/service.service';

export async function listDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await driverService.listDrivers({ page, limit, status, search });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDriverById(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await driverService.getDriverById(req.params.id);

    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

export async function createDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const driver = await driverService.createDriver(req.body, user.id);

    res.status(201).json({
      success: true,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const driver = await driverService.updateDriver(req.params.id, req.body, user.id);

    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    await driverService.deleteDriver(req.params.id, user.id);

    res.json({
      success: true,
      message: 'Driver deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getDriverCosts(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as string) === 'monthly' ? 'monthly' : 'weekly';
    const result = await serviceService.getDriverCosts(req.params.id, period);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
