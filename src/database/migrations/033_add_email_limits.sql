-- Migration: Add Email Limits and Usage Tracking
-- This migration adds email sending limits per plan and tracks daily usage

-- Add max_emails_per_day column to plan_limits table
ALTER TABLE plan_limits 
ADD COLUMN IF NOT EXISTS max_emails_per_day INTEGER NOT NULL DEFAULT 15;

-- Update plan limits with email limits
-- Free: 15 emails per day
-- Pro: 100 emails per day  
-- Enterprise: -1 (unlimited, but can be customized)
UPDATE plan_limits 
SET max_emails_per_day = CASE 
  WHEN plan_type = 'free' THEN 15
  WHEN plan_type = 'pro' THEN 100
  WHEN plan_type = 'enterprise' THEN -1
  ELSE 15
END
WHERE max_emails_per_day = 15 OR max_emails_per_day IS NULL;

-- Create email_usage table to track daily email usage per company
CREATE TABLE IF NOT EXISTS email_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, usage_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_usage_company_date ON email_usage(company_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_email_usage_date ON email_usage(usage_date);

-- Add updated_at trigger
CREATE TRIGGER update_email_usage_updated_at 
  BEFORE UPDATE ON email_usage 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE email_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_usage
-- Users can view email usage for companies they belong to
CREATE POLICY "Users can view company email usage" ON email_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = email_usage.company_id 
      AND user_companies.user_id = auth.uid()
    )
  );

-- Service role can insert/update email usage (for backend tracking)
CREATE POLICY "Service role can manage email usage" ON email_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);




