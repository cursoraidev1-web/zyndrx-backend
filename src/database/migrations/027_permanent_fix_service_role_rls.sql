-- Migration: PERMANENT FIX for Service Role RLS Bypass
-- This migration ensures service_role can perform all operations without RLS restrictions
-- 
-- IMPORTANT: The service_role should automatically bypass RLS, but if it doesn't,
-- this migration adds explicit policies and grants to ensure it works.

-- ============================================================================
-- STEP 1: Grant explicit permissions to service_role on all tables
-- ============================================================================

DO $$
DECLARE
    tbl_name TEXT;
    table_list TEXT[] := ARRAY[
        'users', 'companies', 'user_companies', 'projects', 'project_members',
        'tasks', 'comments', 'documents', 'prds', 'prd_versions',
        'notifications', 'audit_logs', 'subscriptions', 'teams', 'handoffs',
        'task_attachments', 'company_invites', 'feedback', 'push_subscriptions',
        'github_integrations', 'security_events', 'prd_documents'
    ];
BEGIN
    -- Grant permissions on all tables
    FOREACH tbl_name IN ARRAY table_list
    LOOP
        -- Check if table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name = tbl_name
        ) THEN
            -- Grant all permissions
            EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl_name);
            RAISE NOTICE 'Granted permissions on table: %', tbl_name;
        ELSE
            RAISE NOTICE 'Table does not exist, skipping: %', tbl_name;
        END IF;
    END LOOP;
    
    -- Grant usage on all sequences
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role';
    
    RAISE NOTICE 'All permissions granted to service_role';
END $$;

-- ============================================================================
-- STEP 2: Create SECURITY DEFINER functions for critical operations
-- These functions run with the privileges of the function owner (postgres),
-- bypassing RLS completely
-- ============================================================================

-- Function to insert documents (bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_document(
    p_project_id UUID,
    p_title TEXT,
    p_file_url TEXT,
    p_file_type TEXT,
    p_file_size BIGINT,
    p_uploaded_by UUID,
    p_company_id UUID,
    p_tags JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    title TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by UUID,
    company_id UUID,
    tags JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO documents (
        project_id, title, file_url, file_type, file_size,
        uploaded_by, company_id, tags, created_at, updated_at
    )
    VALUES (
        p_project_id, p_title, p_file_url, p_file_type, p_file_size,
        p_uploaded_by, p_company_id, p_tags, NOW(), NOW()
    )
    RETURNING *;
END;
$$;

-- Function to insert tasks (bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_task(
    p_title TEXT,
    p_description TEXT,
    p_status TEXT,
    p_priority TEXT,
    p_project_id UUID,
    p_company_id UUID,
    p_created_by UUID,
    p_assigned_to UUID DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_prd_id UUID DEFAULT NULL,
    p_tags JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    project_id UUID,
    company_id UUID,
    created_by UUID,
    assigned_to UUID,
    due_date DATE,
    prd_id UUID,
    tags JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO tasks (
        title, description, status, priority, project_id, company_id,
        created_by, assigned_to, due_date, prd_id, tags, created_at, updated_at
    )
    VALUES (
        p_title, p_description, p_status, p_priority, p_project_id, p_company_id,
        p_created_by, p_assigned_to, p_due_date, p_prd_id, p_tags, NOW(), NOW()
    )
    RETURNING *;
END;
$$;

-- Grant execute permissions on these functions to service_role
GRANT EXECUTE ON FUNCTION public.insert_document TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_task TO service_role;

-- ============================================================================
-- STEP 3: Add explicit RLS policies that allow service_role
-- These policies explicitly check for service_role and allow all operations
-- ============================================================================

-- Policy for documents: Allow service_role to do everything
DO $$
BEGIN
    -- Drop existing service_role policies if they exist
    DROP POLICY IF EXISTS "Service role can manage documents" ON documents;
    
    -- Create comprehensive policy for service_role
    CREATE POLICY "Service role can manage documents" ON documents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
    RAISE NOTICE 'Created service_role policy for documents';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create service_role policy for documents: %', SQLERRM;
END $$;

-- Policy for tasks: Allow service_role to do everything
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role can manage tasks" ON tasks;
    
    CREATE POLICY "Service role can manage tasks" ON tasks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
    RAISE NOTICE 'Created service_role policy for tasks';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create service_role policy for tasks: %', SQLERRM;
END $$;

-- Policy for projects: Allow service_role to do everything
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role can manage projects" ON projects;
    
    CREATE POLICY "Service role can manage projects" ON projects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
    RAISE NOTICE 'Created service_role policy for projects';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create service_role policy for projects: %', SQLERRM;
END $$;

-- Policy for all other critical tables
DO $$
DECLARE
    tbl_name TEXT;
    table_list TEXT[] := ARRAY[
        'users', 'companies', 'user_companies', 'project_members',
        'comments', 'prds', 'prd_versions', 'notifications', 'audit_logs',
        'subscriptions', 'teams', 'handoffs', 'task_attachments',
        'company_invites', 'feedback', 'push_subscriptions',
        'github_integrations', 'security_events'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY table_list
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Service role can manage %s" ON %I', tbl_name, tbl_name);
            EXECUTE format(
                'CREATE POLICY "Service role can manage %s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                tbl_name, tbl_name
            );
            RAISE NOTICE 'Created service_role policy for: %', tbl_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create service_role policy for %: %', tbl_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Verify service_role configuration
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        RAISE NOTICE '✓ service_role exists';
        
        -- Check if service_role has permissions
        IF EXISTS (
            SELECT 1 FROM information_schema.role_table_grants 
            WHERE grantee = 'service_role' 
            LIMIT 1
        ) THEN
            RAISE NOTICE '✓ service_role has table permissions';
        ELSE
            RAISE WARNING '⚠ service_role may not have table permissions';
        END IF;
    ELSE
        RAISE WARNING '⚠ service_role does not exist (this is normal in some Supabase setups)';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run these manually to verify)
-- ============================================================================

-- Uncomment and run these in Supabase SQL Editor to verify:

-- 1. Check service_role permissions:
-- SELECT * FROM information_schema.role_table_grants WHERE grantee = 'service_role';

-- 2. Check RLS policies for service_role:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE roles @> ARRAY['service_role']
-- ORDER BY tablename, policyname;

-- 3. Test service_role bypass (should work):
-- SET ROLE service_role;
-- SELECT * FROM documents LIMIT 1;
-- RESET ROLE;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. The service_role should automatically bypass RLS when using the service_role key
-- 2. If it still doesn't work, verify:
--    - SUPABASE_SERVICE_ROLE_KEY is set correctly in backend/.env
--    - The key matches Supabase Dashboard > Settings > API > service_role key
--    - Backend server has been restarted after setting the key
-- 3. The SECURITY DEFINER functions provide an alternative way to bypass RLS
-- 4. The explicit policies ensure service_role can perform operations even if auto-bypass fails
-- 
-- ============================================================================

