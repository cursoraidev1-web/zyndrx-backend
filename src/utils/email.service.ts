import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config';
import logger from './logger';

const baseUrl = config.frontend.url;

// Resend client (requires verified domain)
let resendClient: Resend | null = null;

// Create reusable transporter for SMTP fallback
let transporter: nodemailer.Transporter | null = null;

const getResendClient = (): Resend | null => {
  if (!config.email.resendApiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(config.email.resendApiKey);
  }

  return resendClient;
};

const createTransporter = (): nodemailer.Transporter | null => {
  if (!config.email.smtpUser || !config.email.smtpPassword) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure, // true for 465, false for other ports
    auth: {
      user: config.email.smtpUser,
      pass: config.email.smtpPassword,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false,
      // Use TLS 1.2 or higher
      minVersion: 'TLSv1.2',
    },
    // For port 587 (TLS)
    requireTLS: !config.email.smtp.secure,
    // For port 465 (SSL)
    ignoreTLS: config.email.smtp.secure,
  });

  return transporter;
};

/**
 * Centralized email service for sending transactional emails
 * Uses Resend (requires verified domain) with SMTP fallback
 */
export class EmailService {
  
  /**
   * Send email via Resend (requires verified domain) or SMTP fallback
   */
  static async sendEmail(to: string, subject: string, html: string) {
    if (!config.email.fromAddress) {
      logger.warn('Email from address not configured', { to, subject });
      return;
    }

    // Try Resend first (requires verified domain)
    const resend = getResendClient();
    if (resend) {
      try {
        // Extract email from "Name <email>" format if needed
        const fromMatch = config.email.fromAddress.match(/<([^>]+)>/) || [null, config.email.fromAddress];
        const fromEmail = fromMatch[1] || config.email.fromAddress;
        const fromName = config.email.fromAddress.match(/^(.+?)\s*</)?.[1] || 'Zyndrx';

        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: to,
          subject: subject,
          html: html,
        });

        logger.info('Email sent successfully via Resend', { 
          to, 
          subject, 
          messageId: result.data?.id 
        });
        return;
      } catch (error: any) {
        logger.error('Resend email failed, falling back to SMTP', { 
          to, 
          subject, 
          error: error.message 
        });
        // Fall through to SMTP
      }
    }

    // Fallback to SMTP
    const mailTransporter = createTransporter();
    
    if (!mailTransporter) {
      logger.warn('Email not sent - neither Resend nor SMTP configured', { to, subject });
      logger.info('To enable emails, set RESEND_API_KEY (requires verified domain) or SMTP_USER/SMTP_PASSWORD');
      return;
    }

    try {
      const info = await mailTransporter.sendMail({
        from: config.email.fromAddress,
        to,
        subject,
        html,
      });

      logger.info('Email sent successfully via SMTP', { 
        to, 
        subject, 
        messageId: info.messageId 
      });
    } catch (error: any) {
      logger.error('Failed to send email via SMTP', { 
        to, 
        subject, 
        error: error.message,
        errorCode: error.code 
      });
    }
  }

  /**
   * Send welcome email on user registration
   */
  static async sendWelcomeEmail(email: string, fullName: string, companyName?: string) {
    const subject = 'Welcome to Zyndrx!';
    const html = `
      <h2>Welcome to Zyndrx, ${fullName}!</h2>
      <p>Thank you for signing up. Your account has been successfully created.</p>
      ${companyName ? `<p>Your workspace "<strong>${companyName}</strong>" is ready to use.</p>` : ''}
      <p><a href="${baseUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a></p>
      <p>Best regards,<br>The Zyndrx Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send company creation confirmation email
   */
  static async sendCompanyCreatedEmail(email: string, fullName: string, companyName: string) {
    const subject = `Your workspace "${companyName}" has been created`;
    const html = `
      <h2>Workspace Created!</h2>
      <p>Hi ${fullName},</p>
      <p>Your workspace "<strong>${companyName}</strong>" has been successfully created.</p>
      <p><a href="${baseUrl}/projects" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Create Project</a></p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send project creation notification email
   */
  static async sendProjectCreatedEmail(email: string, fullName: string, projectName: string, projectId: string) {
    const subject = `New project "${projectName}" has been created`;
    const html = `
      <h2>New Project Created</h2>
      <p>Hi ${fullName},</p>
      <p>A new project "<strong>${projectName}</strong>" has been created.</p>
      <p><a href="${baseUrl}/projects/${projectId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Project</a></p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send task assignment notification email
   */
  static async sendTaskAssignedEmail(email: string, fullName: string, taskTitle: string, projectName: string, assignedBy: string, taskId: string) {
    const subject = `New task assigned: ${taskTitle}`;
    const html = `
      <h2>New Task Assigned</h2>
      <p>Hi ${fullName},</p>
      <p><strong>${assignedBy}</strong> has assigned you a task in "<strong>${projectName}</strong>".</p>
      <p>Task: ${taskTitle}</p>
      <p><a href="${baseUrl}/tasks/${taskId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Task</a></p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send PRD creation notification email
   */
  static async sendPRDCreatedEmail(email: string, fullName: string, prdTitle: string, prdId: string, projectName: string) {
    const subject = `New PRD created: ${prdTitle}`;
    const html = `
      <h2>New PRD Created</h2>
      <p>A new PRD "<strong>${prdTitle}</strong>" is ready for project "${projectName}".</p>
      <p><a href="${baseUrl}/prd-designer/${prdId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View PRD</a></p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send comment notification email
   */
  static async sendNewCommentEmail(email: string, fullName: string, commenterName: string, resourceName: string, resourceType: string, content: string) {
    const subject = `New comment on ${resourceType}: ${resourceName}`;
    const html = `
      <h2>New Comment</h2>
      <p>Hi ${fullName},</p>
      <p><strong>${commenterName}</strong> commented on the ${resourceType} "<strong>${resourceName}</strong>":</p>
      <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; color: #555;">${content}</blockquote>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send document creation notification email
   */
  static async sendDocumentCreatedEmail(email: string, fullName: string, documentTitle: string, projectName: string, projectId: string) {
    const subject = `New document uploaded: ${documentTitle}`;
    const html = `
      <h2>New Document Uploaded</h2>
      <p>Hi ${fullName},</p>
      <p>A new document "<strong>${documentTitle}</strong>" was uploaded to "${projectName}".</p>
      <p><a href="${baseUrl}/projects/${projectId}/documents" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Documents</a></p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send project invitation email
   */
  static async sendProjectInvitationEmail(email: string, fullName: string, projectName: string, projectId: string, inviterName: string) {
    const subject = `Invitation: Join project "${projectName}"`;
    const html = `
      <h2>Project Invitation</h2>
      <p>Hi ${fullName},</p>
      <p><strong>${inviterName}</strong> invited you to join "<strong>${projectName}</strong>".</p>
      <p><a href="${baseUrl}/projects/${projectId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Project</a></p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send handoff creation notification email
   */
  static async sendHandoffCreatedEmail(email: string, fullName: string, handoffTitle: string, handoffId: string, fromUserName: string, projectName: string) {
    const subject = `New handoff: ${handoffTitle}`;
    const html = `
      <h2>New Handoff</h2>
      <p><strong>${fromUserName}</strong> created a handoff for you in "${projectName}".</p>
      <p><a href="${baseUrl}/handoffs/${handoffId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Handoff</a></p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send test email (public method for testing)
   */
  static async sendTestEmail(to: string, subject: string, html: string) {
    if (!config.email.fromAddress) {
      logger.warn('Email from address not configured - EMAIL_FROM is missing', { to, subject });
      throw new Error('Email from address is not configured. EMAIL_FROM environment variable is required.');
    }

    // Try Resend first
    const resend = getResendClient();
    if (resend) {
      try {
        const fromMatch = config.email.fromAddress.match(/<([^>]+)>/) || [null, config.email.fromAddress];
        const fromEmail = fromMatch[1] || config.email.fromAddress;
        const fromName = config.email.fromAddress.match(/^(.+?)\s*</)?.[1] || 'Zyndrx';

        logger.info('Attempting to send test email via Resend', { 
          to, 
          subject, 
          from: `${fromName} <${fromEmail}>`
        });

        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: to,
          subject: subject,
          html: html,
        });
        
        logger.info('Test email sent successfully via Resend', { 
          to, 
          subject, 
          messageId: result.data?.id
        });

        return {
          id: result.data?.id,
          accepted: [to],
          rejected: [],
          response: `Resend: ${result.data?.id}`,
        };
      } catch (error: any) {
        logger.error('Failed to send test email via Resend', { 
          to, 
          subject, 
          error: error.message 
        });
        throw new Error(`Resend email failed: ${error.message || 'Unknown error'}`);
      }
    }

    // Fallback to SMTP
    const mailTransporter = createTransporter();
    
    if (!mailTransporter) {
      throw new Error('Email service is not configured. Set RESEND_API_KEY (requires verified domain) or SMTP_USER/SMTP_PASSWORD in your environment variables.');
    }

    try {
      logger.info('Verifying SMTP connection...', {
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
      });

      await mailTransporter.verify();

      logger.info('SMTP connection verified successfully');

      const emailData = {
        from: config.email.fromAddress,
        to,
        subject,
        html,
      };

      logger.info('Attempting to send test email via SMTP', { 
        to, 
        subject, 
        from: config.email.fromAddress,
        smtpHost: config.email.smtp.host,
        smtpPort: config.email.smtp.port,
        smtpSecure: config.email.smtp.secure,
      });

      const result = await mailTransporter.sendMail(emailData);
      
      logger.info('Test email sent successfully via SMTP', { 
        to, 
        subject, 
        messageId: result.messageId,
        response: result.response,
      });

      return {
        id: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
      };
    } catch (error: any) {
      logger.error('Failed to send test email via SMTP', { 
        to, 
        subject, 
        from: config.email.fromAddress,
        error: error.message,
        errorCode: error.code,
        errorCommand: error.command,
        stack: error.stack
      });
      
      // Provide more helpful error messages
      if (error.code === 'EAUTH' || error.message?.includes('Invalid login') || error.message?.includes('authentication')) {
        throw new Error('Email sending failed: Invalid SMTP credentials. Please check your SMTP_USER and SMTP_PASSWORD.');
      }
      
      if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.message?.includes('connection') || error.message?.includes('timeout')) {
        throw new Error(`Email sending failed: Connection timeout. Your hosting platform (Render/Vercel/etc.) likely blocks SMTP ports. Please use Resend (set RESEND_API_KEY) instead.`);
      }

      if (error.code === 'ESOCKET' || error.message?.includes('socket')) {
        throw new Error('Email sending failed: Socket error. The SMTP port might be blocked by your firewall or network. Try using port 465 with SMTP_SECURE=true, or use Resend instead.');
      }

      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        throw new Error('Email sending failed: Rate limit exceeded. Please try again later or use Resend for better reliability.');
      }

      throw new Error(`Failed to send email: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, fullName: string, resetUrl: string) {
    const subject = 'Reset your Zyndrx password';
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hi ${fullName},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${resetUrl}</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send company invitation email (for new users)
   */
  static async sendCompanyInvitationEmail(email: string, companyName: string, inviteLink: string) {
    const subject = `You've been invited to join ${companyName} on Zyndrx`;
    const html = `
      <h2>You've been invited!</h2>
      <p>You have been invited to join <strong>${companyName}</strong> on Zyndrx.</p>
      <p>Click the link below to create your account and accept the invitation:</p>
      <p><a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
      <p>This invitation link expires in 7 days.</p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${inviteLink}</p>
      <p>If you didn't request this invitation, you can safely ignore this email.</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send notification email when existing user is added to company
   */
  static async sendCompanyMemberAddedEmail(email: string, companyName: string, companyUrl: string) {
    const subject = `You've been added to ${companyName} on Zyndrx`;
    const html = `
      <h2>Welcome to ${companyName}!</h2>
      <p>You have been added as a member of <strong>${companyName}</strong> on Zyndrx.</p>
      <p>Click the link below to access your workspace:</p>
      <p><a href="${companyUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Workspace</a></p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${companyUrl}</p>
      <p>Best regards,<br>The Zyndrx Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }
}

export default EmailService;
