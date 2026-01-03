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

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { project_id, type, action, resource_type, resource_id, title, metadata } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!type || !action || !resource_type || !resource_id || !title) {
      return ResponseHandler.error(res, 'Missing required fields: type, action, resource_type, resource_id, title', 400);
    }

    const activity = await ActivityService.createActivity({
      companyId,
      projectId: project_id,
      userId,
      type,
      action,
      resourceType: resource_type,
      resourceId: resource_id,
      title,
      metadata
    });

    return ResponseHandler.created(res, activity, 'Activity created successfully');
  } catch (error) {
    next(error);
  }
};



