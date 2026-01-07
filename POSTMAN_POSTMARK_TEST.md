# Postmark Email Test API - Postman Guide

## Endpoint

**POST** `/api/v1/email/postmark-test`

**Base URL:** `http://localhost:5000` (or your server URL)

## Request Details

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "to": "iyiola.ogunjobi@mckodev.com.ng",
  "subject": "Hello from Postmark",
  "html": "<strong>Hello</strong> dear Postmark user.",
  "text": "Hello from Postmark!"
}
```

### Required Fields
- `to` (string, email) - Recipient email address
- `subject` (string) - Email subject line

### Optional Fields
- `html` (string) - HTML content of the email
- `text` (string) - Plain text content (used if html is not provided)

## Example Requests

### Minimal Request
```json
{
  "to": "iyiola.ogunjobi@mckodev.com.ng",
  "subject": "Test Email"
}
```

### Full Request with HTML
```json
{
  "to": "iyiola.ogunjobi@mckodev.com.ng",
  "subject": "Hello from Postmark",
  "html": "<h1>Hello!</h1><p>This is a <strong>test email</strong> from Postmark.</p>",
  "text": "Hello! This is a test email from Postmark."
}
```

## Expected Response

### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "to": "iyiola.ogunjobi@mckodev.com.ng",
    "subject": "Hello from Postmark",
    "sent": true,
    "messageId": "abc123-def456-ghi789",
    "accepted": ["iyiola.ogunjobi@mckodev.com.ng"],
    "rejected": [],
    "response": "Postmark: abc123-def456-ghi789",
    "message": "Test email sent successfully via Postmark. Check your inbox!"
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

## Postman Setup Steps

1. **Open Postman**
2. **Create New Request**
   - Method: `POST`
   - URL: `http://localhost:5000/api/v1/email/postmark-test`
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
- `test_email`: `iyiola.ogunjobi@mckodev.com.ng`

Then use: `{{base_url}}/api/v1/email/postmark-test`

## Notes

- This endpoint does **NOT** require authentication (for testing purposes)
- Make sure your backend server is running
- Ensure `POSTMARK_API_KEY` is set in your `.env` file
- The email will be sent using your configured Postmark settings (MessageStream, etc.)

## Troubleshooting

### "Failed to send test email: Postmark email failed"
- Check that `POSTMARK_API_KEY` is set correctly in `.env`
- Verify your Postmark account is active
- Check backend logs for detailed error messages

### "Email service is not configured"
- Make sure `POSTMARK_API_KEY` is in your `.env` file
- Restart your backend server after adding the key

### Connection Refused
- Make sure your backend server is running
- Check the port (default is 5000)
- Verify the URL is correct

