import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  /**
   * Get project analytics
   * GET /api/v1/analytics/projects/:projectId
   */
  getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const analytics = await analyticsService.getProjectAnalytics(
      projectId,
      req.user.id
    );

    return ResponseHandler.success(
      res,
      analytics,
      'Project analytics retrieved successfully'
    );
  });

  /**
   * Get user analytics/dashboard
   * GET /api/v1/analytics/me
   */
  getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const analytics = await analyticsService.getUserAnalytics(req.user.id);

    return ResponseHandler.success(
      res,
      analytics,
      'User analytics retrieved successfully'
    );
  });
}
