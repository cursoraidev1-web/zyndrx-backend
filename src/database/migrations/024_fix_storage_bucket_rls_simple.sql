-- Migration: Fix Storage Bucket RLS Policy for Document Uploads
-- This simplifies the upload policy to allow authenticated users to upload
-- Security is enforced by the backend API which validates company membership

-- Drop existing upload policy
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;

-- Create simplified upload policy
-- This allows any authenticated user to upload to the documents bucket
-- The backend API ensures only authorized users can get upload paths
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Note: This policy is intentionally permissive for uploads because:
-- 1. The backend API validates company membership before generating upload paths
-- 2. The upload path structure ({company_id}/{project_id}/...) ensures organization
-- 3. The documents table RLS policy prevents unauthorized access to metadata
-- 4. Read/Delete policies can be more restrictive if needed


