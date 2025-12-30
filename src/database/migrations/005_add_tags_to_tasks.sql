-- Migration: Add tags column to tasks table
-- This allows tasks to be tagged for better organization and filtering

-- Add tags column if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for faster tag filtering (GIN index for array searches)
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);




