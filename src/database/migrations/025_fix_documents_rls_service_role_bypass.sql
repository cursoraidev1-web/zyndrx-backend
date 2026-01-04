-- Migration: Fix Documents RLS to Allow Service Role Bypass
-- This ensures service role operations work correctly

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Company members can create documents" ON documents;

-- Create a more permissive INSERT policy
-- Service role should bypass RLS automatically, but this ensures authenticated users can also insert
CREATE POLICY "Company members can create documents" ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure required fields are present
  company_id IS NOT NULL
  AND project_id IS NOT NULL
  AND uploaded_by IS NOT NULL
  -- Verify user has active membership in the company
  AND EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = documents.company_id
    AND user_companies.user_id = COALESCE(auth.uid(), documents.uploaded_by)
    AND user_companies.status = 'active'
  )
);

-- Ensure RLS is enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Grant service role explicit permissions (if needed)
-- Service role should bypass RLS automatically, but this is a safety measure
DO $$
BEGIN
  -- Check if service_role exists and grant permissions
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON documents TO service_role;
    GRANT ALL ON user_companies TO service_role;
  END IF;
END $$;

-- Note: Service role (supabaseAdmin) should automatically bypass RLS policies
-- If you're still getting RLS errors, verify:
-- 1. SUPABASE_SERVICE_ROLE_KEY environment variable is set correctly in backend/.env
-- 2. The service role key matches the one in Supabase Dashboard > Settings > API
-- 3. The supabaseAdmin client is using the service role key (check config/supabase.ts)


