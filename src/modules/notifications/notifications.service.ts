import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class NotificationService {
  
  static async create(userId: string, type: string, title: string, message: string, companyId?: string, link?: string) {
    try {
      const { error } = await (db.from('notifications') as any).insert({
        user_id: userId,
        company_id: companyId,
        type,
        title,
        message,
        link,
        is_read: false
      });
      
      if (error) {
        logger.error('Failed to create notification', {
          userId,
          companyId,
          type,
          title,
          error: error.message
        });
        throw new AppError(`Failed to create notification: ${error.message}`, 500);
      } else {
        logger.debug('Notification created', { userId, companyId, type, title });
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create notification error', { error, userId, companyId });
      throw new AppError('Failed to create notification', 500);
    }
  }

  static async getMyNotifications(userId: string, companyId: string) {
    try {
      const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Failed to fetch notifications', { error: error.message, userId, companyId });
        throw new AppError(`Failed to fetch notifications: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get notifications error', { error, userId, companyId });
      throw new AppError('Failed to fetch notifications', 500);
    }
  }

  static async markAsRead(id: string, userId: string, companyId: string) {
    try {
      const { data, error } = await (db.from('notifications') as any)
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Notification not found or access denied', 404);
        }
        logger.error('Failed to mark notification as read', { error: error.message, id, userId, companyId });
        throw new AppError(`Failed to mark notification as read: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Mark notification as read error', { error, id, userId, companyId });
      throw new AppError('Failed to mark notification as read', 500);
    }
  }

  static async markAllRead(userId: string, companyId: string) {
    try {
      const { error } = await (db.from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) {
        logger.error('Failed to mark all notifications as read', { error: error.message, userId, companyId });
        throw new AppError(`Failed to mark all notifications as read: ${error.message}`, 500);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Mark all notifications as read error', { error, userId, companyId });
      throw new AppError('Failed to mark all notifications as read', 500);
    }
  }
}