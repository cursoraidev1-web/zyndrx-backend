-- Migration: Add Feedback Table
-- This migration adds a feedback table for user feedback, bug reports, and feature requests

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'general', -- 'general', 'bug', 'feature', 'issue'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'closed'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_company_id ON feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_feedback_updated_at 
  BEFORE UPDATE ON feedback 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback
-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON feedback FOR SELECT
  USING (user_id = auth.uid());

-- Users can create feedback
CREATE POLICY "Users can create feedback" ON feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own feedback (only if status is pending)
CREATE POLICY "Users can update their own pending feedback" ON feedback FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Company admins can view all feedback for their company
CREATE POLICY "Company admins can view company feedback" ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies 
      WHERE user_companies.company_id = feedback.company_id 
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

