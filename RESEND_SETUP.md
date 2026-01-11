# Resend Email Setup Guide

Resend is now integrated as the primary email service. It requires domain verification and provides excellent deliverability.

## Why Resend?

✅ **Excellent deliverability** - Industry-leading inbox rates  
✅ **Modern API** - Clean, developer-friendly interface  
✅ **Domain verification** - Better sender reputation  
✅ **Works on Render** - No port blocking issues  
✅ **Free tier** - 3,000 emails/month free, then $20 per 50,000 emails  
✅ **Reliable** - Used by thousands of companies  
✅ **Great documentation** - Easy to set up and use

## Quick Setup (15-30 minutes)

### Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" (free account)
3. Verify your email address

### Step 2: Verify Your Domain

1. After logging in, go to **Domains** in the sidebar
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Resend will provide DNS records to add:
   - **SPF record** (TXT)
   - **DKIM records** (CNAME)
   - **DMARC record** (TXT) - optional but recommended
5. Add these records to your domain's DNS at your registrar (GoDaddy, Namecheap, Cloudflare, etc.)
6. Wait for verification (usually 5-15 minutes)
7. Once verified, you'll see a green checkmark next to your domain

**Note:** Domain verification is required before you can send emails with Resend.

### Step 3: Get Your API Key

1. Go to **API Keys** in the sidebar
2. Click **Create API Key**
3. Give it a name (e.g., "Zyndrx Production")
4. Copy the API key (starts with `re_`)
5. **Important:** Save it immediately - you won't be able to see it again!

### Step 4: Configure Your Environment

Add this to your `.env` file:

```bash
# Resend API Key (required)
RESEND_API_KEY=re_your_api_key_here

# Email sender address (must be from your verified domain)
EMAIL_FROM=Zyndrx <noreply@yourdomain.com>
```

**Example:**
```bash
RESEND_API_KEY=re_abc123xyz789
EMAIL_FROM=Zyndrx <noreply@zyndrx.com>
```

**Important:** The email address in `EMAIL_FROM` must be from a domain you've verified in Resend. For example:
- ✅ `noreply@yourdomain.com` (if `yourdomain.com` is verified)
- ✅ `Zyndrx <support@yourdomain.com>` (if `yourdomain.com` is verified)
- ❌ `noreply@gmail.com` (Gmail domain - cannot use)

### Step 5: Test It

**Option 1: Via Postman**
Use the test endpoint: `POST /api/v1/email/resend-test`

See `POSTMAN_RESEND_TEST.md` for detailed instructions.

**Option 2: Via Your App**
1. Restart your backend server
2. Use the email test page in your app to send a test email
3. Check your inbox!

**Option 3: Quick Test Script**
```bash
cd backend
node -e "const {EmailService} = require('./dist/utils/email.service'); EmailService.sendTestEmail('test@yourdomain.com', 'Test', '<h1>Test</h1>').then(console.log).catch(console.error);"
```

## Domain Setup Details

### DNS Records Needed

When you add a domain in Resend, you'll get DNS records like:

**SPF Record (TXT):**
```
v=spf1 include:resend.com ~all
```

**DKIM Records (CNAME):**
```
resend._domainkey.yourdomain.com → resend._domainkey.resend.com
```

**DMARC Record (TXT) - Recommended:**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### Where to Add DNS Records

- **GoDaddy**: My Products → Domains → DNS Management
- **Namecheap**: Domain List → Manage → Advanced DNS
- **Cloudflare**: DNS → Records → Add record
- **AWS Route 53**: Hosted zones → Create record

## Pricing

- **Free tier**: 3,000 emails/month (no credit card required)
- **Paid**: $20 per 50,000 emails (pay-as-you-go)
- **Pro**: $199/month for 500,000 emails + features

## Fallback to SMTP

If Resend is not configured, the system will automatically fall back to SMTP (if configured). However, Resend is recommended because:

- SMTP often doesn't work on cloud platforms like Render
- Resend provides better deliverability
- Resend has better logging and analytics
- Resend handles bounces and spam complaints automatically

## Troubleshooting

### "Domain not verified" error

1. **Check domain status**: Go to Resend dashboard → Domains
2. **Verify DNS records**: Make sure all DNS records are added correctly
3. **Wait for propagation**: DNS changes can take up to 48 hours (usually 5-15 minutes)
4. **Check record types**: Ensure SPF is a TXT record, DKIM are CNAME records
5. **Use DNS checker**: Use tools like `nslookup` or [mxtoolbox.com](https://mxtoolbox.com) to verify records

### "Invalid from address" error

- The `EMAIL_FROM` address must use a domain you've verified in Resend
- Format: `"Name <email@yourdomain.com>"` or just `"email@yourdomain.com"`
- Example: `"Zyndrx <noreply@zyndrx.com>"` (where `zyndrx.com` is verified)

### Emails not sending?

1. **Check API key**: Make sure `RESEND_API_KEY` is set correctly and starts with `re_`
2. **Check domain**: Verify your domain is verified in Resend dashboard
3. **Check logs**: Look for Resend errors in your backend logs
4. **Check quota**: Verify you haven't exceeded your monthly limit
5. **Test endpoint**: Use `POST /api/v1/email/resend-test` to test directly

### "Email service is not configured"

- Make sure `RESEND_API_KEY` is in your `.env` file
- Or configure SMTP fallback with `SMTP_USER` and `SMTP_PASSWORD`
- Restart your backend server after adding the key

### Connection Refused

- Make sure your backend server is running
- Check the port (default is 5000)
- Verify the URL is correct

## Testing Email Sending

Use the Postman endpoint: `POST /api/v1/email/resend-test`

Request body:
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello!</h1><p>This is a test email.</p>"
}
```

See `POSTMAN_RESEND_TEST.md` for complete Postman setup instructions.

## Support

- Resend Docs: https://resend.com/docs
- Resend Support: support@resend.com
- Resend Status: https://status.resend.com

## Migration from Postmark

If you were previously using Postmark:

1. Remove `POSTMARK_API_KEY` and `POSTMARK_MESSAGE_STREAM` from your `.env`
2. Add `RESEND_API_KEY` and verify your domain in Resend
3. Update `EMAIL_FROM` to use your verified domain
4. Restart your backend server
5. Test using the `/api/v1/email/resend-test` endpoint

The system will automatically use Resend instead of Postmark.
