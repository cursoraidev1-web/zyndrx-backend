-- Migration: Add RLS Policies for Documents Table
-- These policies ensure users can only access documents from their company

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Company members can view documents" ON documents;
DROP POLICY IF EXISTS "Company members can create documents" ON documents;
DROP POLICY IF EXISTS "Document uploaders and admins can update documents" ON documents;
DROP POLICY IF EXISTS "Document uploaders and admins can delete documents" ON documents;

-- View Policy: Company members can view documents in their company
CREATE POLICY "Company members can view documents" ON documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = documents.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
);

-- Create Policy: Company members can create documents
CREATE POLICY "Company members can create documents" ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = documents.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND uploaded_by = auth.uid()
);

-- Update Policy: Document uploaders and company admins can update documents
CREATE POLICY "Document uploaders and admins can update documents" ON documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = documents.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = documents.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
      AND user_companies.status = 'active'
    )
  )
);

-- Delete Policy: Document uploaders and company admins can delete documents
CREATE POLICY "Document uploaders and admins can delete documents" ON documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = documents.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = documents.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
      AND user_companies.status = 'active'
    )
  )
);


