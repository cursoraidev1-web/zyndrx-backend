-- Add task_attachments table for task file attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_project_id ON task_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_company_id ON task_attachments(company_id);

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_attachments
CREATE POLICY "Users can view attachments for tasks in their company"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = task_attachments.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments to tasks in their company"
  ON task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = task_attachments.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments or admins can delete any"
  ON task_attachments FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = task_attachments.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

