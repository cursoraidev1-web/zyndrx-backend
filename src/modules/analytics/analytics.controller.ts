import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { ResponseHandler } from '../../utils/response';

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return ResponseHandler.error(res, 'Project ID required', 400);

    const stats = await AnalyticsService.getProjectStats(String(project_id));
    return ResponseHandler.success(res, stats);
  } catch (error) { next(error); }
};