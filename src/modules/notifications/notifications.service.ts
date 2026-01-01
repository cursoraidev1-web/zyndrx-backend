import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import logger from '../../utils/logger';
import { PushService } from '../push/push.service';

const db = supabase as SupabaseClient<Database>;

export class NotificationService {
  
  static async create(userId: string, type: string, title: string, message: string, link?: string) {
    // FIX: Add 'as any' here
    const { error } = await (db.from('notifications') as any).insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      is_read: false
    });
    
    if (error) {
      logger.error('Failed to create notification', {
        userId,
        type,
        title,
        error: error.message
      });
    } else {
      logger.debug('Notification created', { userId, type, title });
      
      // Send push notification if user has push subscriptions enabled
      // This is done asynchronously to not block the notification creation
      PushService.sendNotification(userId, title, message, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: type,
        data: { link, type },
        requireInteraction: false,
      }).catch(err => {
        logger.warn('Failed to send push notification', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }

  static async getMyNotifications(userId: string) {
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data;
  }

  static async markAsRead(id: string, userId: string) {
    // FIX: Add 'as any' here
    const { data, error } = await (db.from('notifications') as any)
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async markAllRead(userId: string) {
    // FIX: Add 'as any' here
    const { error } = await (db.from('notifications') as any)
      .update({ is_read: true })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}