import { Request, Response, NextFunction } from 'express';
import { ActivityService } from './activity.service';
import { ResponseHandler } from '../../utils/response';

export const getActivityFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId;
    const { project_id, user_id, type, limit } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const activities = await ActivityService.getActivityFeed({
      companyId,
      projectId: project_id as string | undefined,
      userId: user_id as string | undefined,
      type: type as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return ResponseHandler.success(res, activities, 'Activity feed fetched successfully');
  } catch (error) {
    next(error);
  }
};


