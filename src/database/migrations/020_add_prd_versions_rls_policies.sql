-- Migration: Add RLS Policies for PRD Versions Table
-- These policies ensure users can only access PRD versions from their company

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Company members can view PRD versions" ON prd_versions;
DROP POLICY IF EXISTS "Company members can create PRD versions" ON prd_versions;

-- View Policy: Company members can view PRD versions for PRDs in their company
CREATE POLICY "Company members can view PRD versions" ON prd_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prds
    JOIN user_companies ON user_companies.company_id = prds.company_id
    WHERE prds.id = prd_versions.prd_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
);

-- Create Policy: Company members can create PRD versions
CREATE POLICY "Company members can create PRD versions" ON prd_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM prds
    JOIN user_companies ON user_companies.company_id = prds.company_id
    WHERE prds.id = prd_versions.prd_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND created_by = auth.uid()
);


