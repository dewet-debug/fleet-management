import { Request, Response, NextFunction } from 'express';
import { getVehicleProfitability } from '../services/analytics/profitability.service';

export async function vehicleProfitability(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getVehicleProfitability({
      dateFrom: (req.query.dateFrom as string) || undefined,
      dateTo: (req.query.dateTo as string) || undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
