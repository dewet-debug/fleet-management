import { Request, Response, NextFunction } from 'express';
import { listReports, runReport } from '../services/reports';
import { NotFoundError } from '../utils/errors';

export function getReportCatalog(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: listReports() });
  } catch (error) {
    next(error);
  }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const params = {
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      months: req.query.months ? parseInt(req.query.months as string, 10) : undefined,
      horizonDays: req.query.horizonDays ? parseInt(req.query.horizonDays as string, 10) : undefined,
      speedLimit: req.query.speedLimit ? parseInt(req.query.speedLimit as string, 10) : undefined,
      driverUuid: (req.query.driverUuid as string) || undefined,
    };
    const result = await runReport(req.params.key, params);
    if (!result) throw new NotFoundError(`Unknown report: ${req.params.key}`);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
