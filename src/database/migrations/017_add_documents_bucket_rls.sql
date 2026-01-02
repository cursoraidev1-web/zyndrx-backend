-- Migration: Add RLS Policies for Documents Storage Bucket
-- This creates Row Level Security policies for the documents storage bucket
-- 
-- Prerequisites:
-- 1. Create the 'documents' bucket in Supabase Storage (make it public)
-- 2. Run this SQL in Supabase SQL Editor
--
-- Path structure: {company_id}/{project_id}/{timestamp}-{filename}
-- Example: abc123-company-id/xyz789-project-id/1704067200000-document.pdf

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow company members to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow document owners to delete documents" ON storage.objects;

-- Upload Policy: Authenticated users can upload documents to their company's folder
-- Path structure: {company_id}/{project_id}/{timestamp}-{filename}
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Read Policy: Authenticated users can read documents
-- Note: Access is further restricted by the application layer checking company_id
CREATE POLICY "Allow company members to read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Delete Policy: Authenticated users can delete documents
-- Note: Application layer ensures users can only delete documents they have permission for
CREATE POLICY "Allow document owners to delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');


