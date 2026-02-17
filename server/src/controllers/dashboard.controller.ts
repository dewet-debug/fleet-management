import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';

export async function getMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await dashboardService.getMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const activity = await dashboardService.getRecentActivity(limit);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const alerts = await dashboardService.getAlerts();

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
}
