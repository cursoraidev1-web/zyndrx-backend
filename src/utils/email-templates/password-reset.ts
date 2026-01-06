import { config } from '../../config';

export const passwordResetTemplate = (name: string, resetUrl: string) => {
  const logoUrl = `${config.frontend.url}/logo.svg`;
  return {
    subject: 'Reset Your Password - Zyndrx',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .email-card {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .logo {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 32px;
            }
            .logo-icon {
              width: 40px;
              height: 40px;
              background: #3B82F6;
              border-radius: 8px;
            }
            .logo-text {
              font-size: 24px;
              font-weight: 700;
              color: #111827;
            }
            h1 {
              font-size: 24px;
              color: #111827;
              margin: 0 0 16px 0;
            }
            p {
              margin: 0 0 16px 0;
              color: #6b7280;
              font-size: 15px;
            }
            .btn {
              display: inline-block;
              padding: 14px 32px;
              background: #3B82F6;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 24px 0;
            }
            .btn:hover {
              background: #2563eb;
            }
            .alternative-link {
              background: #f3f4f6;
              padding: 16px;
              border-radius: 8px;
              word-break: break-all;
              font-size: 13px;
              color: #6b7280;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 32px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 13px;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning p {
              margin: 0;
              color: #78350f;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="logo">
                <img src="${logoUrl}" alt="Zyndrx" width="40" height="40" style="display: inline-block; vertical-align: middle;" />
                <span class="logo-text" style="margin-left: 12px; display: inline-block; vertical-align: middle;">Zyndrx</span>
              </div>

              <h1>Reset Your Password</h1>
              
              <p>Hi ${name},</p>
              
              <p>We received a request to reset your password for your Zyndrx account. Click the button below to create a new password:</p>
              
              <a href="${resetUrl}" class="btn">Reset Password</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <div class="alternative-link">${resetUrl}</div>
              
              <div class="warning">
                <p><strong>⚠️ Security Note:</strong> This link will expire in 1 hour and can only be used once.</p>
              </div>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} Zyndrx. All rights reserved.</p>
                <p>If you have questions, contact us at support@zyndrx.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${name},

We received a request to reset your password for your Zyndrx account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour and can only be used once.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Zyndrx. All rights reserved.
    `,
  };
};

