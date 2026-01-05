import { Resend } from 'resend';
import { config } from '../config';
import logger from './logger';

const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;
const baseUrl = config.frontend.url;

/**
 * Centralized email service for sending transactional emails
 */
export class EmailService {
  
  /**
   * Send email via Resend
   */
  private static async sendEmail(to: string, subject: string, html: string) {
    if (!resend) {
      logger.info('Email mock (no API key)', { to, subject });
      return;
    }

    try {
      await resend.emails.send({
        from: config.email.fromAddress,
        to,
        subject,
        html,
      });
      logger.info('Email sent successfully', { to, subject });
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error });
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
   * ✅ FIX: Re-added this missing method
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
   * ✅ FIX: Re-added this missing method
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
    if (!resend) {
      logger.info('Email mock (no API key) - Test email', { to, subject });
      throw new Error('Email service is not configured. RESEND_API_KEY is missing.');
    }

    try {
      const result = await resend.emails.send({
        from: config.email.fromAddress,
        to,
        subject,
        html,
      });
      logger.info('Test email sent successfully', { to, subject, result });
      return result;
    } catch (error: any) {
      logger.error('Failed to send test email', { to, subject, error: error.message });
      throw error;
    }
  }
}