import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;

    const analytics = await analyticsService.getProjectAnalytics(projectId, req.user.id);

    return ResponseHandler.success(res, analytics);
  });

  getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const analytics = await analyticsService.getUserAnalytics(req.user.id);

    return ResponseHandler.success(res, analytics);
  });

  getTaskVelocity = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const { days } = req.query;

    const velocity = await analyticsService.getTaskVelocity(
      projectId,
      req.user.id,
      days ? parseInt(days as string) : undefined
    );

    return ResponseHandler.success(res, velocity);
  });

  getTeamPerformance = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;

    const performance = await analyticsService.getTeamPerformance(projectId, req.user.id);

    return ResponseHandler.success(res, performance);
  });
}
