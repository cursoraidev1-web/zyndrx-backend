-- Migration: Add RLS Policies for Avatars Bucket
-- This migration creates Row Level Security policies for the avatars storage bucket
-- 
-- Prerequisites:
-- 1. Create the 'avatars' bucket in Supabase Storage (make it public)
-- 2. Run this SQL in Supabase SQL Editor
--
-- Path structure: {userId}/{timestamp}.{extension}
-- Example: abc123-user-id/1234567890.jpg

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own avatars" ON storage.objects;

-- Upload Policy: Users can upload avatars to their own folder
-- Path structure: {userId}/{timestamp}.{extension}
-- Checks that the first folder in the path matches the user's UUID
CREATE POLICY "Allow users to upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Read Policy: Anyone can read avatars (public bucket)
-- Since avatars are public, anyone can view them
CREATE POLICY "Allow public to read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Delete Policy: Users can delete their own avatars
-- Only allows deletion if the file is in the user's folder
CREATE POLICY "Allow users to delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: If storage.foldername() doesn't work, use this alternative:
-- WITH CHECK (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'))
-- USING (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'))

