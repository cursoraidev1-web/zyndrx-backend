import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notifications.service';
import { ResponseHandler } from '../../utils/response';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const data = await NotificationService.getMyNotifications(userId);
    return ResponseHandler.success(res, data);
  } catch (error) { next(error); }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const notificationId = Array.isArray(id) ? id[0] : id;
    await NotificationService.markAsRead(notificationId, userId);
    return ResponseHandler.success(res, { success: true }, 'Marked as read');
  } catch (error) { next(error); }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await NotificationService.markAllRead(userId);
    return ResponseHandler.success(res, { success: true }, 'All marked as read');
  } catch (error) { next(error); }
};