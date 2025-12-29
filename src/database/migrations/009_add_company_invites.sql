-- Migration: Add company_invites table for inviting new users to companies
-- This allows admins to invite users who don't have accounts yet

CREATE TABLE IF NOT EXISTS company_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_invites_company ON company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON company_invites(email);
CREATE INDEX IF NOT EXISTS idx_company_invites_token ON company_invites(token);
CREATE INDEX IF NOT EXISTS idx_company_invites_status ON company_invites(status);

-- RLS Policies for company_invites
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

-- Company admins can view invites for their company
CREATE POLICY "Company admins can view invites"
  ON company_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = company_invites.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- Company admins can create invites
CREATE POLICY "Company admins can create invites"
  ON company_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = company_invites.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- Company admins can update invites
CREATE POLICY "Company admins can update invites"
  ON company_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = company_invites.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- Anyone with a valid token can view their own invite (for signup flow)
CREATE POLICY "Users can view their own invite by token"
  ON company_invites FOR SELECT
  USING (true); -- Token will be validated in application logic

