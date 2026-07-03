import { Request, Response, NextFunction } from 'express';
import * as a49Service from '../services/a49.service';

export async function syncAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await a49Service.syncAll('MANUAL');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function syncDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await a49Service.syncDrivers('MANUAL');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function syncJobCards(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await a49Service.syncJobCards('MANUAL');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;

    const result = await a49Service.listA49Drivers({ page, limit, search });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listJobCards(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await a49Service.listA49JobCards({ page, limit, status, search });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listSyncLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const syncType = req.query.syncType as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await a49Service.listA49SyncLogs({ page, limit, syncType, status });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
