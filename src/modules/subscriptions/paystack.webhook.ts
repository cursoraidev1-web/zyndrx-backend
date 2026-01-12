import { Request, Response } from 'express';
import { PaystackService } from '../../services/paystack.service';
import { SubscriptionService } from './subscriptions.service';
import { ResponseHandler } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { supabaseAdmin } from '../../config/supabase';

const db = supabaseAdmin;

/**
 * Paystack Webhook Handler
 * Handles Paystack webhook events for payment processing
 */
export class PaystackWebhookController {
  /**
   * Handle Paystack webhook events
   * POST /api/v1/subscription/paystack-webhook
   */
  static handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    // Get webhook signature from headers
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      logger.warn('Paystack webhook received without signature');
      return ResponseHandler.error(res, 'Missing webhook signature', 400);
    }

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    
    // Verify webhook signature
    const isValid = PaystackService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Invalid Paystack webhook signature', {
        signature: signature.substring(0, 20) + '...',
      });
      return ResponseHandler.error(res, 'Invalid webhook signature', 401);
    }

    const event = req.body;
    logger.info('Paystack webhook received', {
      event: event.event,
      reference: event.data?.reference,
    });

    try {
      switch (event.event) {
        case 'charge.success':
          await PaystackWebhookController.handleChargeSuccess(event.data);
          break;

        case 'subscription.create':
          await PaystackWebhookController.handleSubscriptionCreate(event.data);
          break;

        case 'subscription.disable':
          await PaystackWebhookController.handleSubscriptionDisable(event.data);
          break;

        case 'invoice.payment_failed':
          await PaystackWebhookController.handlePaymentFailed(event.data);
          break;

        case 'subscription.not_renew':
          await PaystackWebhookController.handleSubscriptionNotRenew(event.data);
          break;

        default:
          logger.info('Unhandled Paystack webhook event', { event: event.event });
      }

      // Always return 200 to acknowledge receipt
      return ResponseHandler.success(res, { received: true }, 'Webhook processed');
    } catch (error: any) {
      logger.error('Error processing Paystack webhook', {
        error: error.message,
        event: event.event,
        reference: event.data?.reference,
      });
      // Still return 200 to prevent Paystack from retrying
      return ResponseHandler.success(res, { received: true, error: error.message }, 'Webhook received but processing failed');
    }
  });

  /**
   * Handle successful charge
   */
  private static async handleChargeSuccess(data: any) {
    const { reference, customer, metadata } = data;
    
    logger.info('Processing charge.success', { reference, customer: customer?.email });

    // Verify the transaction
    const verification = await PaystackService.verifyPayment(reference);
    if (!verification.status || verification.data.status !== 'success') {
      logger.warn('Charge marked as success but verification failed', { reference });
      return;
    }

    // Extract company ID from metadata
    const companyId = metadata?.company_id;
    if (!companyId) {
      logger.warn('Charge success but no company_id in metadata', { reference });
      return;
    }

    // Update subscription status
    const subscription = await SubscriptionService.getCompanySubscription(companyId);
    if (!subscription) {
      logger.warn('Subscription not found for company', { companyId, reference });
      return;
    }

    // Update subscription with payment details
    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

    await (db.from('subscriptions') as any)
      .update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        paystack_customer_code: customer?.customer_code || subscription.paystackCustomerCode,
        paystack_authorization_code: verification.data.authorization?.authorization_code || subscription.paystackAuthorizationCode,
        cancel_at_period_end: false,
      })
      .eq('company_id', companyId);

    logger.info('Subscription activated via webhook', { companyId, reference });
  }

  /**
   * Handle subscription creation
   */
  private static async handleSubscriptionCreate(data: any) {
    const { subscription_code, customer, plan } = data;
    const companyId = data.metadata?.company_id;

    logger.info('Processing subscription.create', {
      subscription_code,
      companyId,
      customer: customer?.email,
    });

    if (!companyId) {
      logger.warn('Subscription created but no company_id in metadata', { subscription_code });
      return;
    }

    // Update subscription with Paystack subscription code
    await (db.from('subscriptions') as any)
      .update({
        paystack_subscription_code: subscription_code,
        paystack_customer_code: customer?.customer_code,
        status: 'active',
      })
      .eq('company_id', companyId);

    logger.info('Subscription code stored', { companyId, subscription_code });
  }

  /**
   * Handle subscription disable
   */
  private static async handleSubscriptionDisable(data: any) {
    const { subscription_code, customer } = data;
    
    logger.info('Processing subscription.disable', {
      subscription_code,
      customer: customer?.email,
    });

    // Find subscription by code
    const { data: subscriptions } = await (db.from('subscriptions') as any)
      .select('id, company_id')
      .eq('paystack_subscription_code', subscription_code)
      .limit(1);

    if (!subscriptions || subscriptions.length === 0) {
      logger.warn('Subscription not found for disable event', { subscription_code });
      return;
    }

    const subscription = subscriptions[0];

    // Update subscription status
    await (db.from('subscriptions') as any)
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
      })
      .eq('id', subscription.id);

    logger.info('Subscription disabled via webhook', {
      companyId: subscription.company_id,
      subscription_code,
    });
  }

  /**
   * Handle payment failure
   */
  private static async handlePaymentFailed(data: any) {
    const { subscription_code, customer } = data;
    
    logger.warn('Processing invoice.payment_failed', {
      subscription_code,
      customer: customer?.email,
    });

    // Find subscription by code
    const { data: subscriptions } = await (db.from('subscriptions') as any)
      .select('id, company_id')
      .eq('paystack_subscription_code', subscription_code)
      .limit(1);

    if (!subscriptions || subscriptions.length === 0) {
      logger.warn('Subscription not found for payment failed event', { subscription_code });
      return;
    }

    const subscription = subscriptions[0];

    // Update subscription status but don't cancel immediately
    // Give user time to update payment method
    await (db.from('subscriptions') as any)
      .update({
        status: 'expired',
      })
      .eq('id', subscription.id);

    logger.info('Subscription marked as expired due to payment failure', {
      companyId: subscription.company_id,
      subscription_code,
    });
  }

  /**
   * Handle subscription not renewing
   */
  private static async handleSubscriptionNotRenew(data: any) {
    const { subscription_code } = data;
    
    logger.info('Processing subscription.not_renew', { subscription_code });

    // Find subscription by code
    const { data: subscriptions } = await (db.from('subscriptions') as any)
      .select('id, company_id')
      .eq('paystack_subscription_code', subscription_code)
      .limit(1);

    if (!subscriptions || subscriptions.length === 0) {
      logger.warn('Subscription not found for not_renew event', { subscription_code });
      return;
    }

    const subscription = subscriptions[0];

    // Mark subscription to cancel at period end
    await (db.from('subscriptions') as any)
      .update({
        cancel_at_period_end: true,
      })
      .eq('id', subscription.id);

    logger.info('Subscription marked to cancel at period end', {
      companyId: subscription.company_id,
      subscription_code,
    });
  }
}
