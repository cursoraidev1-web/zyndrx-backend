-- Migration: Fix Storage Upload RLS for Public Bucket
-- This allows uploads to work even when users don't have Supabase native sessions
-- The bucket should be PUBLIC, but we still need RLS policies for uploads
--
-- IMPORTANT: This migration assumes the bucket is PUBLIC
-- If bucket is private, users need Supabase native sessions

-- ============================================================================
-- STEP 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to documents bucket" ON storage.objects;

-- ============================================================================
-- STEP 2: Create more permissive upload policy
-- ============================================================================

-- Option 1: Allow authenticated users (Supabase native sessions)
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Option 2: Allow public uploads (if bucket is public)
-- This allows uploads even without Supabase native session
-- Security is enforced by backend API which validates permissions before generating upload paths
CREATE POLICY "Allow public uploads to documents bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'documents'
);

-- ============================================================================
-- STEP 3: Ensure read policy allows public access (for public bucket)
-- ============================================================================

DROP POLICY IF EXISTS "Allow public to read documents" ON storage.objects;

CREATE POLICY "Allow public to read documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'documents'
);

-- ============================================================================
-- STEP 4: Keep existing authenticated read policy (for private access if needed)
-- ============================================================================

-- This policy is already created in migration 028, but ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Allow company members to read documents'
  ) THEN
    CREATE POLICY "Allow company members to read documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. This migration creates policies that allow:
--    - Public uploads (if bucket is public)
--    - Authenticated uploads (if user has Supabase session)
--    - Public reads (if bucket is public)
--
-- 2. Security is maintained by:
--    - Backend API validates company membership before generating upload paths
--    - Upload paths are structured: {company_id}/{project_id}/{timestamp}-{filename}
--    - Documents table RLS prevents unauthorized metadata access
--
-- 3. If you want to restrict uploads to authenticated users only:
--    - Drop the "Allow public uploads to documents bucket" policy
--    - Users will need Supabase native sessions to upload
--
-- 4. The bucket MUST be PUBLIC in Supabase Dashboard for this to work
--    - Go to Storage → documents bucket → Settings
--    - Enable "Public bucket"
--
-- ============================================================================








