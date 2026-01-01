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
      // Don't throw - fail gracefully
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
      <p>You can now start managing your projects, tasks, and team collaboration.</p>
      <p><a href="${baseUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a></p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
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
      <p>Your workspace "<strong>${companyName}</strong>" has been successfully created on Zyndrx.</p>
      <p>You can now invite team members, create projects, and start collaborating.</p>
      <p><a href="${baseUrl}/projects" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Create Your First Project</a></p>
      <p>Best regards,<br>The Zyndrx Team</p>
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
      <p>Best regards,<br>The Zyndrx Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send task creation notification email (to assignee if assigned)
   */
  static async sendTaskCreatedEmail(
    email: string, 
    fullName: string, 
    taskTitle: string, 
    taskId: string, 
    projectName: string,
    createdBy: string
  ) {
    const subject = `New task assigned: ${taskTitle}`;
    const html = `
      <h2>New Task Assigned</h2>
      <p>Hi ${fullName},</p>
      <p>A new task "<strong>${taskTitle}</strong>" has been assigned to you in the project "${projectName}".</p>
      <p>Created by: ${createdBy}</p>
      <p><a href="${baseUrl}/tasks/${taskId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Task</a></p>
      <p>Best regards,<br>The Zyndrx Team</p>
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
      <p>Hi ${fullName},</p>
      <p>A new PRD "<strong>${prdTitle}</strong>" has been created for the project "${projectName}".</p>
      <p><a href="${baseUrl}/prd-designer/${prdId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View PRD</a></p>
      <p>Best regards,<br>The Zyndrx Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send comment creation notification email
   */
  static async sendCommentCreatedEmail(
    email: string, 
    fullName: string, 
    commenterName: string, 
    resourceType: string, 
    resourceName: string,
    resourceId: string
  ) {
    const subject = `New comment on ${resourceType}: ${resourceName}`;
    const html = `
      <h2>New Comment</h2>
      <p>Hi ${fullName},</p>
      <p><strong>${commenterName}</strong> commented on the ${resourceType} "${resourceName}".</p>
      <p><a href="${baseUrl}/${resourceType}s/${resourceId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}</a></p>
      <p>Best regards,<br>The Zyndrx Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send handoff creation notification email (to recipient)
   */
  static async sendHandoffCreatedEmail(
    email: string, 
    fullName: string, 
    handoffTitle: string, 
    handoffId: string,
    fromUserName: string,
    projectName: string
  ) {
    const subject = `New handoff: ${handoffTitle}`;
    const html = `
      <h2>New Handoff</h2>
      <p>Hi ${fullName},</p>
      <p><strong>${fromUserName}</strong> has created a handoff "<strong>${handoffTitle}</strong>" for you in the project "${projectName}".</p>
      <p><a href="${baseUrl}/handoffs/${handoffId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Handoff</a></p>
      <p>Best regards,<br>The Zyndrx Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send document creation notification email
   */
  static async sendDocumentCreatedEmail(
    email: string, 
    fullName: string, 
    documentTitle: string, 
    projectName: string,
    projectId: string
  ) {
    const subject = `New document uploaded: ${documentTitle}`;
    const html = `
      <h2>New Document Uploaded</h2>
      <p>Hi ${fullName},</p>
      <p>A new document "<strong>${documentTitle}</strong>" has been uploaded to the project "${projectName}".</p>
      <p><a href="${baseUrl}/projects/${projectId}/documents" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Documents</a></p>
      <p>Best regards,<br>The Zyndrx Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }
}

