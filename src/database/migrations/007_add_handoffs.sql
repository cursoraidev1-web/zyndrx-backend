-- Add handoff_status ENUM
DO $$ BEGIN
  CREATE TYPE handoff_status AS ENUM ('pending', 'in_review', 'approved', 'rejected', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create handoffs table
CREATE TABLE IF NOT EXISTS handoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status handoff_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_handoffs_project_id ON handoffs(project_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_from_user_id ON handoffs(from_user_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_to_user_id ON handoffs(to_user_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON handoffs(status);
CREATE INDEX IF NOT EXISTS idx_handoffs_company_id ON handoffs(company_id);

-- Enable RLS
ALTER TABLE handoffs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for handoffs
CREATE POLICY "Users can view handoffs in their company"
  ON handoffs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = handoffs.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create handoffs in their company"
  ON handoffs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = handoffs.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update handoffs they created or received"
  ON handoffs FOR UPDATE
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = handoffs.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

CREATE POLICY "Users can delete handoffs they created or admins can delete any"
  ON handoffs FOR DELETE
  USING (
    from_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = handoffs.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );


