-- Migration: Fix Task Creation RLS Policy
-- Issue: Project owners can't create tasks if they're not in project_members table
-- Fix: Update RLS policy to allow both project owners AND project members to create tasks

-- Drop existing policy
DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;

-- Create updated policy that allows both project owners and members
CREATE POLICY "Project members or owners can create tasks" 
  ON tasks FOR INSERT
  WITH CHECK (
    -- Allow if user is the project owner
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Allow if user is a project member
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
    )
  );

-- Also update the SELECT policy for consistency
DROP POLICY IF EXISTS "Project members can view tasks" ON tasks;

CREATE POLICY "Project members or owners can view tasks" 
  ON tasks FOR SELECT
  USING (
    -- Allow if user is the project owner
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Allow if user is a project member
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
    )
  );





