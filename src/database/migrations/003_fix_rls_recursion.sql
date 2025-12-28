-- ============================================================================
-- Migration 003: Fix RLS Infinite Recursion in user_companies
-- ============================================================================
-- This migration fixes the infinite recursion error in user_companies RLS policies
-- by using a SECURITY DEFINER function to check admin status
-- ============================================================================

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view their company memberships" ON user_companies;
DROP POLICY IF EXISTS "Company admins can update memberships" ON user_companies;
DROP POLICY IF EXISTS "Company admins can remove members" ON user_companies;

-- Create a SECURITY DEFINER function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_company_admin(company_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = company_id_param
    AND user_companies.user_id = user_id_param
    AND user_companies.role = 'admin'
  );
END;
$$;

-- Simplified SELECT policy (no recursion)
CREATE POLICY "Users can view their company memberships" 
  ON user_companies FOR SELECT
  USING (user_id = auth.uid());

-- UPDATE policy using the function (no recursion)
CREATE POLICY "Company admins can update memberships" 
  ON user_companies FOR UPDATE
  USING (
    user_id = auth.uid() OR  -- Users can update their own membership
    public.is_company_admin(company_id, auth.uid())  -- Or if they're an admin
  );

-- DELETE policy using the function (no recursion)
CREATE POLICY "Company admins can remove members" 
  ON user_companies FOR DELETE
  USING (
    user_id = auth.uid() OR  -- Users can remove themselves
    public.is_company_admin(company_id, auth.uid())  -- Or if they're an admin
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================



