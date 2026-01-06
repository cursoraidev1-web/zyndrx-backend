-- ============================================================================
-- Migration 035: Fix Users Table UPDATE RLS Policy
-- ============================================================================
-- Issue: Avatar update fails with "new row violates row-level security policy"
-- Root Cause: Service role doesn't have UPDATE policy on users table
-- Solution: Add service_role UPDATE policy to allow backend to update user profiles
-- ============================================================================

-- Drop existing UPDATE policy for users if it exists
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can update users" ON users;

-- Recreate the user UPDATE policy (users can update their own profile)
CREATE POLICY "Users can update their own profile" 
  ON users 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add service_role UPDATE policy (allows backend to update any user)
CREATE POLICY "Service role can update users" 
  ON users 
  FOR UPDATE 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant UPDATE permission to service_role (if not already granted)
GRANT UPDATE ON users TO service_role;

-- ============================================================================
-- Verification Query (run after migration to confirm)
-- ============================================================================
-- SELECT 
--   schemaname, 
--   tablename, 
--   policyname, 
--   permissive, 
--   roles, 
--   cmd, 
--   qual, 
--   with_check
-- FROM pg_policies 
-- WHERE tablename = 'users' 
-- AND cmd = 'UPDATE'
-- ORDER BY policyname;
-- ============================================================================




