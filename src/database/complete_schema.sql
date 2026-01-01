-- ============================================================================
-- Zyndrx Complete Database Schema
-- ============================================================================
-- This file contains the complete database setup for Zyndrx backend
-- Run this script in your Supabase SQL Editor to set up a fresh database
-- 
-- Includes:
-- - Base schema (users, projects, tasks, PRDs, etc.)
-- - Multi-tenancy support (companies, user_companies)
-- - Subscription and billing (subscriptions, plan_limits)
-- - 2FA support columns
-- - All indexes, triggers, functions, and RLS policies
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================

-- Base ENUMs
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'product_manager', 'developer', 'qa', 'devops', 'designer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'completed', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE prd_status AS ENUM ('draft', 'in_review', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_completed', 'prd_approved', 'prd_rejected', 'comment_added', 'mention', 'deployment_status');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Migration ENUMs (for subscriptions)
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. CORE TABLES (Base Schema)
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'developer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- 2FA columns
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  team_name TEXT DEFAULT 'Engineering'
  -- company_id will be added in migration section
);

-- Project members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- PRDs (Product Requirements Documents)
CREATE TABLE IF NOT EXISTS prds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status prd_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
  -- company_id will be added in migration section
);

-- PRD versions (for tracking changes)
CREATE TABLE IF NOT EXISTS prd_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prd_id UUID NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes_summary TEXT
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prd_id UUID REFERENCES prds(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}'
  -- company_id will be added in migration section
);

-- Comments (for PRDs and tasks)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prd_id UUID REFERENCES prds(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- company_id will be added in migration section
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- company_id will be added in migration section
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GitHub integrations
CREATE TABLE IF NOT EXISTS github_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL,
  access_token TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GitHub commits (tracked from webhooks)
CREATE TABLE IF NOT EXISTS github_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES github_integrations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  commit_sha TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL,
  deployed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  logs TEXT
);

-- ============================================================================
-- 4. MIGRATION TABLES (Multi-tenancy and Subscriptions)
-- ============================================================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  domain TEXT, -- Optional: company domain
  logo_url TEXT, -- Optional: company logo
  plan TEXT DEFAULT 'free', -- free, pro, enterprise
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-Company junction table
CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin', -- admin, member, viewer
  status TEXT NOT NULL DEFAULT 'active', -- active, pending, inactive
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Subscriptions table (per company)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'trial',
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id) -- One subscription per company
);

-- Plan limits table (static configuration)
CREATE TABLE IF NOT EXISTS plan_limits (
  plan_type plan_type PRIMARY KEY,
  max_projects INTEGER NOT NULL DEFAULT 3, -- -1 means unlimited
  max_tasks INTEGER NOT NULL DEFAULT 50, -- -1 means unlimited
  max_team_members INTEGER NOT NULL DEFAULT 5, -- -1 means unlimited
  max_documents INTEGER NOT NULL DEFAULT 20, -- -1 means unlimited
  max_storage_gb INTEGER NOT NULL DEFAULT 1, -- -1 means unlimited
  features JSONB, -- Optional: store plan features
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. ADD COMPANY_ID COLUMNS TO EXISTING TABLES
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_name TEXT DEFAULT 'Engineering';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE prds ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- Base indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_prds_project ON prds(project_id);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_comments_resource ON comments(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_task ON github_commits(task_id);

-- Migration indexes (company_id and subscriptions)
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_name ON projects(team_name);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_prds_company_id ON prds(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- ============================================================================
-- 7. FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile on signup
-- Fixed: Added ON CONFLICT DO NOTHING to prevent duplicate key errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'developer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_prds_updated_at ON prds;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_github_integrations_updated_at ON github_integrations;
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_plan_limits_updated_at ON plan_limits;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create updated_at triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prds_updated_at 
  BEFORE UPDATE ON prds 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
  BEFORE UPDATE ON comments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_integrations_updated_at 
  BEFORE UPDATE ON github_integrations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_limits_updated_at 
  BEFORE UPDATE ON plan_limits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prds ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Project members can view projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Project members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Company admins can update companies" ON companies;
DROP POLICY IF EXISTS "Users can view their company memberships" ON user_companies;
DROP POLICY IF EXISTS "Users can be added to companies" ON user_companies;
DROP POLICY IF EXISTS "Company admins can update memberships" ON user_companies;
DROP POLICY IF EXISTS "Company admins can remove members" ON user_companies;
DROP POLICY IF EXISTS "Users can view company subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Company admins can update subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can view plan limits" ON plan_limits;

-- Base RLS Policies

-- Users can read their own data
CREATE POLICY "Users can view their own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Project members can view projects they belong to
CREATE POLICY "Project members can view projects" 
  ON projects FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  );

-- Project owners can update and delete projects
CREATE POLICY "Project owners can update projects" 
  ON projects FOR UPDATE 
  USING (owner_id = auth.uid());

CREATE POLICY "Project owners can delete projects" 
  ON projects FOR DELETE 
  USING (owner_id = auth.uid());

-- Anyone authenticated can create projects
CREATE POLICY "Authenticated users can create projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Project members or owners can view tasks
CREATE POLICY "Project members or owners can view tasks" 
  ON tasks FOR SELECT
  USING (
    -- Allow if user is the project owner
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Allow if user is a project member
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
    )
  );

-- Project members or owners can create tasks
CREATE POLICY "Project members or owners can create tasks" 
  ON tasks FOR INSERT
  WITH CHECK (
    -- Allow if user is the project owner
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Allow if user is a project member
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
    )
  );

-- Users can view their notifications
CREATE POLICY "Users can view their notifications" 
  ON notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" 
  ON notifications FOR UPDATE 
  USING (user_id = auth.uid());

-- Migration RLS Policies

-- Users can view companies they belong to
CREATE POLICY "Users can view their companies" 
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = companies.id 
      AND user_companies.user_id = auth.uid()
    )
  );

-- Users can create companies (they'll be added as admin)
CREATE POLICY "Users can create companies" 
  ON companies FOR INSERT
  WITH CHECK (true);

-- Company admins can update their companies
CREATE POLICY "Company admins can update companies" 
  ON companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = companies.id 
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- Create a SECURITY DEFINER function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_company_admin(company_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = company_id_param
    AND user_companies.user_id = user_id_param
    AND user_companies.role = 'admin'
  );
END;
$$;

-- Users can view their own company memberships (simplified - no recursion)
CREATE POLICY "Users can view their company memberships" 
  ON user_companies FOR SELECT
  USING (user_id = auth.uid());

-- Users can be added to companies (via invitation)
CREATE POLICY "Users can be added to companies" 
  ON user_companies FOR INSERT
  WITH CHECK (true);

-- Company admins can update memberships (using function to avoid recursion)
CREATE POLICY "Company admins can update memberships" 
  ON user_companies FOR UPDATE
  USING (
    user_id = auth.uid() OR  -- Users can update their own membership
    public.is_company_admin(company_id, auth.uid())  -- Or if they're an admin
  );

-- Company admins can remove members (using function to avoid recursion)
CREATE POLICY "Company admins can remove members" 
  ON user_companies FOR DELETE
  USING (
    user_id = auth.uid() OR  -- Users can remove themselves
    public.is_company_admin(company_id, auth.uid())  -- Or if they're an admin
  );

-- Users can view subscriptions for companies they belong to
CREATE POLICY "Users can view company subscriptions" 
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = subscriptions.company_id 
      AND user_companies.user_id = auth.uid()
    )
  );

-- Company admins can update subscriptions
CREATE POLICY "Company admins can update subscriptions" 
  ON subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = subscriptions.company_id 
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- Anyone can view plan limits (public read)
CREATE POLICY "Anyone can view plan limits" 
  ON plan_limits FOR SELECT
  USING (true);

-- ============================================================================
-- 11. SEED DATA
-- ============================================================================

-- Insert default plan limits
INSERT INTO plan_limits (plan_type, max_projects, max_tasks, max_team_members, max_documents, max_storage_gb, features) VALUES
  ('free', 3, 50, 5, 20, 1, '{"basic_analytics": true, "email_support": true}'::jsonb),
  ('pro', -1, -1, 25, -1, 50, '{"advanced_analytics": true, "priority_support": true, "custom_integrations": true}'::jsonb),
  ('enterprise', -1, -1, -1, -1, -1, '{"advanced_analytics": true, "dedicated_support": true, "custom_integrations": true, "sso": true, "advanced_security": true, "custom_sla": true}'::jsonb)
ON CONFLICT (plan_type) DO UPDATE SET
  max_projects = EXCLUDED.max_projects,
  max_tasks = EXCLUDED.max_tasks,
  max_team_members = EXCLUDED.max_team_members,
  max_documents = EXCLUDED.max_documents,
  max_storage_gb = EXCLUDED.max_storage_gb,
  features = EXCLUDED.features;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Your database is now fully set up with:
-- - All core tables (users, projects, tasks, PRDs, etc.)
-- - Multi-tenancy support (companies, user_companies)
-- - Subscription and billing (subscriptions, plan_limits)
-- - 2FA support columns
-- - All indexes, triggers, functions, and RLS policies
-- - Default plan limits seeded
-- ============================================================================

