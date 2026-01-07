# Postmark Email Setup Guide

Postmark is now integrated as the primary email service. It works immediately without requiring a domain, and provides excellent deliverability.

## Why Postmark?

✅ **Works immediately** - No domain verification needed initially  
✅ **Excellent deliverability** - Industry-leading inbox rates  
✅ **Works on Render** - No port blocking issues  
✅ **Free tier** - 100 emails/month free, then $1.25 per 1,000 emails  
✅ **Reliable** - Used by thousands of companies  
✅ **Easy upgrade** - Add your domain later for better branding

## Quick Setup (5 minutes)

### Step 1: Create Postmark Account

1. Go to [https://postmarkapp.com](https://postmarkapp.com)
2. Click "Sign Up" (free account)
3. Verify your email address

### Step 2: Get Your Server API Token

1. After logging in, go to **Servers** in the sidebar
2. You'll see a default "First Server" - click on it
3. Go to **API Tokens** tab
4. Copy the **Server API Token** (starts with something like `abc123...`)

### Step 3: Configure Your Environment

Add this to your `.env` file:

```bash
# Postmark (recommended - works immediately)
POSTMARK_API_KEY=your-server-api-token-here

# Postmark Message Stream (optional - if you have multiple streams)
POSTMARK_MESSAGE_STREAM=allzyndrx

# Email sender address
EMAIL_FROM=iyiola.ogunjobi@mckodev.com.ng
```

**Example with your configuration:**
```bash
POSTMARK_API_KEY=c1ba6a8e-f826-4379-bdb5-2a7485a20d46
POSTMARK_MESSAGE_STREAM=allzyndrx
EMAIL_FROM=iyiola.ogunjobi@mckodev.com.ng
```

**Note:** The `POSTMARK_MESSAGE_STREAM` is optional. Only include it if you've set up message streams in Postmark (useful for separating transactional vs marketing emails).

### Step 4: Test It

**Option 1: Quick Test Script**
```bash
cd backend
node test-postmark.js
```

**Option 2: Via Your App**
1. Restart your backend server
2. Use the email test page in your app to send a test email
3. Check your inbox!

## Upgrading to Your Own Domain (Optional - Later)

When you're ready to use your own domain:

1. In Postmark, go to **Sending Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `zyndrx.com`)
4. Postmark will provide DNS records to add:
   - SPF record
   - DKIM records
   - Return-Path domain
5. Add these records to your domain's DNS
6. Verify the domain in Postmark
7. Update `EMAIL_FROM` to use your domain: `Zyndrx <noreply@zyndrx.com>`

## Pricing

- **Free tier**: 100 emails/month
- **Paid**: $1.25 per 1,000 emails after free tier
- **No credit card required** for free tier

## Fallback to SMTP

If Postmark is not configured, the system will automatically fall back to SMTP (if configured). However, Postmark is recommended because:

- SMTP often doesn't work on cloud platforms like Render
- Postmark provides better deliverability
- Postmark is easier to set up

## Troubleshooting

### Emails not sending?

1. **Check your API key**: Make sure `POSTMARK_API_KEY` is set correctly
2. **Check logs**: Look for Postmark errors in your backend logs
3. **Verify account**: Make sure your Postmark account is verified
4. **Check free tier**: If you've exceeded 100 emails/month, upgrade your plan

### Want to use SMTP instead?

You can still use SMTP by:
1. Setting `SMTP_USER` and `SMTP_PASSWORD`
2. Setting `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
3. **Not setting** `POSTMARK_API_KEY`

The system will automatically use SMTP if Postmark is not configured.

## Support

- Postmark Docs: https://postmarkapp.com/developer
- Postmark Support: support@postmarkapp.com

