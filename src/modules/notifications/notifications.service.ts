import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';

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
    
    if (error) console.error('Failed to create notification:', error.message);
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