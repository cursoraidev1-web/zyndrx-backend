-- Migration: Add Indexes for PRDs and Documents Tables
-- Create indexes if they don't exist (should already exist from migration 001, but ensuring they're present)

-- PRDs indexes
CREATE INDEX IF NOT EXISTS idx_prds_company_id ON prds(company_id);
CREATE INDEX IF NOT EXISTS idx_prds_project_id ON prds(project_id);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- PRD versions indexes
CREATE INDEX IF NOT EXISTS idx_prd_versions_prd_id ON prd_versions(prd_id);


