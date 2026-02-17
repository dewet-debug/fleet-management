import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import * as vehicleService from '../services/vehicle.service';

export async function listVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const make = req.query.make as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await vehicleService.listVehicles({ page, limit, status, make, search });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVehicleById(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

export async function createVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const vehicle = await vehicleService.createVehicle(req.body, user.id);

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const vehicle = await vehicleService.updateVehicle(req.params.id, req.body, user.id);

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    await vehicleService.deleteVehicle(req.params.id, user.id);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getVehicleCosts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await vehicleService.getVehicleCosts(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateKilometers(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const vehicle = await vehicleService.updateKilometers(req.params.id, req.body.kilometers, user.id);

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}
