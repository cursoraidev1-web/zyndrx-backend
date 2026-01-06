# Rate Limiting Implementation

## Overview

Per-user rate limiting has been implemented to limit the number of requests each authenticated user can make per minute. This prevents abuse and ensures fair resource usage.

## Implementation Details

### Per-User Rate Limiter

**Location:** `backend/src/middleware/rate-limit.middleware.ts`

**Features:**
- ✅ **60 requests per minute per user** (configurable via `RATE_LIMIT_PER_USER_PER_MINUTE` env var)
- ✅ Tracks requests by user ID (from JWT token)
- ✅ Automatic cleanup of expired entries
- ✅ Falls back to IP-based limiting for unauthenticated requests
- ✅ Returns 429 status code with `retryAfter` header when limit exceeded

### Configuration

**Environment Variable:**
```bash
RATE_LIMIT_PER_USER_PER_MINUTE=60  # Default: 60 requests per minute
```

**Default Settings:**
- **Window:** 1 minute (60,000ms)
- **Max Requests:** 60 per minute per user
- **Cleanup:** Every 15 minutes (removes expired entries)

### Applied Routes

Per-user rate limiting is applied to **all authenticated routes**:

✅ **Companies** - All company management endpoints
✅ **Projects** - All project CRUD and member management
✅ **Tasks** - All task operations and attachments
✅ **PRDs** - All PRD operations, sections, versions, assignees
✅ **Documents** - All document upload, download, and management
✅ **Handoffs** - All handoff operations, comments, attachments
✅ **Integrations** - All integration connect/disconnect/sync operations
✅ **Feedback** - All feedback submission and management
✅ **Teams** - All team operations and project invites
✅ **Comments** - All comment operations
✅ **Notifications** - All notification endpoints
✅ **Analytics** - All analytics endpoints
✅ **Activity** - All activity feed endpoints
✅ **Subscriptions** - All subscription management
✅ **Push** - All push notification subscriptions
✅ **Auth** - All authenticated auth endpoints (profile, sessions, 2FA, etc.)

### Rate Limiting Types

1. **Per-User Rate Limiter** (`userRateLimiter`)
   - For authenticated users
   - Tracks by user ID from JWT token
   - 60 requests per minute (configurable)

2. **IP-Based Rate Limiter** (`rateLimiter`)
   - For unauthenticated requests
   - Tracks by IP address
   - 100 requests per 15 minutes (existing)

3. **Registration Rate Limiter** (`registrationRateLimiter`)
   - For registration endpoint only
   - 3 registrations per 15 minutes per IP
   - Prevents spam account creation

### Error Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Too many requests. Please limit your requests to 60 per minute.",
  "retryAfter": 45  // seconds until retry is allowed
}
```

**HTTP Status:** `429 Too Many Requests`

### How It Works

1. **Request comes in** → Authentication middleware runs first
2. **If authenticated** → `userRateLimiter` checks user's request count
3. **If within limit** → Request proceeds, counter increments
4. **If limit exceeded** → Returns 429 error with retry time
5. **Window resets** → After 1 minute, counter resets to 0

### Memory Management

- Automatic cleanup runs every 15 minutes
- Removes entries older than 2 minutes (expired rate limit windows)
- Prevents memory leaks from accumulated rate limit records

### Testing

To test rate limiting:

1. **Authenticate** as a user
2. **Make 60+ requests** within 1 minute
3. **61st request** should return 429 error
4. **Wait 1 minute** → Counter resets, requests allowed again

### Customization

To change the per-user rate limit:

1. Set environment variable:
   ```bash
   RATE_LIMIT_PER_USER_PER_MINUTE=100  # Allow 100 requests per minute
   ```

2. Restart the backend server

### Benefits

✅ **Prevents API abuse** - Limits excessive requests from individual users
✅ **Fair resource usage** - Ensures all users get equal access
✅ **DDoS protection** - Helps mitigate automated attacks
✅ **Cost control** - Prevents runaway API costs
✅ **Better performance** - Reduces server load from excessive requests

---

**Implementation Date:** $(Get-Date -Format "yyyy-MM-dd")  
**Status:** ✅ **ACTIVE**







