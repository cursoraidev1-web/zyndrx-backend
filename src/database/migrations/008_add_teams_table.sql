-- Create teams table (organizational units within a company)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Create team_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'developer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams in their company"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = teams.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams in their company"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = teams.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Team leads and admins can update teams"
  ON teams FOR UPDATE
  USING (
    team_lead_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = teams.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete teams"
  ON teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = teams.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view team members in their company"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN user_companies ON user_companies.company_id = teams.company_id
      WHERE teams.id = team_members.team_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Team leads and admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (
        teams.team_lead_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_companies
          WHERE user_companies.company_id = teams.company_id
          AND user_companies.user_id = auth.uid()
          AND user_companies.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Team leads and admins can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (
        teams.team_lead_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_companies
          WHERE user_companies.company_id = teams.company_id
          AND user_companies.user_id = auth.uid()
          AND user_companies.role = 'admin'
        )
      )
    )
  );



