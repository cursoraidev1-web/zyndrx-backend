import { Request, Response } from 'express';
import { NotificationsService } from './notifications.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';

const notificationsService = new NotificationsService();

export class NotificationsController {
  /**
   * Get user notifications
   * GET /api/v1/notifications
   */
  getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await notificationsService.getUserNotifications(
      req.user.id,
      req.query as any
    );

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'Notifications retrieved successfully'
    );
  });

  /**
   * Get unread count
   * GET /api/v1/notifications/unread-count
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await notificationsService.getUnreadCount(req.user.id);

    return ResponseHandler.success(res, result);
  });

  /**
   * Mark notifications as read
   * PATCH /api/v1/notifications/read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await notificationsService.markAsRead(req.user.id, req.body);

    return ResponseHandler.success(res, result, 'Notifications marked as read');
  });

  /**
   * Mark all notifications as read
   * PATCH /api/v1/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await notificationsService.markAllAsRead(req.user.id);

    return ResponseHandler.success(res, result, 'All notifications marked as read');
  });

  /**
   * Delete notification
   * DELETE /api/v1/notifications/:id
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const result = await notificationsService.deleteNotification(id, req.user.id);

    return ResponseHandler.success(res, result, 'Notification deleted successfully');
  });
}
