# 2FA Setup Verification Guide

## Issue: "Setup not initialized" Error

This error occurs when `POST /api/v1/auth/2fa/enable` is called but `two_factor_secret` is NULL in the database.

## Root Cause Analysis

The error happens because:
1. `POST /api/v1/auth/2fa/setup` must be called FIRST to write `two_factor_secret`
2. If the UPDATE in `setup` fails silently (no error handling), the secret never gets saved
3. Then `enable` checks for the secret and finds NULL → "Setup not initialized"

## Fixes Applied

### 1. Added Error Handling to `generate2FASecret()`
- Now checks for UPDATE errors
- Verifies the secret was actually saved
- Logs detailed error information
- Throws descriptive errors

### 2. Improved Error Messages in `enable2FA()`
- Better logging when secret is missing
- More descriptive error message

## Verification Steps

### Step 1: Verify RLS Policy Exists
Run in Supabase SQL Editor:

```sql
SELECT 
  policyname, 
  roles::text, 
  cmd::text
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'UPDATE'
AND roles::text LIKE '%service_role%';
```

**Expected**: Should see "Service role can update users" policy

### Step 2: Test the Flow

1. **Call Setup** (while logged in):
   ```
   POST /api/v1/auth/2fa/setup
   ```
   - Should return: `{ qrCode: "...", secret: "..." }`
   - Check backend logs for: "2FA secret saved successfully"

2. **Verify Secret in DB**:
   ```sql
   SELECT id, two_factor_secret, two_factor_secret_set_at
   FROM users
   WHERE id = 'YOUR_USER_ID';
   ```
   - `two_factor_secret` should NOT be NULL
   - `two_factor_secret_set_at` should have a timestamp

3. **Call Enable** (with 6-digit code from authenticator):
   ```
   POST /api/v1/auth/2fa/enable
   Body: { "token": "123456" }
   ```
   - Should return: `{ enabled: true, recoveryCodes: [...] }`

## If Setup Still Fails

### Check Backend Logs
Look for:
- "Failed to save 2FA secret" → RLS or permission issue
- "2FA secret not saved after update" → UPDATE succeeded but SELECT failed
- Any Supabase error codes (42501 = RLS violation, etc.)

### Verify Service Role Key
Check `backend/.env`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (should be long JWT)
```

### Run Migration 035
If RLS policy is missing, run:
```sql
-- From migration 035_fix_users_update_rls.sql
CREATE POLICY "Service role can update users" 
  ON users 
  FOR UPDATE 
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT UPDATE ON users TO service_role;
```

## Testing Checklist

- [ ] RLS policy exists for service_role UPDATE on users
- [ ] Setup endpoint returns QR code without errors
- [ ] Database shows `two_factor_secret` after setup
- [ ] Enable endpoint accepts valid TOTP code
- [ ] Recovery codes are generated and returned
- [ ] Backend logs show successful operations





