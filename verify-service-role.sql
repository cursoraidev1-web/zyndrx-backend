-- Verify Service Role Policy for Users UPDATE
-- Run this to confirm the policy exists and is correct

-- 1. Check if policy exists
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

-- 2. Verify service_role has UPDATE permission
SELECT 
  grantee, 
  privilege_type, 
  table_name
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND grantee = 'service_role'
  AND privilege_type = 'UPDATE';

-- 3. Test UPDATE directly (replace YOUR_USER_ID with actual user ID)
-- This will show if RLS is blocking the update
/*
SET ROLE service_role;
UPDATE users 
SET two_factor_secret = 'TEST123', 
    two_factor_secret_set_at = NOW()
WHERE id = 'YOUR_USER_ID_HERE'
RETURNING id, two_factor_secret, two_factor_secret_set_at;
RESET ROLE;
*/




