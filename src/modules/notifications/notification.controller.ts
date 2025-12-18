import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';

const notificationService = new NotificationService();

export class NotificationController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { page, limit, unreadOnly } = req.query;

    const result = await notificationService.getUserNotifications(
      req.user.id,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined,
      unreadOnly === 'true'
    );

    return ResponseHandler.paginated(
      res,
      result.notifications,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total
    );
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await notificationService.getUnreadCount(req.user.id);

    return ResponseHandler.success(res, result);
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, req.user.id);

    return ResponseHandler.success(res, notification, 'Notification marked as read');
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    await notificationService.markAllAsRead(req.user.id);

    return ResponseHandler.success(res, null, 'All notifications marked as read');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    await notificationService.delete(id, req.user.id);

    return ResponseHandler.success(res, null, 'Notification deleted successfully');
  });
}
