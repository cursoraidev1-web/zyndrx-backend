-- Migration: Add Subscriptions and Billing Support
-- This migration adds subscription management to the Zyndrx backend

-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'expired', 'cancelled');
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');

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

-- Insert default plan limits
INSERT INTO plan_limits (plan_type, max_projects, max_tasks, max_team_members, max_documents, max_storage_gb, features) VALUES
  ('free', 3, 50, 5, 20, 1, '{"basic_analytics": true, "email_support": true}'::jsonb),
  ('pro', -1, -1, 25, -1, 50, '{"advanced_analytics": true, "priority_support": true, "custom_integrations": true}'::jsonb),
  ('enterprise', -1, -1, -1, -1, -1, '{"advanced_analytics": true, "dedicated_support": true, "custom_integrations": true, "sso": true, "advanced_security": true, "custom_sla": true}'::jsonb)
ON CONFLICT (plan_type) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Add updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_limits_updated_at 
  BEFORE UPDATE ON plan_limits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
-- Users can view subscriptions for companies they belong to
CREATE POLICY "Users can view company subscriptions" ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = subscriptions.company_id 
      AND user_companies.user_id = auth.uid()
    )
  );

-- Company admins can update subscriptions
CREATE POLICY "Company admins can update subscriptions" ON subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = subscriptions.company_id 
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- RLS Policies for plan_limits (public read)
CREATE POLICY "Anyone can view plan limits" ON plan_limits FOR SELECT
  USING (true);



