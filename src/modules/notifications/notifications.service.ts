import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import {
  CreateNotificationInput,
  MarkAsReadInput,
  GetNotificationsQuery,
} from './notifications.validation';

export class NotificationsService {
  /**
   * Create a notification
   */
  async createNotification(data: CreateNotificationInput) {
    try {
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
        })
        .select('*')
        .single();

      if (error || !notification) {
        logger.error('Failed to create notification', { error });
        throw new AppError('Failed to create notification', 500);
      }

      return this.formatNotification(notification);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create notification error', { error });
      throw new AppError('Failed to create notification', 500);
    }
  }

  /**
   * Get user notifications with filtering and pagination
   */
  async getUserNotifications(userId: string, query: GetNotificationsQuery) {
    try {
      let queryBuilder = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Filter by read status
      if (query.isRead !== undefined) {
        queryBuilder = queryBuilder.eq('is_read', query.isRead);
      }

      // Filter by type
      if (query.type) {
        queryBuilder = queryBuilder.eq('type', query.type);
      }

      // Pagination
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder
        .order('created_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

      const { data: notifications, error, count } = await queryBuilder;

      if (error) {
        logger.error('Failed to fetch notifications', { error });
        throw new AppError('Failed to fetch notifications', 500);
      }

      return {
        data: notifications?.map((n) => this.formatNotification(n)) || [],
        pagination: {
          total: count || 0,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil((count || 0) / query.limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get notifications error', { error });
      throw new AppError('Failed to fetch notifications', 500);
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, data: MarkAsReadInput) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .in('id', data.notificationIds)
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to mark notifications as read', { error });
        throw new AppError('Failed to mark notifications as read', 500);
      }

      return {
        message: 'Notifications marked as read',
        count: data.notificationIds.length,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Mark as read error', { error });
      throw new AppError('Failed to mark notifications as read', 500);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        logger.error('Failed to mark all notifications as read', { error });
        throw new AppError('Failed to mark all notifications as read', 500);
      }

      return { message: 'All notifications marked as read' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Mark all as read error', { error });
      throw new AppError('Failed to mark all notifications as read', 500);
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    try {
      const { count, error } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        logger.error('Failed to get unread count', { error });
        throw new AppError('Failed to get unread count', 500);
      }

      return { unreadCount: count || 0 };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get unread count error', { error });
      throw new AppError('Failed to get unread count', 500);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete notification', { error });
        throw new AppError('Failed to delete notification', 500);
      }

      return { message: 'Notification deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete notification error', { error });
      throw new AppError('Failed to delete notification', 500);
    }
  }

  // ============ HELPER METHODS ============

  private formatNotification(notification: any) {
    return {
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      isRead: notification.is_read,
      createdAt: notification.created_at,
    };
  }
}
