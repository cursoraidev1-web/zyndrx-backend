# Diagnose 2FA "Setup not initialized" Error

## ✅ Good News
The RLS policy **already exists** - that's not the problem!

## 🔍 Next Steps to Find the Real Issue

### Step 1: Verify Backend Environment
Check `backend/.env` has the correct service role key:

```bash
# Should be a long JWT starting with "eyJ..."
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Get it from**: Supabase Dashboard → Settings → API → `service_role` key (NOT anon key)

### Step 2: Restart Backend Server
The new error handling code needs to be loaded:
```bash
cd backend
npm run dev
```

### Step 3: Test 2FA Setup
1. **Call Setup Endpoint** (while logged in):
   ```
   POST http://localhost:5000/api/v1/auth/2fa/setup
   Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
   ```

2. **Check Backend Logs** - You should now see ONE of these:
   - ✅ `"2FA secret saved successfully"` → Setup worked!
   - ❌ `"Failed to save 2FA secret"` → Check the error details
   - ❌ `"2FA secret not saved after update"` → UPDATE succeeded but SELECT failed

### Step 4: Check What Error You Get

**If you see "Failed to save 2FA secret":**
- Look for `errorCode` in the logs
- `42501` = RLS violation (policy exists but not working)
- `23505` = Unique constraint violation
- `23503` = Foreign key violation
- Other codes = Check Supabase docs

**If you see "2FA secret not saved after update":**
- UPDATE succeeded but the SELECT query can't find it
- This might be a timing issue or RLS blocking SELECT

### Step 5: Verify in Database
After calling setup, check directly in Supabase SQL Editor:

```sql
-- Replace YOUR_USER_ID with your actual user ID
SELECT id, email, two_factor_secret, two_factor_secret_set_at
FROM users
WHERE id = 'YOUR_USER_ID';
```

**Expected after setup:**
- `two_factor_secret` should have a value (base32 string)
- `two_factor_secret_set_at` should have a timestamp

**If both are NULL:**
- The UPDATE didn't work (check backend logs for error)

**If they have values:**
- Setup worked! The issue is in the `enable` endpoint

### Step 6: Test Enable Endpoint
If setup worked (secret exists in DB), try enable:

```
POST http://localhost:5000/api/v1/auth/2fa/enable
Body: { "token": "123456" }  # Use actual code from authenticator
```

## Common Issues & Fixes

### Issue: "42501: new row violates row-level security policy"
**Fix**: The service role key might be wrong. Verify:
1. Copy service_role key from Supabase Dashboard
2. Update `backend/.env`
3. Restart backend

### Issue: UPDATE succeeds but SELECT returns NULL
**Fix**: This is rare but could be:
1. RLS blocking SELECT even for service_role
2. Check if there's a SELECT policy blocking service_role

Run this to check:
```sql
SELECT policyname, roles::text, cmd::text
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'SELECT'
AND roles::text LIKE '%service_role%';
```

If no SELECT policy exists for service_role, add one:
```sql
CREATE POLICY "Service role can select users" 
  ON users 
  FOR SELECT 
  TO service_role
  USING (true);
```

### Issue: Backend logs show no errors but secret is NULL
**Fix**: Check if the backend is actually using service_role:
1. Add temporary log in `generate2FASecret()`:
   ```typescript
   logger.info('Using service role key', { 
     keyPrefix: config.supabase.serviceRoleKey?.substring(0, 20) 
   });
   ```
2. Verify it matches Supabase Dashboard

## Quick Test Script

Run this in Supabase SQL Editor to test UPDATE directly:

```sql
-- Get your user ID first
SELECT id, email FROM users LIMIT 1;

-- Then test UPDATE (replace USER_ID_HERE)
SET ROLE service_role;
UPDATE users 
SET two_factor_secret = 'TEST123', 
    two_factor_secret_set_at = NOW()
WHERE id = 'USER_ID_HERE'
RETURNING id, two_factor_secret, two_factor_secret_set_at;
RESET ROLE;
```

**If this works**: The issue is in the backend code or service role key
**If this fails**: There's an RLS or permission issue

## Summary

1. ✅ RLS policy exists (you confirmed this)
2. ⏳ Restart backend with new error handling
3. ⏳ Test setup endpoint
4. ⏳ Check backend logs for actual error
5. ⏳ Verify secret in database
6. ⏳ Test enable endpoint

The new error handling will show you **exactly** what's failing instead of the generic "Setup not initialized" message.



