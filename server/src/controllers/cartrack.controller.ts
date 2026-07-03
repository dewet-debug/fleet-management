import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import prisma from '../config/database';
import { cartrackAdmin } from '../services/cartrack';
import { runSync } from '../services/cartrack/cartrackSync.service';
import { getSchedulerStatus as getStatus, restartScheduler } from '../lib/cartrack/syncScheduler';

export async function getConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const config = await cartrackAdmin.getOrCreateConfig();
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const config = await cartrackAdmin.updateConfig(req.body, user!.id);

    // Restart scheduler if sync settings changed
    if (req.body.isEnabled !== undefined || req.body.syncIntervalMinutes !== undefined) {
      await restartScheduler();
    }

    res.json({ success: true, data: config });
  } catch (error) { next(error); }
}

export async function testConnection(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.testConnection();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getFleetVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.listFleetVehicles({
      page: req.query.page as string,
      limit: req.query.limit as string,
      search: req.query.search as string,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function addFleetVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const fv = await cartrackAdmin.addFleetVehicle(req.body.vehicleId, req.body.licensePlate, user!.id);
    res.status(201).json({ success: true, data: fv });
  } catch (error) { next(error); }
}

export async function bulkAddFleetVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const results = await cartrackAdmin.bulkAddFleetVehicles(req.body.vehicles, user!.id);
    res.status(201).json({ success: true, data: results });
  } catch (error) { next(error); }
}

export async function removeFleetVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    await cartrackAdmin.removeFleetVehicle(req.params.id, user!.id);
    res.json({ success: true, message: 'Fleet vehicle removed from sync' });
  } catch (error) { next(error); }
}

export async function triggerSync(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const syncLogId = await runSync(req.body.syncType, 'MANUAL', user!.id);
    res.status(202).json({ success: true, data: { syncLogId } });
  } catch (error) { next(error); }
}

export async function getSchedulerStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    const status = getStatus();
    res.json({ success: true, data: status });
  } catch (error) { next(error); }
}

export async function getSyncLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.listSyncLogs({
      page: req.query.page as string,
      limit: req.query.limit as string,
      syncType: req.query.syncType as string,
      status: req.query.status as string,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function getSyncLogById(req: Request, res: Response, next: NextFunction) {
  try {
    const log = await cartrackAdmin.getSyncLogById(req.params.id);
    res.json({ success: true, data: log });
  } catch (error) { next(error); }
}

export async function getVehicleData(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await cartrackAdmin.getVehicleCartrackData(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function getVehicleTrips(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.getVehicleTrips(req.params.id, {
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function getVehicleAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.getVehicleAlerts(req.params.id, {
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function getVehicleFuel(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.getVehicleFuel(req.params.id, {
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function getDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.getCartrackDrivers({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function getVehicleGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cartrackAdmin.getVehicleGroups({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

// ---- Extended synced-data views (coaching, geofences, events, reminders, POIs) ----

function paging(req: Request) {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  return { page, limit, skip: (page - 1) * limit };
}

async function listModel(
  model: { findMany: (a: any) => Promise<any[]>; count: (a: any) => Promise<number> },
  req: Request,
  res: Response,
  next: NextFunction,
  orderBy: any,
) {
  try {
    const { page, limit, skip } = paging(req);
    const [data, total] = await Promise.all([
      model.findMany({ skip, take: limit, orderBy }),
      model.count({}),
    ]);
    res.json({ success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
}

export const getCoachingEvents = (req: Request, res: Response, next: NextFunction) =>
  listModel(prisma.cartrackCoachingEvent, req, res, next, { eventTime: 'desc' });
export const getGeofences = (req: Request, res: Response, next: NextFunction) =>
  listModel(prisma.cartrackGeofence, req, res, next, { name: 'asc' });
export const getGeofenceVisits = (req: Request, res: Response, next: NextFunction) =>
  listModel(prisma.cartrackGeofenceVisit, req, res, next, { entryTime: 'desc' });
export const getVehicleEvents = (req: Request, res: Response, next: NextFunction) =>
  listModel(prisma.cartrackVehicleEvent, req, res, next, { eventTime: 'desc' });
export const getReminders = (req: Request, res: Response, next: NextFunction) =>
  listModel(prisma.cartrackReminder, req, res, next, { dueDate: 'asc' });
export const getPois = (req: Request, res: Response, next: NextFunction) =>
  listModel(prisma.cartrackPoi, req, res, next, { name: 'asc' });
