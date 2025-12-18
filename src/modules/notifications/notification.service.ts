import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { NotificationType } from '../../types/database.types';
import logger from '../../utils/logger';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export class NotificationService {
  async create(data: CreateNotificationData) {
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

    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch notifications', { error });
      throw new AppError('Failed to fetch notifications', 500);
    }

    return {
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !notification) {
      throw new AppError('Notification not found', 404);
    }

    return notification;
  }

  async markAllAsRead(userId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Failed to mark notifications as read', { error });
      throw new AppError('Failed to mark notifications as read', 500);
    }

    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Failed to get unread count', { error });
      return { count: 0 };
    }

    return { count: count || 0 };
  }

  async delete(notificationId: string, userId: string) {
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
  }
}
