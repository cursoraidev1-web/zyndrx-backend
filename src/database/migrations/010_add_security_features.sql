-- Migration: Add security features for account lockout and audit logging
-- This adds columns for tracking failed login attempts and account lockout

-- Add failed login attempt tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Add security events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'login_attempt', 'login_success', 'login_failed', 'account_locked', 'password_reset', '2fa_enabled', etc.
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- RLS for security_events (admins can view all, users can view their own)
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security events"
  ON security_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Company admins can view company security events"
  ON security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc1
      JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
      WHERE uc1.user_id = auth.uid()
      AND uc2.user_id = security_events.user_id
      AND uc1.role = 'admin'
    )
  );

