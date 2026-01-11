-- Create integrations table for managing all third-party integrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'github', 'slack', 'jira', 'figma', 'linear', 'zapier', etc.
  name TEXT NOT NULL, -- Display name
  description TEXT,
  category TEXT, -- 'Development', 'Communication', 'Project Management', 'Design', 'Automation'
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}', -- Store integration-specific configuration
  credentials JSONB DEFAULT '{}', -- Store encrypted credentials (access tokens, API keys, etc.)
  metadata JSONB DEFAULT '{}', -- Additional metadata (last_sync, webhook_url, etc.)
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integrations_company_id ON integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_integrations_project_id ON integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_is_connected ON integrations(is_connected);
CREATE INDEX IF NOT EXISTS idx_integrations_created_by ON integrations(created_by);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations
CREATE POLICY "Users can view integrations in their company"
  ON integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = integrations.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.status = 'active'
    )
  );

CREATE POLICY "Users can create integrations in their company"
  ON integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = integrations.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.status = 'active'
    )
  );

CREATE POLICY "Users can update integrations in their company"
  ON integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = integrations.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.status = 'active'
    )
  );

CREATE POLICY "Users can delete integrations in their company"
  ON integrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = integrations.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.status = 'active'
    )
  );

-- Grant permissions to service_role
GRANT ALL ON TABLE integrations TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();









