-- Migration: Add 2FA Recovery Codes Support
-- Adds missing 2FA columns to users table and introduces recovery codes table.

-- Ensure 2FA columns exist on users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_confirmed_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_secret_set_at TIMESTAMPTZ;

-- Recovery codes table (hashed codes, one-time use)
CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_two_factor_recovery_codes_user_id
  ON two_factor_recovery_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_two_factor_recovery_codes_user_unused
  ON two_factor_recovery_codes(user_id)
  WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE two_factor_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Service role can manage all recovery codes
DROP POLICY IF EXISTS "Service role can manage 2FA recovery codes" ON two_factor_recovery_codes;
CREATE POLICY "Service role can manage 2FA recovery codes" ON two_factor_recovery_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE two_factor_recovery_codes TO service_role;






