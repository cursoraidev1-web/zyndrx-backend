# Resend Email Test API - Postman Guide

## Endpoint

**POST** `/api/v1/email/resend-test`

**Base URL:** `http://localhost:5000` (or your server URL)

## Request Details

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "to": "recipient@example.com",
  "subject": "Hello from Resend",
  "html": "<strong>Hello</strong> dear Resend user.",
  "text": "Hello from Resend!"
}
```

### Required Fields
- `to` (string, email) - Recipient email address (must be from your verified domain for Resend)
- `subject` (string) - Email subject line

### Optional Fields
- `html` (string) - HTML content of the email
- `text` (string) - Plain text content (used if html is not provided)

## Example Requests

### Minimal Request
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email"
}
```

### Full Request with HTML
```json
{
  "to": "recipient@example.com",
  "subject": "Hello from Resend",
  "html": "<h1>Hello!</h1><p>This is a <strong>test email</strong> from Resend.</p>",
  "text": "Hello! This is a test email from Resend."
}
```

## Expected Response

### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "to": "recipient@example.com",
    "subject": "Hello from Resend",
    "sent": true,
    "messageId": "abc123-def456-ghi789",
    "accepted": ["recipient@example.com"],
    "rejected": [],
    "response": "Resend: abc123-def456-ghi789",
    "message": "Test email sent successfully via Resend. Check your inbox!"
  },
  "message": "Test email sent successfully"
}
```

### Error (400 Bad Request)
```json
{
  "success": false,
  "error": "Email address (to) and subject are required"
}
```

### Error (400 Bad Request - Invalid Email)
```json
{
  "success": false,
  "error": "Invalid email address"
}
```

### Error (500 - Domain Not Verified)
```json
{
  "success": false,
  "error": "Resend email failed: Domain not verified. Please verify your domain in Resend dashboard."
}
```

## Postman Setup Steps

1. **Open Postman**
2. **Create New Request**
   - Method: `POST`
   - URL: `http://localhost:5000/api/v1/email/resend-test`
3. **Set Headers**
   - Key: `Content-Type`
   - Value: `application/json`
4. **Set Body**
   - Select "Body" tab
   - Select "raw"
   - Select "JSON" from dropdown
   - Paste the JSON body from above
5. **Send Request**
   - Click "Send"
   - Check the response

## Environment Variables (Optional)

You can create a Postman environment with:
- `base_url`: `http://localhost:5000`
- `test_email`: `your-email@yourdomain.com`

Then use: `{{base_url}}/api/v1/email/resend-test`

## Configuration

### Required Environment Variables

In your `.env` file:
```
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Zyndrx <noreply@yourdomain.com>
```

### Important Notes

- **Domain Verification Required**: Resend requires that you verify your domain before sending emails
- **From Address**: The `EMAIL_FROM` address must be from your verified domain (e.g., `noreply@yourdomain.com`)
- **Recipient Addresses**: While Resend allows sending to any email address, your `from` address must be from a verified domain
- **SMTP Fallback**: If Resend is not configured or fails, the system will fall back to SMTP if configured

## Troubleshooting

### "Resend email failed: Domain not verified"
- Go to your Resend dashboard: https://resend.com/domains
- Add and verify your domain
- Wait for DNS verification to complete (usually a few minutes)
- Ensure your `EMAIL_FROM` uses an address from the verified domain

### "Failed to send test email: Resend email failed"
- Check that `RESEND_API_KEY` is set correctly in your `.env` file
- Verify your domain in Resend dashboard
- Ensure `EMAIL_FROM` uses an email address from your verified domain (e.g., `noreply@yourdomain.com`)
- Check backend logs for detailed error messages

### "Email service is not configured"
- Make sure `RESEND_API_KEY` is in your `.env` file
- Or configure SMTP fallback with `SMTP_USER` and `SMTP_PASSWORD`
- Restart your backend server after adding the key

### Connection Refused
- Make sure your backend server is running
- Check the port (default is 5000)
- Verify the URL is correct

### "Invalid from address"
- The `EMAIL_FROM` must use a domain you've verified in Resend
- Format: `"Name <email@yourdomain.com>"` or just `"email@yourdomain.com"`
- Example: `"Zyndrx <noreply@zyndrx.com>"` (where `zyndrx.com` is verified)

## Resend Setup Guide

1. **Sign up for Resend**: https://resend.com
2. **Get API Key**: 
   - Go to https://resend.com/api-keys
   - Create a new API key
   - Copy the key (starts with `re_`)
3. **Add Domain**:
   - Go to https://resend.com/domains
   - Click "Add Domain"
   - Enter your domain (e.g., `yourdomain.com`)
   - Add the DNS records provided by Resend to your domain registrar
   - Wait for verification (usually 5-15 minutes)
4. **Configure Environment**:
   - Add `RESEND_API_KEY=re_your_key_here` to your `.env`
   - Add `EMAIL_FROM=Zyndrx <noreply@yourdomain.com>` to your `.env`
5. **Test**: Use this Postman endpoint to test email sending
