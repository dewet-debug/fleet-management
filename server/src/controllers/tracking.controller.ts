import { Request, Response, NextFunction } from 'express';
import * as trackingService from '../services/tracking.service';

export async function fleetPositions(_req: Request, res: Response, next: NextFunction) {
  try {
    const positions = await trackingService.getFleetPositions();
    const sources = positions.reduce(
      (a, p) => ({ ...a, [p.source]: (a[p.source] ?? 0) + 1 }),
      {} as Record<string, number>,
    );
    res.json({ success: true, data: positions, meta: { total: positions.length, sources } });
  } catch (error) {
    next(error);
  }
}
