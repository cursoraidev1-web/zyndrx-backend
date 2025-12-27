import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export interface PlanLimit {
  planType: 'free' | 'pro' | 'enterprise';
  maxProjects: number;
  maxTasks: number;
  maxTeamMembers: number;
  maxDocuments: number;
  maxStorageGB: number;
  features?: any;
}

export interface Subscription {
  id: string;
  companyId: string;
  planType: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  trialStartDate?: string;
  trialEndDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface Usage {
  projectsCount: number;
  tasksCount: number;
  teamMembersCount: number;
  documentsCount: number;
  storageUsedGB: number;
}

export class SubscriptionService {
  /**
   * Create default subscription for new company (free plan with 30-day trial)
   */
  static async createDefaultSubscription(companyId: string) {
    try {
      // Check if subscription already exists (to avoid UNIQUE constraint violation)
      const existing = await this.getCompanySubscription(companyId);
      if (existing) {
        logger.info('Subscription already exists for company', { companyId });
        return existing;
      }

      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial

      const { data: subscription, error } = await (db.from('subscriptions') as any)
        .insert({
          company_id: companyId,
          plan_type: 'free',
          status: 'trial',
          trial_start_date: trialStartDate.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Log full error details for debugging
        logger.error('Failed to create subscription', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          companyId
        });
        
        // Handle UNIQUE constraint violation gracefully
        if (error.code === '23505') { // Unique violation
          logger.warn('Subscription already exists (unique constraint)', { companyId });
          // Try to fetch existing subscription
          const existing = await this.getCompanySubscription(companyId);
          if (existing) return existing;
        }
        
        throw new AppError(
          `Failed to create subscription: ${error.message || error.code || 'Unknown error'}`,
          500
        );
      }

      return subscription;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('Subscription creation error', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        companyId
      });
      
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to create subscription',
        500
      );
    }
  }

  /**
   * Get subscription for company
   */
  static async getCompanySubscription(companyId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await db
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new AppError(error.message, 500);
      }

      if (!data) return null;

      const subscription = data as any;
      return {
        id: subscription.id,
        companyId: subscription.company_id,
        planType: subscription.plan_type,
        status: subscription.status,
        trialStartDate: subscription.trial_start_date,
        trialEndDate: subscription.trial_end_date,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch subscription', 500);
    }
  }

  /**
   * Get plan limits
   */
  static async getPlanLimits(planType: 'free' | 'pro' | 'enterprise'): Promise<PlanLimit | null> {
    try {
      const { data, error } = await db
        .from('plan_limits')
        .select('*')
        .eq('plan_type', planType)
        .single();

      if (error || !data) return null;

      const plan = data as any;
      return {
        planType: plan.plan_type,
        maxProjects: plan.max_projects,
        maxTasks: plan.max_tasks,
        maxTeamMembers: plan.max_team_members,
        maxDocuments: plan.max_documents,
        maxStorageGB: plan.max_storage_gb,
        features: plan.features,
      };
    } catch (error) {
      logger.error('Failed to fetch plan limits', { error });
      return null;
    }
  }

  /**
   * Get all available plans
   */
  static async getAllPlans(): Promise<PlanLimit[]> {
    try {
      const { data, error } = await db
        .from('plan_limits')
        .select('*')
        .order('plan_type');

      if (error) throw new AppError(error.message, 500);

      return (data || []).map((plan: any) => ({
        planType: plan.plan_type,
        maxProjects: plan.max_projects,
        maxTasks: plan.max_tasks,
        maxTeamMembers: plan.max_team_members,
        maxDocuments: plan.max_documents,
        maxStorageGB: plan.max_storage_gb,
        features: plan.features,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch plans', 500);
    }
  }

  /**
   * Get company usage statistics
   */
  static async getCompanyUsage(companyId: string): Promise<Usage> {
    try {
      // Count projects
      const { count: projectsCount } = await db
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Count tasks
      const { count: tasksCount } = await db
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Count team members
      const { count: teamMembersCount } = await db
        .from('user_companies')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active');

      // Count documents
      const { count: documentsCount } = await db
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Calculate storage (sum of file sizes)
      const { data: documents } = await db
        .from('documents')
        .select('file_size')
        .eq('company_id', companyId);

      const storageUsedBytes = (documents || []).reduce((sum: number, doc: any) => {
        return sum + (doc.file_size || 0);
      }, 0);

      const storageUsedGB = storageUsedBytes / (1024 * 1024 * 1024); // Convert bytes to GB

      return {
        projectsCount: projectsCount || 0,
        tasksCount: tasksCount || 0,
        teamMembersCount: teamMembersCount || 0,
        documentsCount: documentsCount || 0,
        storageUsedGB: Math.round(storageUsedGB * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      logger.error('Failed to calculate usage', { error });
      throw new AppError('Failed to calculate usage', 500);
    }
  }

  /**
   * Check if company can create resource
   */
  static async checkLimit(
    companyId: string,
    resourceType: 'project' | 'task' | 'team_member' | 'document'
  ): Promise<{ allowed: boolean; message?: string; currentUsage?: number; maxLimit?: number }> {
    try {
      const subscription = await this.getCompanySubscription(companyId);
      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Check if trial expired
      if (subscription.status === 'trial' && subscription.trialEndDate) {
        const trialEnd = new Date(subscription.trialEndDate);
        if (trialEnd < new Date()) {
          // Trial expired, update status
          await (db.from('subscriptions') as any)
            .update({ status: 'expired' })
            .eq('id', subscription.id);
          
          return {
            allowed: false,
            message: 'Your trial has expired. Please upgrade to continue using the platform.',
          };
        }
      }

      // Check if subscription is active
      if (subscription.status === 'expired' || subscription.status === 'cancelled') {
        return {
          allowed: false,
          message: 'Your subscription has expired or been cancelled. Please upgrade to continue.',
        };
      }

      const limits = await this.getPlanLimits(subscription.planType);
      if (!limits) {
        throw new AppError('Plan limits not found', 500);
      }

      const usage = await this.getCompanyUsage(companyId);

      let maxLimit: number;
      let currentUsage: number;

      switch (resourceType) {
        case 'project':
          maxLimit = limits.maxProjects;
          currentUsage = usage.projectsCount;
          break;
        case 'task':
          maxLimit = limits.maxTasks;
          currentUsage = usage.tasksCount;
          break;
        case 'team_member':
          maxLimit = limits.maxTeamMembers;
          currentUsage = usage.teamMembersCount;
          break;
        case 'document':
          maxLimit = limits.maxDocuments;
          currentUsage = usage.documentsCount;
          break;
        default:
          return { allowed: true };
      }

      // -1 means unlimited
      if (maxLimit === -1) {
        return { allowed: true };
      }

      if (currentUsage >= maxLimit) {
        const resourceName = resourceType.replace('_', ' ');
        return {
          allowed: false,
          message: `Plan limit reached: You have reached the maximum number of ${resourceName}s (${maxLimit}) for your ${subscription.planType} plan. Upgrade to Pro to create unlimited ${resourceName}s.`,
          currentUsage,
          maxLimit,
        };
      }

      return { allowed: true, currentUsage, maxLimit };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to check limit', { error });
      throw new AppError('Failed to check limit', 500);
    }
  }

  /**
   * Upgrade subscription
   */
  static async upgradeSubscription(
    companyId: string,
    planType: 'pro' | 'enterprise',
    userId: string
  ) {
    try {
      // Verify user is admin of company
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();

      const member = membership as any;
      if (!member || member.role !== 'admin') {
        throw new AppError('Only company admins can upgrade subscription', 403);
      }

      // Get current subscription
      const currentSubscription = await this.getCompanySubscription(companyId);
      if (!currentSubscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Calculate new period dates
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month from now

      // Update subscription
      const { data: subscription, error } = await (db.from('subscriptions') as any)
        .update({
          plan_type: planType,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          trial_start_date: null,
          trial_end_date: null,
        })
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        throw new AppError(error.message, 500);
      }

      return subscription;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to upgrade subscription', 500);
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    companyId: string,
    cancelImmediately: boolean,
    userId: string
  ) {
    try {
      // Verify user is admin
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();

      const member = membership as any;
      if (!member || member.role !== 'admin') {
        throw new AppError('Only company admins can cancel subscription', 403);
      }

      if (cancelImmediately) {
        // Cancel immediately
        const { data, error } = await (db.from('subscriptions') as any)
          .update({
            status: 'cancelled',
            cancel_at_period_end: false,
          })
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) throw new AppError(error.message, 500);
        return data;
      } else {
        // Cancel at period end
        const { data, error } = await (db.from('subscriptions') as any)
          .update({
            cancel_at_period_end: true,
          })
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) throw new AppError(error.message, 500);
        return data;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cancel subscription', 500);
    }
  }

  /**
   * Get subscription with limits and usage
   */
  static async getSubscriptionDetails(companyId: string) {
    try {
      const subscription = await this.getCompanySubscription(companyId);
      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      const limits = await this.getPlanLimits(subscription.planType);
      if (!limits) {
        throw new AppError('Plan limits not found', 500);
      }

      const usage = await this.getCompanyUsage(companyId);

      return {
        subscription: {
          plan: {
            type: subscription.planType,
            name: this.getPlanName(subscription.planType),
            status: subscription.status,
            trialEndDate: subscription.trialEndDate,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          },
          limits: {
            maxProjects: limits.maxProjects,
            maxTasks: limits.maxTasks,
            maxTeamMembers: limits.maxTeamMembers,
            maxDocuments: limits.maxDocuments,
            maxStorageGB: limits.maxStorageGB,
          },
          usage: {
            projectsCount: usage.projectsCount,
            tasksCount: usage.tasksCount,
            teamMembersCount: usage.teamMembersCount,
            documentsCount: usage.documentsCount,
            storageUsedGB: usage.storageUsedGB,
          },
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get subscription details', 500);
    }
  }

  /**
   * Get plan name
   */
  private static getPlanName(planType: string): string {
    const names: Record<string, string> = {
      free: 'Free Plan',
      pro: 'Pro Plan',
      enterprise: 'Enterprise Plan',
    };
    return names[planType] || planType;
  }
}

