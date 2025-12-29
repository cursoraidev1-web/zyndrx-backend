import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notifications.service';
import { ResponseHandler } from '../../utils/response';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const data = await NotificationService.getMyNotifications(userId, companyId);
    return ResponseHandler.success(res, data);
  } catch (error) { next(error); }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { id } = req.params;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await NotificationService.markAsRead(id, userId, companyId);
    return ResponseHandler.success(res, { success: true }, 'Marked as read');
  } catch (error) { next(error); }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await NotificationService.markAllRead(userId, companyId);
    return ResponseHandler.success(res, { success: true }, 'All marked as read');
  } catch (error) { next(error); }
};