-- Quick test to verify 2FA setup can write to users table
-- Run this in Supabase SQL Editor to verify RLS policies

-- 1. Check if service_role UPDATE policy exists
SELECT 
  policyname, 
  roles::text, 
  cmd::text,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- 2. Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('two_factor_secret', 'two_factor_secret_set_at', 'is_two_factor_enabled', 'two_factor_confirmed_at')
ORDER BY column_name;

-- 3. Test UPDATE as service_role (if you have a test user ID)
-- Replace 'YOUR_USER_ID_HERE' with an actual user ID from your users table
-- This should work if RLS is configured correctly
/*
UPDATE users 
SET two_factor_secret = 'TEST123', 
    two_factor_secret_set_at = NOW()
WHERE id = 'YOUR_USER_ID_HERE'
RETURNING id, two_factor_secret, two_factor_secret_set_at;
*/

