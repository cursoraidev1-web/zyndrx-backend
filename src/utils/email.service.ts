import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from './logger';

const baseUrl = config.frontend.url;

// Create reusable transporter for Gmail SMTP
let transporter: nodemailer.Transporter | null = null;

const createTransporter = (): nodemailer.Transporter | null => {
  if (!config.email.gmailUser || !config.email.gmailAppPassword) {
    logger.warn('Gmail SMTP not configured - GMAIL_USER or GMAIL_APP_PASSWORD is missing');
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
      user: config.email.gmailUser,
      pass: config.email.gmailAppPassword, // Gmail App Password
    },
  });

  return transporter;
};

/**
 * Centralized email service for sending transactional emails via Gmail SMTP
 */
export class EmailService {
  
  /**
   * Send email via Gmail SMTP
   */
  private static async sendEmail(to: string, subject: string, html: string) {
    const mailTransporter = createTransporter();
    
    if (!mailTransporter) {
      logger.info('Email mock (no SMTP config)', { to, subject });
      return;
    }

    if (!config.email.fromAddress) {
      logger.warn('Email from address not configured', { to, subject });
      return;
    }

    try {
      const info = await mailTransporter.sendMail({
        from: config.email.fromAddress,
        to,
        subject,
        html,
      });

      logger.info('Email sent successfully', { 
        to, 
        subject, 
        messageId: info.messageId 
      });
    } catch (error: any) {
      logger.error('Failed to send email', { 
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
    const mailTransporter = createTransporter();
    
    if (!mailTransporter) {
      logger.warn('Email service not configured - GMAIL_USER or GMAIL_APP_PASSWORD is missing', { to, subject });
      throw new Error('Email service is not configured. GMAIL_USER and GMAIL_APP_PASSWORD are required. Please configure them in your environment variables.');
    }

    if (!config.email.fromAddress) {
      logger.warn('Email from address not configured - EMAIL_FROM is missing', { to, subject });
      throw new Error('Email from address is not configured. EMAIL_FROM environment variable is required.');
    }

    try {
      const emailData = {
        from: config.email.fromAddress,
        to,
        subject,
        html,
      };

      logger.info('Attempting to send test email via Gmail SMTP', { 
        to, 
        subject, 
        from: config.email.fromAddress,
        smtpHost: config.email.smtp.host,
        smtpPort: config.email.smtp.port,
      });

      const result = await mailTransporter.sendMail(emailData);
      
      logger.info('Test email sent successfully via Gmail SMTP', { 
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
      logger.error('Failed to send test email via Gmail SMTP', { 
        to, 
        subject, 
        from: config.email.fromAddress,
        error: error.message,
        errorCode: error.code,
        errorCommand: error.command,
        stack: error.stack
      });
      
      // Provide more helpful error messages
      if (error.code === 'EAUTH' || error.message?.includes('Invalid login')) {
        throw new Error('Email sending failed: Invalid Gmail credentials. Please check your GMAIL_USER and GMAIL_APP_PASSWORD. Make sure you\'re using an App Password, not your regular Gmail password.');
      }
      
      if (error.code === 'ECONNECTION' || error.message?.includes('connection')) {
        throw new Error('Email sending failed: Could not connect to Gmail SMTP server. Please check your network connection and SMTP settings.');
      }

      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        throw new Error('Email sending failed: Rate limit exceeded. Gmail has limits on the number of emails you can send. Please try again later.');
      }

      throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
    }
  }
}
