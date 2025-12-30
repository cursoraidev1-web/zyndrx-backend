# Fix OAuth User Creation Error

## Error Message
```
error=server_error
error_code=unexpected_failure
error_description=Database+error+saving+new+user
```

## Problem

When a new user signs up via OAuth (Google/GitHub), Supabase creates the user in `auth.users`, but the trigger function that should automatically create a profile in `public.users` is failing.

## Root Cause

The `handle_new_user()` trigger function may:
1. Not exist in your Supabase database
2. Have permission issues with RLS policies
3. Be missing error handling for edge cases
4. Have conflicts with existing user records

## Solution

### Step 1: Run the Fix SQL Script

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `src/database/fix_oauth_user_creation.sql`
4. Click **Run**

This script will:
- ✅ Drop and recreate the trigger function with better error handling
- ✅ Add proper permissions
- ✅ Handle OAuth metadata correctly (Google vs GitHub field names)
- ✅ Add conflict handling for race conditions
- ✅ Add exception handling to prevent auth failures

### Step 2: Verify the Fix

After running the script, you can verify it worked by checking:

```sql
-- Check if function exists
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if trigger exists
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Test with a manual query (optional)
SELECT * FROM public.users ORDER BY created_at DESC LIMIT 5;
```

### Step 3: Test OAuth Signup

1. Try signing up with Google OAuth again
2. The user profile should be created automatically
3. Check the `public.users` table to confirm the user was created

## Alternative: Manual User Creation (Backend Fallback)

Your backend code already has a fallback in `oauth.service.ts` that manually creates the user profile if the trigger doesn't fire. However, it's better to have the trigger working correctly.

The backend fallback handles:
- User profile creation if trigger doesn't fire
- Metadata extraction from OAuth providers
- Default values for missing fields

## Common Issues

### Issue 1: RLS Policies Blocking Insert

**Solution**: The `SECURITY DEFINER` flag should bypass RLS, but if issues persist, ensure:
- Function has `SECURITY DEFINER` set
- Function has proper permissions
- Service role key is used for admin operations

### Issue 2: Missing OAuth Metadata

OAuth providers return different metadata:
- **Google**: `full_name`, `picture` in `user_metadata`
- **GitHub**: `name`, `avatar_url` in `user_metadata`

The updated function handles both formats.

### Issue 3: Race Conditions

If a user tries to sign up twice quickly, there might be duplicate key errors. The fix script includes `ON CONFLICT DO NOTHING` to handle this gracefully.

## Manual Verification Queries

```sql
-- Check recent users
SELECT id, email, full_name, role, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if a specific user exists
SELECT * FROM public.users WHERE email = 'user@example.com';

-- Check auth.users vs public.users sync
SELECT 
  au.id,
  au.email,
  pu.id as profile_exists
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;
```

## If the Issue Persists

1. **Check Supabase Logs**: Go to Logs → Postgres Logs to see detailed error messages
2. **Verify Function Permissions**: Ensure the function has proper grants
3. **Check RLS Policies**: Ensure INSERT is allowed (the function should bypass this)
4. **Review Backend Logs**: Check your backend logs for any additional errors

## Quick Fix Summary

Run this single command in Supabase SQL Editor:

```sql
-- Quick fix: Recreate function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'unknown@example.com'), '@', 1)
    ),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'developer'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

