-- Verification Queries for PRD and Documents Setup
-- Run these queries to verify everything is set up correctly

-- 1. Verify storage bucket exists (check via Storage dashboard instead)
-- Note: Storage bucket verification cannot be done via SQL

-- 2. Verify PRDs table has company_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'prds' AND column_name = 'company_id';

-- 3. Verify documents table has company_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents' AND column_name = 'company_id';

-- 4. Verify RLS is enabled on PRDs table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'prds';

-- 5. Verify RLS is enabled on documents table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'documents';

-- 6. List all RLS policies on PRDs table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'prds';

-- 7. List all RLS policies on documents table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'documents';

-- 8. List all storage policies for documents bucket
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
AND (qual::text LIKE '%documents%' OR with_check::text LIKE '%documents%');

-- 9. Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('prds', 'documents', 'prd_versions')
AND indexdef LIKE '%company_id%';


