-- Migration: Fix Storage Upload RLS for Public Avatars Bucket
-- This mirrors the working "documents" bucket pattern (see migration 029)
-- and allows avatar uploads even when users don't have Supabase native sessions.
--
-- IMPORTANT:
-- - This assumes the "avatars" bucket is PUBLIC in Supabase Dashboard.
-- - Security is enforced by the backend API generating upload paths.

-- ============================================================================
-- STEP 1: Drop existing avatar storage policies (idempotent)
-- ============================================================================

DROP POLICY IF EXISTS "Allow users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own avatars" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read avatars" ON storage.objects;

-- ============================================================================
-- STEP 2: Upload policies
-- ============================================================================

-- Option 1: Allow authenticated users (Supabase native sessions)
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
);

-- Option 2: Allow public uploads (if bucket is public)
-- This allows uploads even without Supabase native session.
-- Backend validates the user and generates the upload path.
CREATE POLICY "Allow public uploads to avatars bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'avatars'
);

-- ============================================================================
-- STEP 3: Read policy (public bucket)
-- ============================================================================

CREATE POLICY "Allow public to read avatars"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
);

-- ============================================================================
-- STEP 4: Optional delete policy (kept simple, app-enforced)
-- ============================================================================

-- Allow authenticated users to delete from avatars bucket.
-- App layer should enforce "only delete your own avatar" if/when you add deletes.
DROP POLICY IF EXISTS "Allow authenticated users to delete avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
);



