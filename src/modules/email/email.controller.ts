import { Request, Response } from 'express';
import { EmailService } from '../../utils/email.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import { AppError } from '../../middleware/error.middleware';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import logger from '../../utils/logger';

export class EmailController {
  /**
   * POST /api/v1/email/test
   * Send a test email
   * @access Authenticated (Admin/Editor)
   */
  sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const companyId = req.user.companyId;
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const { to, subject, html } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      throw new AppError('Email address, subject, and HTML content are required', 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new AppError('Invalid email address', 400);
    }

    // Check email limit before sending
    const limitCheck = await SubscriptionService.checkEmailLimit(companyId);
    if (!limitCheck.allowed) {
      return ResponseHandler.error(
        res,
        limitCheck.message || 'Daily email limit reached',
        429
      );
    }

    try {
      // Send test email using the public test method
      const emailResult = await EmailService.sendTestEmail(to, subject, html);

      // Track email usage after successful send
      await SubscriptionService.trackEmailUsage(companyId);

      logger.info('Test email sent', { 
        to, 
        subject, 
        userId: req.user.id,
        companyId,
        emailId: emailResult?.id,
        remaining: limitCheck.remaining
      });

      return ResponseHandler.success(
        res,
        { 
          to, 
          subject, 
          sent: true,
          messageId: emailResult?.id,
          accepted: emailResult?.accepted,
          rejected: emailResult?.rejected,
          message: emailResult?.id 
            ? 'Test email sent successfully via Gmail SMTP. Check your inbox (and spam folder).' 
            : 'Test email queued for sending. Check your inbox (and spam folder).'
        },
        'Test email sent successfully'
      );
    } catch (error: any) {
      logger.error('Failed to send test email', { 
        error: error.message, 
        to, 
        userId: req.user.id 
      });
      throw new AppError(
        `Failed to send test email: ${error.message || 'Unknown error'}`,
        500
      );
    }
  });

  /**
   * GET /api/v1/email/templates
   * Get available email templates
   * @access Authenticated
   */
  getTemplates = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const templates = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        description: 'Welcome email template for new users',
      },
      {
        id: 'notification',
        name: 'Notification Email',
        description: 'General notification template',
      },
      {
        id: 'invitation',
        name: 'Invitation Email',
        description: 'Invitation template for team members',
      },
    ];

    return ResponseHandler.success(res, { templates }, 'Templates retrieved successfully');
  });

  /**
   * GET /api/v1/email/usage
   * Get email usage and limits for current company
   * @access Authenticated
   */
  getEmailUsage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const companyId = req.user.companyId;
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const usage = await SubscriptionService.getEmailUsage(companyId);
    const subscription = await SubscriptionService.getCompanySubscription(companyId);
    
      return ResponseHandler.success(res, {
        ...usage,
        planType: subscription?.planType || 'free',
        planName: subscription?.planType === 'free' ? 'Free' : 
                  subscription?.planType === 'pro' ? 'Pro' : 
                  subscription?.planType === 'enterprise' ? 'Enterprise' : 'Free',
        isUnlimited: usage.maxLimit === -1,
      }, 'Email usage retrieved successfully');
  });

  /**
   * POST /api/v1/email/resend-test
   * Send a test email via Resend (for Postman/testing)
   * @access Public (for testing purposes)
   */
  sendResendTestEmail = asyncHandler(async (req: Request, res: Response) => {
    const { to, subject, html, text } = req.body;

    // Validate required fields
    if (!to || !subject) {
      throw new AppError('Email address (to) and subject are required', 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new AppError('Invalid email address', 400);
    }

    try {
      // Use EmailService which handles Resend automatically
      const emailHtml = html || text || '<p>Test email from Zyndrx Resend API</p>';
      const emailResult = await EmailService.sendTestEmail(to, subject, emailHtml);

      logger.info('Resend test email sent', { 
        to, 
        subject, 
        messageId: emailResult?.id
      });

      return ResponseHandler.success(
        res,
        { 
          to, 
          subject, 
          sent: true,
          messageId: emailResult?.id,
          accepted: emailResult?.accepted,
          rejected: emailResult?.rejected,
          response: emailResult?.response,
          message: 'Test email sent successfully via Resend. Check your inbox!'
        },
        'Test email sent successfully'
      );
    } catch (error: any) {
      logger.error('Failed to send Resend test email', { 
        error: error.message, 
        to
      });
      throw new AppError(
        `Failed to send test email: ${error.message || 'Unknown error'}`,
        500
      );
    }
  });
}

