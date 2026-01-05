-- Migration: Fix Service Role RLS Bypass for All Tables
-- This ensures the service role can perform operations on all tables without RLS restrictions
-- Note: Service role should automatically bypass RLS, but this adds explicit grants as a safety measure

-- Grant service_role permissions on all tables that have RLS enabled
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Loop through all tables that have RLS enabled
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'users', 'companies', 'user_companies', 'projects', 'project_members',
            'tasks', 'comments', 'documents', 'prds', 'prd_versions',
            'notifications', 'audit_logs', 'subscriptions', 'teams', 'handoffs',
            'task_attachments', 'company_invites', 'feedback', 'push_subscriptions',
            'github_integrations', 'security_events'
        )
    LOOP
        -- Grant all permissions to service_role
        EXECUTE format('GRANT ALL ON TABLE %I.%I TO service_role', 
                       table_record.schemaname, table_record.tablename);
        
        -- Also grant usage on sequences (for auto-increment columns)
        BEGIN
            EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO service_role', 
                          table_record.schemaname);
        EXCEPTION WHEN OTHERS THEN
            -- Sequences might not exist for all tables, ignore errors
            NULL;
        END;
    END LOOP;
END $$;

-- Verify service_role exists and has correct permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        RAISE WARNING 'service_role does not exist. This is normal in some Supabase setups.';
    ELSE
        RAISE NOTICE 'service_role found. Permissions granted.';
    END IF;
END $$;

-- Additional: Ensure service_role can bypass RLS by setting session role
-- This is a safety measure - service role should bypass RLS automatically
-- but we ensure it has the necessary privileges

-- Note: In Supabase, the service_role should automatically bypass RLS policies
-- when using the service_role key. If you're still getting RLS errors:
-- 1. Verify SUPABASE_SERVICE_ROLE_KEY is set in backend/.env
-- 2. Verify the key matches Supabase Dashboard > Settings > API > service_role key
-- 3. Verify supabaseAdmin client uses serviceRoleKey (check config/supabase.ts)
-- 4. Restart the backend server after setting the environment variable



