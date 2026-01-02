import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import logger from '../../utils/logger';
import webpush from 'web-push';
import { config } from '../../config';

const db = supabase as SupabaseClient<Database>;

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushService {
  /**
   * Initialize web-push with VAPID keys
   */
  static initialize() {
    if (config.push.vapidPublicKey && config.push.vapidPrivateKey) {
      webpush.setVapidDetails(
        config.push.vapidEmail || 'mailto:noreply@zyndrx.com',
        config.push.vapidPublicKey,
        config.push.vapidPrivateKey
      );
      logger.info('Push notifications initialized with VAPID keys');
    } else {
      logger.warn('VAPID keys not configured. Push notifications will not work.');
    }
  }

  /**
   * Subscribe a user to push notifications
   */
  static async subscribe(userId: string, subscription: PushSubscriptionData, userAgent?: string) {
    try {
      // Check if subscription already exists
      const { data: existing } = await (db.from('push_subscriptions') as any)
        .select('*')
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
        .single();

      const subscriptionData = {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
      };

      if (existing) {
        // Update existing subscription
        const { error } = await (db.from('push_subscriptions') as any)
          .update(subscriptionData)
          .eq('id', existing.id);
        
        if (error) throw error;
        logger.debug('Push subscription updated', { userId, endpoint: subscription.endpoint });
        return existing;
      } else {
        // Create new subscription
        const { data, error } = await (db.from('push_subscriptions') as any)
          .insert(subscriptionData)
          .select()
          .single();
        
        if (error) throw error;
        logger.info('Push subscription created', { userId, endpoint: subscription.endpoint });
        return data;
      }
    } catch (error: any) {
      logger.error('Failed to subscribe to push notifications', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  static async unsubscribe(userId: string, endpoint: string) {
    try {
      const { error } = await (db.from('push_subscriptions') as any)
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

      if (error) throw error;
      logger.info('Push subscription removed', { userId, endpoint });
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to unsubscribe from push notifications', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Unsubscribe user from all push notifications
   */
  static async unsubscribeAll(userId: string) {
    try {
      const { error } = await (db.from('push_subscriptions') as any)
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      logger.info('All push subscriptions removed', { userId });
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to unsubscribe from all push notifications', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all subscriptions for a user
   */
  static async getUserSubscriptions(userId: string) {
    try {
      const { data, error } = await (db.from('push_subscriptions') as any)
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      logger.error('Failed to get user push subscriptions', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send push notification to a user
   */
  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    options?: {
      icon?: string;
      badge?: string;
      data?: any;
      tag?: string;
      requireInteraction?: boolean;
    }
  ) {
    try {
      if (!config.push.vapidPublicKey || !config.push.vapidPrivateKey) {
        logger.warn('VAPID keys not configured. Skipping push notification.');
        return { sent: 0, failed: 0 };
      }

      const subscriptions = await this.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        logger.debug('No push subscriptions found for user', { userId });
        return { sent: 0, failed: 0 };
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: options?.icon || '/logo192.png',
        badge: options?.badge || '/logo192.png',
        tag: options?.tag || 'default',
        data: options?.data || {},
        requireInteraction: options?.requireInteraction || false,
      });

      let sent = 0;
      let failed = 0;

      // Send to all user's subscriptions
      const sendPromises = subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          sent++;
          logger.debug('Push notification sent', { userId, endpoint: sub.endpoint });
        } catch (error: any) {
          failed++;
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            logger.warn('Removing invalid push subscription', {
              userId,
              endpoint: sub.endpoint,
              statusCode: error.statusCode,
            });
            await this.unsubscribe(userId, sub.endpoint);
          } else {
            logger.error('Failed to send push notification', {
              userId,
              endpoint: sub.endpoint,
              error: error.message,
              statusCode: error.statusCode,
            });
          }
        }
      });

      await Promise.allSettled(sendPromises);

      return { sent, failed };
    } catch (error: any) {
      logger.error('Error sending push notification', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get VAPID public key for frontend
   */
  static getVapidPublicKey(): string | null {
    return config.push.vapidPublicKey || null;
  }
}


