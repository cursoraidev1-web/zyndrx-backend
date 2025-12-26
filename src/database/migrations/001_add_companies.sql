-- Migration: Add Companies and Multi-Tenancy Support
-- This migration adds company/workspace support to the Zyndrx backend

-- Create companies table
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

-- Create user_companies junction table
CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin', -- admin, member, viewer
  status TEXT NOT NULL DEFAULT 'active', -- active, pending, inactive
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Add company_id to existing tables
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE prds ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_prds_company_id ON prds(company_id);

-- Add updated_at trigger for companies
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
-- Users can view companies they belong to
CREATE POLICY "Users can view their companies" ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = companies.id 
      AND user_companies.user_id = auth.uid()
    )
  );

-- Users can create companies (they'll be added as admin)
CREATE POLICY "Users can create companies" ON companies FOR INSERT
  WITH CHECK (true);

-- Company admins can update their companies
CREATE POLICY "Company admins can update companies" ON companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = companies.id 
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- RLS Policies for user_companies
-- Users can view their own company memberships
CREATE POLICY "Users can view their company memberships" ON user_companies FOR SELECT
  USING (user_id = auth.uid() OR company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

-- Users can be added to companies (via invitation)
CREATE POLICY "Users can be added to companies" ON user_companies FOR INSERT
  WITH CHECK (true);

-- Company admins can update memberships
CREATE POLICY "Company admins can update memberships" ON user_companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = user_companies.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  );

-- Company admins can remove members
CREATE POLICY "Company admins can remove members" ON user_companies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = user_companies.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  );

