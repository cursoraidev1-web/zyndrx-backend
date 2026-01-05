# Gmail SMTP Setup Guide

This guide explains how to configure Gmail SMTP for sending emails from your Zyndrx application.

## Prerequisites

- A Gmail account
- 2-Step Verification enabled on your Gmail account (required for App Passwords)

## Step 1: Enable 2-Step Verification

1. Go to your [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to enable 2-Step Verification

## Step 2: Generate an App Password

1. Go to your [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **App passwords**
3. You may need to sign in again
4. Select **Mail** as the app type
5. Select **Other (Custom name)** as the device type
6. Enter a name like "Zyndrx Backend" and click **Generate**
7. **Copy the 16-character password** (you won't be able to see it again)

## Step 3: Configure Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# Email From Address (can be your Gmail address or a custom format)
EMAIL_FROM=Zyndrx <your-email@gmail.com>
# OR just:
EMAIL_FROM=your-email@gmail.com

# Optional: Custom SMTP Settings (defaults to Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Step 4: Verify Configuration

1. Restart your backend server
2. Use the Email Testing page in your application (`/email-test`)
3. Send a test email to verify everything works

## Important Notes

### App Password vs Regular Password
- **DO NOT** use your regular Gmail password
- **MUST** use an App Password (16 characters, no spaces)
- App Passwords are required when 2-Step Verification is enabled

### Gmail Sending Limits
- **Free Gmail accounts**: 500 emails per day
- **Google Workspace accounts**: 2,000 emails per day
- If you exceed limits, you'll get rate limit errors

### Security Best Practices
1. Never commit your `.env` file to version control
2. Use a dedicated Gmail account for sending application emails
3. Consider using Google Workspace for higher limits and better deliverability
4. Rotate App Passwords periodically

## Troubleshooting

### Error: "Invalid login"
- Verify you're using an App Password, not your regular password
- Make sure 2-Step Verification is enabled
- Regenerate the App Password if needed

### Error: "Connection timeout"
- Check your firewall settings
- Verify SMTP_HOST and SMTP_PORT are correct
- Try using port 465 with SMTP_SECURE=true

### Emails not being received
- Check spam/junk folder
- Verify the recipient email address is correct
- Check Gmail sending limits (you may have hit the daily limit)
- Look at backend logs for detailed error messages

### Using a Custom Domain
If you want to send from a custom domain (e.g., `noreply@yourdomain.com`):
1. Set up Google Workspace for your domain
2. Verify your domain in Google Workspace
3. Use your Google Workspace email as GMAIL_USER
4. Generate an App Password for that account

## Alternative: Other SMTP Providers

You can use other SMTP providers by changing the SMTP settings:

```env
# Example: Using SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
GMAIL_USER=apikey
GMAIL_APP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

```env
# Example: Using Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
GMAIL_USER=your-mailgun-username
GMAIL_APP_PASSWORD=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
```

## Migration from Resend

If you were previously using Resend:
1. Remove `RESEND_API_KEY` from your `.env` file
2. Add the Gmail SMTP configuration as shown above
3. Restart your backend server
4. Test email sending using the Email Testing page

The email service will automatically use Gmail SMTP instead of Resend.

