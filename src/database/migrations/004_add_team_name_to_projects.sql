-- Migration: Add team_name column to projects table
-- This allows projects to be organized by teams/departments

-- Add team_name column if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS team_name TEXT DEFAULT 'Engineering';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_team_name ON projects(team_name);

-- Update existing projects to have a default team_name if null
UPDATE projects 
SET team_name = 'Engineering' 
WHERE team_name IS NULL;

