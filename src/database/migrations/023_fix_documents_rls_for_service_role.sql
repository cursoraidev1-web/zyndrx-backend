-- Migration: Fix Documents RLS Policy for Service Role
-- This ensures service role operations work correctly while maintaining security

-- Drop existing policies
DROP POLICY IF EXISTS "Company members can create documents" ON documents;

-- Create Policy: Company members can create documents
-- This policy allows authenticated users in the company to create documents
-- Service role (used by backend) bypasses RLS automatically, but we ensure the policy works for direct client access too
CREATE POLICY "Company members can create documents" ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is in the company with active status
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = documents.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  -- Ensure uploaded_by matches the authenticated user (for security)
  AND uploaded_by = auth.uid()
  -- Ensure company_id is set
  AND documents.company_id IS NOT NULL
  -- Ensure project_id is set
  AND documents.project_id IS NOT NULL
);

-- Verify RLS is enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Note: Service role (supabaseAdmin) should automatically bypass RLS policies
-- If you're still getting RLS errors, verify:
-- 1. SUPABASE_SERVICE_ROLE_KEY environment variable is set correctly
-- 2. The supabaseAdmin client is using the service role key (check config/supabase.ts)
-- 3. The service role key has admin permissions in Supabase dashboard

