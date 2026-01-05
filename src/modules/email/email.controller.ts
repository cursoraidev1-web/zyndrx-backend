import { Request, Response } from 'express';
import { EmailService } from '../../utils/email.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import { AppError } from '../../middleware/error.middleware';
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

    const { to, subject, html, template } = req.body;

    // Validate required fields
    if (!to || !subject) {
      throw new AppError('Email address and subject are required', 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new AppError('Invalid email address', 400);
    }

    try {
      // If template is provided, use predefined templates
      let emailHtml = html;
      
      if (template && !html) {
        switch (template) {
          case 'welcome':
            emailHtml = `
              <h2>Welcome to Zyndrx!</h2>
              <p>This is a test welcome email.</p>
              <p>If you received this, the email system is working correctly.</p>
              <p>Best regards,<br>The Zyndrx Team</p>
            `;
            break;
          case 'notification':
            emailHtml = `
              <h2>Test Notification</h2>
              <p>This is a test notification email.</p>
              <p>The email system is functioning properly.</p>
            `;
            break;
          case 'invitation':
            emailHtml = `
              <h2>Test Invitation</h2>
              <p>This is a test invitation email.</p>
              <p>You can use this to verify email delivery.</p>
            `;
            break;
          default:
            emailHtml = html || '<p>Test email from Zyndrx</p>';
        }
      }

      // Send test email using the public test method
      const emailResult = await EmailService.sendTestEmail(to, subject, emailHtml || '<p>Test email</p>');

      logger.info('Test email sent', { 
        to, 
        subject, 
        userId: req.user.id,
        template: template || 'custom',
        emailId: emailResult?.id
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
}

