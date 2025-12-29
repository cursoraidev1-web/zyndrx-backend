import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';

export interface SecurityEventData {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, any>;
}

export class SecurityService {
  // Maximum failed login attempts before lockout
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  // Lockout duration in minutes
  private static readonly LOCKOUT_DURATION_MINUTES = 30;

  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('locked_until')
        .eq('id', userId)
        .single();

      if (!user) return false;

      const userData = user as any;
      if (!userData.locked_until) return false;

      const lockUntil = new Date(userData.locked_until);
      const now = new Date();

      // If lock expired, unlock the account
      if (now > lockUntil) {
        await this.unlockAccount(userId);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error checking account lock status', { error, userId });
      return false;
    }
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedLogin(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Find user by email
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, failed_login_attempts')
        .eq('email', email)
        .single();

      if (!user) {
        // User doesn't exist, but log the attempt anyway
        await this.logSecurityEvent({
          eventType: 'login_failed',
          ipAddress,
          userAgent,
          success: false,
          details: { email, reason: 'user_not_found' },
        });
        return;
      }

      const userData = user as any;
      const newAttemptCount = (userData.failed_login_attempts || 0) + 1;

      // Update failed attempts
      await (supabaseAdmin.from('users') as any)
        .update({
          failed_login_attempts: newAttemptCount,
          last_failed_login: new Date().toISOString(),
        })
        .eq('id', userData.id);

      // Lock account if max attempts reached
      if (newAttemptCount >= this.MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

        await (supabaseAdmin.from('users') as any)
          .update({
            locked_until: lockUntil.toISOString(),
          })
          .eq('id', userData.id);

        await this.logSecurityEvent({
          userId: userData.id,
          eventType: 'account_locked',
          ipAddress,
          userAgent,
          success: false,
          details: { email, attempts: newAttemptCount, lockUntil: lockUntil.toISOString() },
        });

        logger.warn('Account locked due to failed login attempts', {
          userId: userData.id,
          email,
          attempts: newAttemptCount,
        });
      } else {
        await this.logSecurityEvent({
          userId: userData.id,
          eventType: 'login_failed',
          ipAddress,
          userAgent,
          success: false,
          details: { email, attempts: newAttemptCount },
        });
      }
    } catch (error) {
      logger.error('Error recording failed login', { error, email });
    }
  }

  /**
   * Reset failed login attempts on successful login
   */
  static async resetFailedAttempts(userId: string): Promise<void> {
    try {
      await (supabaseAdmin.from('users') as any)
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_failed_login: null,
        })
        .eq('id', userId);
    } catch (error) {
      logger.error('Error resetting failed attempts', { error, userId });
    }
  }

  /**
   * Unlock account manually
   */
  static async unlockAccount(userId: string): Promise<void> {
    try {
      await (supabaseAdmin.from('users') as any)
        .update({
          failed_login_attempts: 0,
          locked_until: null,
        })
        .eq('id', userId);

      await this.logSecurityEvent({
        userId,
        eventType: 'account_unlocked',
        success: true,
        details: { reason: 'lock_expired_or_manual' },
      });
    } catch (error) {
      logger.error('Error unlocking account', { error, userId });
    }
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(data: SecurityEventData): Promise<void> {
    try {
      await (supabaseAdmin.from('security_events') as any).insert({
        user_id: data.userId || null,
        event_type: data.eventType,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        success: data.success,
        details: data.details || {},
      });
    } catch (error) {
      logger.error('Error logging security event', { error, data });
    }
  }

  /**
   * Get remaining lockout time in minutes
   */
  static async getRemainingLockoutTime(userId: string): Promise<number | null> {
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('locked_until')
        .eq('id', userId)
        .single();

      if (!user) return null;

      const userData = user as any;
      if (!userData.locked_until) return null;

      const lockUntil = new Date(userData.locked_until);
      const now = new Date();

      if (now > lockUntil) {
        await this.unlockAccount(userId);
        return null;
      }

      return Math.ceil((lockUntil.getTime() - now.getTime()) / (1000 * 60));
    } catch (error) {
      logger.error('Error getting lockout time', { error, userId });
      return null;
    }
  }
}

