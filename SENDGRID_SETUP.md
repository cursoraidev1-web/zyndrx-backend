# SendGrid SMTP Setup Guide (Recommended for Cloud Platforms)

SendGrid is recommended for cloud platforms like Render, Vercel, Railway, etc., because they don't block SMTP connections like Gmail does.

## Why SendGrid?

- ✅ Works on all cloud platforms (Render, Vercel, Railway, etc.)
- ✅ Free tier: 100 emails/day forever
- ✅ Better deliverability than Gmail
- ✅ No App Password setup needed
- ✅ Simple API key authentication

## Step 1: Create SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com)
2. Sign up for a free account
3. Verify your email address

## Step 2: Create API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it "Zyndrx Backend"
4. Select **Full Access** or **Restricted Access** (with Mail Send permissions)
5. Click **Create & View**
6. **Copy the API key immediately** (you won't see it again!)

## Step 3: Verify Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Choose one:
   - **Single Sender Verification** (quick, for testing)
   - **Domain Authentication** (better for production)

### Single Sender Verification (Quick Setup)
1. Click **Verify a Single Sender**
2. Fill in your details
3. Verify the email address they send you
4. Use this email as your `EMAIL_FROM`

### Domain Authentication (Production)
1. Click **Authenticate Your Domain**
2. Follow the DNS setup instructions
3. Add the DNS records to your domain
4. Wait for verification (can take up to 48 hours)

## Step 4: Configure Environment Variables

Add these to your `.env` file or Render environment variables:

```env
# SendGrid SMTP Configuration
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key-here
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=verified-email@yourdomain.com
```

**Important:**
- `SMTP_USER` must be exactly `apikey` (lowercase)
- `SMTP_PASSWORD` is your SendGrid API key
- `EMAIL_FROM` must be a verified sender in SendGrid

## Step 5: Test

1. Restart your backend server
2. Use the Email Testing page (`/email-test`)
3. Send a test email

## SendGrid Limits

- **Free Tier**: 100 emails/day
- **Essentials Plan ($19.95/mo)**: 50,000 emails/month
- **Pro Plan ($89.95/mo)**: 100,000 emails/month

## Troubleshooting

### Error: "Invalid login"
- Make sure `SMTP_USER` is exactly `apikey` (lowercase)
- Verify your API key is correct
- Check that the API key has "Mail Send" permissions

### Error: "Sender not verified"
- Verify your sender email in SendGrid dashboard
- Make sure `EMAIL_FROM` matches a verified sender
- For domain authentication, wait for DNS verification

### Error: "Rate limit exceeded"
- Free tier: 100 emails/day limit
- Upgrade to a paid plan for higher limits
- Check your SendGrid dashboard for usage

## Alternative: Mailgun Setup

If you prefer Mailgun (5,000 emails/month free):

```env
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=noreply@yourdomain.com
```

## Migration from Gmail

If you were using Gmail SMTP:
1. Remove `GMAIL_USER` and `GMAIL_APP_PASSWORD`
2. Add SendGrid configuration as shown above
3. Restart your backend
4. Test email sending

The code automatically uses `SMTP_USER`/`SMTP_PASSWORD` if provided, or falls back to `GMAIL_USER`/`GMAIL_APP_PASSWORD` for backward compatibility.

