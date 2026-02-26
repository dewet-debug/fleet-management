import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import * as serviceService from '../services/service.service';

// Service Types
export async function listServiceTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.listServiceTypes(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function createServiceType(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.createServiceType(req.body, (req as RequestWithUser).user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function updateServiceType(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.updateServiceType(req.params.id, req.body, (req as RequestWithUser).user.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function deleteServiceType(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceService.deleteServiceType(req.params.id, (req as RequestWithUser).user.id);
    res.json({ success: true, message: 'Service type deactivated' });
  } catch (error) { next(error); }
}

// Service Intervals
export async function listServiceIntervals(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.listServiceIntervals(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function createServiceInterval(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.createServiceInterval(req.body, (req as RequestWithUser).user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function updateServiceInterval(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.updateServiceInterval(req.params.id, req.body, (req as RequestWithUser).user.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function deleteServiceInterval(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceService.deleteServiceInterval(req.params.id, (req as RequestWithUser).user.id);
    res.json({ success: true, message: 'Service interval deactivated' });
  } catch (error) { next(error); }
}

// Service Records
export async function listServiceRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.listServiceRecords(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getServiceRecordById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.getServiceRecordById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function createServiceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.createServiceRecord(req.body, (req as RequestWithUser).user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function updateServiceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceService.updateServiceRecord(req.params.id, req.body, (req as RequestWithUser).user.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function transitionServiceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const { action, notes } = req.body;
    const result = await serviceService.transitionServiceRecord(
      req.params.id, action, (req as RequestWithUser).user.id, notes
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function bulkDeleteServiceRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const result = await serviceService.bulkDeleteServiceRecords(req.body.ids, user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) { next(error); }
}

// Photos
export async function deletePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceService.deletePhoto(req.params.id, (req as RequestWithUser).user.id);
    res.json({ success: true, message: 'Photo deleted' });
  } catch (error) { next(error); }
}
