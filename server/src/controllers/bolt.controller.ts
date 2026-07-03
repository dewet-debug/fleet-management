import { Request, Response, NextFunction } from 'express';
import * as boltQuery from '../services/bolt/boltTripQuery.service';
import { getBoltStatus, startBoltTripsSync } from '../services/bolt/boltSyncRunner.service';

function matchedParam(v: unknown): 'matched' | 'unmatched' | undefined {
  return v === 'matched' || v === 'unmatched' ? v : undefined;
}

export async function status(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await getBoltStatus() });
  } catch (error) {
    next(error);
  }
}

export async function triggerSync(req: Request, res: Response, next: NextFunction) {
  try {
    const trft = req.body?.timeRangeFilterType;
    const result = await startBoltTripsSync({
      dateFrom: req.body?.dateFrom,
      dateTo: req.body?.dateTo,
      timeRangeFilterType: trft === 'price_review' ? 'price_review' : trft === 'created' ? 'created' : undefined,
      triggeredBy: 'console',
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json({ success: false, error: { message: error.message } });
    next(error);
  }
}

export async function listTrips(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await boltQuery.listBoltTrips({
      page,
      limit,
      search: (req.query.search as string) || undefined,
      status: (req.query.status as string) || undefined,
      paymentMethod: (req.query.paymentMethod as string) || undefined,
      matched: matchedParam(req.query.matched),
      dateFrom: (req.query.dateFrom as string) || undefined,
      dateTo: (req.query.dateTo as string) || undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function tripsSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await boltQuery.getBoltTripsSummary({
      search: (req.query.search as string) || undefined,
      status: (req.query.status as string) || undefined,
      paymentMethod: (req.query.paymentMethod as string) || undefined,
      matched: matchedParam(req.query.matched),
      dateFrom: (req.query.dateFrom as string) || undefined,
      dateTo: (req.query.dateTo as string) || undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function tripsAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await boltQuery.getBoltTripsAnalytics({
      dateFrom: (req.query.dateFrom as string) || undefined,
      dateTo: (req.query.dateTo as string) || undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listSyncLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await boltQuery.listBoltSyncLogs({
      page,
      limit,
      status: (req.query.status as string) || undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
