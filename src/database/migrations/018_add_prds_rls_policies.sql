-- Migration: Add RLS Policies for PRDs Table
-- These policies ensure users can only access PRDs from their company

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Company members can view PRDs" ON prds;
DROP POLICY IF EXISTS "Company members can create PRDs" ON prds;
DROP POLICY IF EXISTS "PRD creators and admins can update PRDs" ON prds;
DROP POLICY IF EXISTS "PRD creators and admins can delete PRDs" ON prds;

-- View Policy: Company members can view PRDs in their company
CREATE POLICY "Company members can view PRDs" ON prds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = prds.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
);

-- Create Policy: Company members can create PRDs
CREATE POLICY "Company members can create PRDs" ON prds
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = prds.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND created_by = auth.uid()
);

-- Update Policy: PRD creators and company admins can update PRDs
CREATE POLICY "PRD creators and admins can update PRDs" ON prds
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = prds.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = prds.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
      AND user_companies.status = 'active'
    )
  )
);

-- Delete Policy: PRD creators and company admins can delete PRDs
CREATE POLICY "PRD creators and admins can delete PRDs" ON prds
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = prds.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = prds.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
      AND user_companies.status = 'active'
    )
  )
);


