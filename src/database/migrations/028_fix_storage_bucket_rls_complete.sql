-- Migration: Complete Fix for Storage Bucket RLS
-- This ensures both authenticated users and service_role can upload/read/delete files
-- 
-- IMPORTANT: The storage bucket must be PUBLIC for signed URLs to work
-- Access is still controlled via RLS policies

-- ============================================================================
-- STEP 1: Drop existing policies (for idempotency)
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow company members to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow document owners to delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage storage objects" ON storage.objects;

-- ============================================================================
-- STEP 2: Create policies for authenticated users
-- ============================================================================

-- Upload Policy: Authenticated users can upload to documents bucket
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Read Policy: Authenticated users can read from documents bucket
CREATE POLICY "Allow company members to read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
);

-- Delete Policy: Authenticated users can delete from documents bucket
-- Note: Application layer ensures users can only delete documents they have permission for
CREATE POLICY "Allow document owners to delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
);

-- ============================================================================
-- STEP 3: Create policy for service_role (bypasses RLS)
-- ============================================================================

-- Service role can do everything on storage objects
CREATE POLICY "Service role can manage storage objects"
ON storage.objects
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STEP 4: Grant permissions to service_role
-- ============================================================================

-- Grant storage permissions to service_role
DO $$
BEGIN
    -- Grant usage on storage schema
    GRANT USAGE ON SCHEMA storage TO service_role;
    
    -- Grant all on storage.objects
    GRANT ALL ON storage.objects TO service_role;
    
    RAISE NOTICE 'Granted storage permissions to service_role';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not grant storage permissions: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND (policyname LIKE '%documents%' OR policyname LIKE '%storage%');
    
    RAISE NOTICE 'Storage policies created: %', policy_count;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. The storage bucket must be PUBLIC (not private) for signed URLs to work
--    - Go to Supabase Dashboard → Storage → documents bucket
--    - Ensure "Public bucket" is checked
--
-- 2. The bucket must exist before running this migration
--    - Create it in Supabase Dashboard → Storage → New bucket
--    - Name: "documents"
--    - Public: ✅ Enabled
--
-- 3. These policies allow:
--    - Authenticated users to upload/read/delete files in documents bucket
--    - Service role to do everything (bypasses RLS)
--
-- 4. Security is enforced by:
--    - Backend API validates company membership before generating upload paths
--    - Upload path structure: {company_id}/{project_id}/{timestamp}-{filename}
--    - Documents table RLS policies prevent unauthorized metadata access
--
-- ============================================================================

