-- Quick SQL to create storage bucket if it doesn't exist
-- Run this in Supabase SQL Editor

-- Note: Storage buckets are created via the Supabase Dashboard, not SQL
-- But we can check if it exists and provide instructions

-- Check if bucket exists
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'documents';

-- If the query returns no rows, the bucket doesn't exist
-- You need to create it manually:
--
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: "documents"
-- 4. ✅ Enable "Public bucket" (IMPORTANT!)
-- 5. File size limit: Set to maximum (e.g., 500MB) or based on your plan
-- 6. Allowed MIME types: Leave empty (backend validates)
-- 7. Click "Create"
--
-- After creating the bucket, run migration 028_fix_storage_bucket_rls_complete.sql
-- to set up the RLS policies.


