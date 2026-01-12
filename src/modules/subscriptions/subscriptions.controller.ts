import { Request, Response } from 'express';
import { SubscriptionService } from './subscriptions.service';
import { PaystackService } from '../../services/paystack.service';
import { ResponseHandler } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { asyncHandler } from '../../middleware/error.middleware';

export class SubscriptionController {
  /**
   * Get current subscription
   * GET /api/v1/subscription
   */
  getCurrentSubscription = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const details = await SubscriptionService.getSubscriptionDetails(companyId);
    return ResponseHandler.success(res, details.subscription);
  });

  /**
   * Get available plans
   * GET /api/v1/plans
   */
  getAvailablePlans = asyncHandler(async (req: Request, res: Response) => {
    const plans = await SubscriptionService.getAllPlans();
    
    // Format for frontend
    const formattedPlans = plans.map((plan) => ({
      type: plan.planType,
      name: this.getPlanName(plan.planType),
      price: this.getPlanPrice(plan.planType),
      billingPeriod: 'month' as const,
      features: this.getPlanFeatures(plan.planType),
      limits: {
        maxProjects: plan.maxProjects,
        maxTasks: plan.maxTasks,
        maxTeamMembers: plan.maxTeamMembers,
        maxDocuments: plan.maxDocuments,
        maxStorageGB: plan.maxStorageGB,
      },
      trialDays: plan.planType === 'free' ? 30 : undefined,
    }));

    return ResponseHandler.success(res, formattedPlans);
  });

  /**
   * Upgrade subscription
   * POST /api/v1/subscription/upgrade
   */
  upgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const userId = req.user!.id;
    const { planType } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!planType || !['pro', 'enterprise'].includes(planType)) {
      return ResponseHandler.error(res, 'Invalid plan type. Must be "pro" or "enterprise"', 400);
    }

    const subscription = await SubscriptionService.upgradeSubscription(
      companyId,
      planType,
      userId
    );

    const limits = await SubscriptionService.getPlanLimits(planType);

    return ResponseHandler.success(
      res,
      {
        subscription: {
          plan: {
            type: subscription.plan_type,
            name: this.getPlanName(subscription.plan_type),
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
          },
          limits: limits
            ? {
                maxProjects: limits.maxProjects,
                maxTasks: limits.maxTasks,
                maxTeamMembers: limits.maxTeamMembers,
                maxDocuments: limits.maxDocuments,
                maxStorageGB: limits.maxStorageGB,
              }
            : null,
        },
      },
      'Subscription upgraded successfully'
    );
  });

  /**
   * Cancel subscription
   * POST /api/v1/subscription/cancel
   */
  cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const userId = req.user!.id;
    const { cancelImmediately } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const subscription = await SubscriptionService.cancelSubscription(
      companyId,
      cancelImmediately || false,
      userId
    );

    return ResponseHandler.success(
      res,
      {
        subscription: {
          plan: {
            type: subscription.plan_type,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: subscription.current_period_end,
          },
        },
      },
      cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the billing period'
    );
  });

  /**
   * Verify payment
   * POST /api/v1/subscription/verify-payment
   */
  verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const { reference } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!reference) {
      return ResponseHandler.error(res, 'Payment reference is required', 400);
    }

    try {
      // Verify payment with Paystack
      const verification = await PaystackService.verifyPayment(reference);

      if (!verification.status || verification.data.status !== 'success') {
        return ResponseHandler.error(
          res,
          'Payment verification failed',
          400
        );
      }

      // Get subscription for company
      const subscription = await SubscriptionService.getCompanySubscription(companyId);
      if (!subscription) {
        return ResponseHandler.error(res, 'Subscription not found', 404);
      }

      // Update subscription with payment details
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { supabaseAdmin } = await import('../../config/supabase');
      const { data: updatedSubscription, error } = await (supabaseAdmin.from('subscriptions') as any)
        .update({
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          paystack_customer_code: verification.data.customer?.customer_code || subscription.paystackCustomerCode,
          paystack_authorization_code: verification.data.authorization?.authorization_code || subscription.paystackAuthorizationCode,
          cancel_at_period_end: false,
        })
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update subscription after payment verification', { error, companyId, reference });
        throw new AppError('Failed to update subscription', 500);
      }

      logger.info('Payment verified and subscription updated', { companyId, reference });

      return ResponseHandler.success(
        res,
        {
          verified: true,
          subscription: {
            plan: {
              type: updatedSubscription.plan_type,
              status: updatedSubscription.status,
              currentPeriodEnd: updatedSubscription.current_period_end,
            },
          },
        },
        'Payment verified successfully'
      );
    } catch (error: any) {
      logger.error('Payment verification error', { error: error.message, companyId, reference });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to verify payment', 500);
    }
  });

  /**
   * Check plan limits
   * GET /api/v1/subscription/limits
   */
  checkLimits = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const { resource } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const details = await SubscriptionService.getSubscriptionDetails(companyId);

    // If specific resource requested, check that limit
    if (resource && typeof resource === 'string') {
      const resourceType = resource as 'project' | 'task' | 'team_member' | 'document';
      const check = await SubscriptionService.checkLimit(companyId, resourceType);

      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          error: check.message || 'Limit reached',
          limitType: resource,
          currentUsage: check.currentUsage,
          maxLimit: check.maxLimit,
        });
      }
    }

    // Calculate what can be created
    const canCreate = {
      project: details.subscription.usage.projectsCount < (details.subscription.limits.maxProjects === -1 ? Infinity : details.subscription.limits.maxProjects),
      task: details.subscription.usage.tasksCount < (details.subscription.limits.maxTasks === -1 ? Infinity : details.subscription.limits.maxTasks),
      teamMember: details.subscription.usage.teamMembersCount < (details.subscription.limits.maxTeamMembers === -1 ? Infinity : details.subscription.limits.maxTeamMembers),
      document: details.subscription.usage.documentsCount < (details.subscription.limits.maxDocuments === -1 ? Infinity : details.subscription.limits.maxDocuments),
    };

    return ResponseHandler.success(res, {
      limits: details.subscription.limits,
      usage: details.subscription.usage,
      canCreate,
    });
  });

  private getPlanName(planType: string): string {
    const names: Record<string, string> = {
      free: 'Free Plan',
      pro: 'Pro Plan',
      enterprise: 'Enterprise Plan',
    };
    return names[planType] || planType;
  }

  private getPlanPrice(planType: string): number {
    const prices: Record<string, number> = {
      free: 0,
      pro: 29,
      enterprise: 99,
    };
    return prices[planType] || 0;
  }

  private getPlanFeatures(planType: string): string[] {
    const features: Record<string, string[]> = {
      free: [
        '3 projects',
        '50 tasks per project',
        '5 team members',
        '20 documents',
        '1 GB storage',
        'Basic analytics',
        'Email support',
      ],
      pro: [
        'Unlimited projects',
        'Unlimited tasks',
        '25 team members',
        'Unlimited documents',
        '50 GB storage',
        'Advanced analytics',
        'Priority support',
        'Custom integrations',
      ],
      enterprise: [
        'Unlimited everything',
        'Unlimited team members',
        'Unlimited storage',
        'Advanced analytics & reporting',
        'Dedicated support',
        'Custom integrations',
        'SSO',
        'Advanced security',
        'Custom SLA',
      ],
    };
    return features[planType] || [];
  }
}

