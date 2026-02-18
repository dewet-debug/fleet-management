import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import {
  bulkUploadVehicles,
  bulkUploadDrivers,
  bulkUploadServices,
  bulkUploadAssignments,
  generateTemplate,
} from '../services/bulkUpload.service';

export async function uploadVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await bulkUploadVehicles(req.file.buffer, user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function uploadDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await bulkUploadDrivers(req.file.buffer, user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function uploadServices(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await bulkUploadServices(req.file.buffer, user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function uploadAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await bulkUploadAssignments(req.file.buffer, user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function downloadTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { type } = req.params;
    const validTypes = ['vehicles', 'drivers', 'services', 'assignments'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid template type. Must be one of: ${validTypes.join(', ')}` });
    }
    const buffer = generateTemplate(type);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-template.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
