# 📊 Zyndrx Database Schema - Complete Guide

A comprehensive guide to the Zyndrx database structure, relationships, and design decisions.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Statistics](#database-statistics)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Enum Types](#enum-types)
5. [Core Tables](#core-tables)
6. [Table Details](#table-details)
7. [Relationships](#relationships)
8. [Indexes](#indexes)
9. [Security Policies](#security-policies)
10. [Triggers & Functions](#triggers--functions)

---

## 🎯 Overview

The Zyndrx database is designed to support a complete project management and development coordination platform. It uses **PostgreSQL** via Supabase and follows these principles:

- **Normalized Structure** - 3NF normalization to reduce redundancy
- **Referential Integrity** - All relationships enforced with foreign keys
- **Audit Trail** - Timestamps and audit logs for accountability
- **Security** - Row-level security (RLS) for data protection
- **Performance** - Strategic indexes for fast queries

---

## 📊 Database Statistics

- **Total Tables:** 11 core tables
- **Enum Types:** 5 custom types
- **Foreign Keys:** 15+ relationships
- **Indexes:** 20+ indexes for performance
- **Triggers:** 8 auto-update triggers
- **RLS Policies:** 10+ security policies

---

## 🗺️ Entity Relationship Diagram

### High-Level Architecture

```
                    ┌─────────────┐
                    │    USERS    │
                    │  (Auth Hub) │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌─────────────┐  ┌──────────┐  ┌──────────┐
    │  PROJECTS   │  │  TASKS   │  │  PRDS    │
    │  (Owner)    │  │(Assigned)│  │ (Author) │
    └──────┬──────┘  └─────┬────┘  └────┬─────┘
           │               │            │
           ├───────────────┼────────────┤
           │               │            │
    ┌──────▼──────┐  ┌────▼────┐  ┌───▼──────┐
    │  PROJECT    │  │COMMENTS │  │   PRD    │
    │  MEMBERS    │  │         │  │ VERSIONS │
    └─────────────┘  └─────────┘  └──────────┘
           │               
           │         
    ┌──────▼──────────────────────┐
    │   DOCUMENTS                  │
    │   NOTIFICATIONS              │
    │   AUDIT_LOGS                │
    │   GITHUB_INTEGRATIONS       │
    │   GITHUB_COMMITS            │
    │   DEPLOYMENTS               │
    └─────────────────────────────┘
```

### Detailed Relationships

```
users (1) ──owns──> (N) projects
users (1) ──member──> (N) project_members ──belongs──> (1) projects
projects (1) ──has──> (N) prds
projects (1) ──has──> (N) tasks
projects (1) ──has──> (N) documents
projects (1) ──has──> (N) github_integrations
prds (1) ──has──> (N) prd_versions
prds (1) ──links──> (N) tasks
prds (1) ──links──> (N) documents
tasks (1) ──links──> (N) github_commits
users (1) ──receives──> (N) notifications
users (1) ──performs──> (N) audit_logs
```

---

## 🎨 Enum Types

PostgreSQL custom types for consistent data validation.

### 1. `user_role`
Defines user roles in the system.

```sql
CREATE TYPE user_role AS ENUM (
  'admin',           -- Full system access
  'product_manager', -- Can create/approve PRDs
  'developer',       -- Can work on tasks
  'qa',             -- Can test and report bugs
  'devops',         -- Can manage deployments
  'designer'        -- Can contribute designs
);
```

**Usage:** Assigned to users for authorization

---

### 2. `task_status`
Task lifecycle stages.

```sql
CREATE TYPE task_status AS ENUM (
  'todo',         -- Not started
  'in_progress',  -- Currently working
  'in_review',    -- Ready for review
  'completed',    -- Finished
  'blocked'       -- Cannot proceed
);
```

**Usage:** Kanban board states

---

### 3. `task_priority`
Task urgency levels.

```sql
CREATE TYPE task_priority AS ENUM (
  'low',     -- Can wait
  'medium',  -- Normal priority
  'high',    -- Important
  'urgent'   -- Drop everything
);
```

**Usage:** Task prioritization

---

### 4. `prd_status`
PRD approval workflow states.

```sql
CREATE TYPE prd_status AS ENUM (
  'draft',      -- Being written
  'in_review',  -- Awaiting approval
  'approved',   -- Ready for development
  'rejected'    -- Needs revision
);
```

**Usage:** PRD lifecycle management

---

### 5. `notification_type`
Types of system notifications.

```sql
CREATE TYPE notification_type AS ENUM (
  'task_assigned',      -- New task assigned
  'task_completed',     -- Task finished
  'prd_approved',       -- PRD approved
  'prd_rejected',       -- PRD rejected
  'comment_added',      -- New comment
  'mention',            -- User mentioned
  'deployment_status'   -- Deployment update
);
```

**Usage:** Notification categorization

---

## 📚 Core Tables

### Table Summary

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **users** | User profiles | Links to Supabase Auth |
| **projects** | Project info | Owned by users |
| **project_members** | Team members | Many-to-many user-project |
| **prds** | Requirements docs | Versioned, approval workflow |
| **prd_versions** | PRD history | Immutable history |
| **tasks** | Work items | Kanban, assignments |
| **comments** | Discussions | Polymorphic (PRDs/tasks) |
| **documents** | File storage | Links to PRDs/projects |
| **notifications** | User alerts | Read/unread status |
| **audit_logs** | Action tracking | Complete audit trail |
| **github_integrations** | Repo connections | Webhook config |
| **github_commits** | Code tracking | Links to tasks |
| **deployments** | Deploy history | Status tracking |

---

## 🔍 Table Details

### 1. 👤 `users` Table

**Purpose:** User profiles extending Supabase Authentication

**Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'developer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

**Fields Explained:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key, links to auth.users | FK to Supabase Auth |
| `email` | TEXT | User email address | Unique, Not Null |
| `full_name` | TEXT | Display name | Not Null |
| `role` | user_role | User's system role | Default: developer |
| `avatar_url` | TEXT | Profile picture URL | Nullable |
| `created_at` | TIMESTAMPTZ | Account creation | Auto-set |
| `updated_at` | TIMESTAMPTZ | Last profile update | Auto-updated |
| `last_login` | TIMESTAMPTZ | Last login time | Nullable |
| `is_active` | BOOLEAN | Account status | Default: true |

**Relationships:**
- Links to Supabase `auth.users` (1:1)
- Owns many `projects`
- Member of many `project_members`
- Creates many `prds`, `tasks`, `comments`

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Security:**
- RLS enabled
- Users can view/update own profile
- Admins can view all users

---

### 2. 📁 `projects` Table

**Purpose:** Project containers for organizing work

**Schema:**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `name` | TEXT | Project name (e.g., "E-Commerce App") |
| `description` | TEXT | Project description/goals |
| `owner_id` | UUID | User who owns the project |
| `status` | TEXT | Project status (active, completed, archived) |
| `start_date` | DATE | Project start date |
| `end_date` | DATE | Expected completion date |

**Relationships:**
- Owned by one `user` (owner_id)
- Has many `project_members`
- Has many `prds`
- Has many `tasks`
- Has many `documents`

**Business Rules:**
- Owner can manage all project settings
- Members can view based on permissions
- Cascade delete removes all related data

**Indexes:**
```sql
CREATE INDEX idx_projects_owner ON projects(owner_id);
```

---

### 3. 👥 `project_members` Table

**Purpose:** Many-to-many relationship between users and projects

**Schema:**
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | Which project |
| `user_id` | UUID | Which user |
| `role` | user_role | User's role in THIS project |
| `joined_at` | TIMESTAMPTZ | When added to project |

**Relationships:**
- Links `users` to `projects` (many-to-many)
- Unique constraint prevents duplicate memberships

**Business Rules:**
- One user per project (enforced by UNIQUE)
- User can have different roles per project
- Cascade delete when user or project removed

**Indexes:**
```sql
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

---

### 4. 📋 `prds` Table

**Purpose:** Product Requirements Documents

**Schema:**
```sql
CREATE TABLE prds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status prd_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | Which project this PRD belongs to |
| `title` | TEXT | PRD title (e.g., "Shopping Cart Feature") |
| `content` | JSONB | PRD content (structured JSON) |
| `version` | INTEGER | Version number (auto-incremented) |
| `status` | prd_status | Approval status |
| `created_by` | UUID | Author (Product Manager) |
| `approved_by` | UUID | Who approved (nullable) |
| `approved_at` | TIMESTAMPTZ | When approved (nullable) |

**JSONB Content Structure:**
```json
{
  "overview": "Feature description",
  "objectives": ["Goal 1", "Goal 2"],
  "features": [
    {
      "id": "f1",
      "title": "Feature name",
      "description": "Details",
      "priority": "high",
      "acceptanceCriteria": ["Criteria 1", "Criteria 2"]
    }
  ],
  "technicalRequirements": "Tech stack details",
  "userStories": [...],
  "timeline": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-01",
    "milestones": [...]
  }
}
```

**Relationships:**
- Belongs to one `project`
- Created by one `user`
- Approved by one `user` (optional)
- Has many `prd_versions`
- Links to many `tasks`
- Links to many `documents`

**Business Rules:**
- Version increments on each update
- Only draft/rejected PRDs can be edited
- Approval requires PM or admin role

**Indexes:**
```sql
CREATE INDEX idx_prds_project ON prds(project_id);
CREATE INDEX idx_prds_status ON prds(status);
```

---

### 5. 📜 `prd_versions` Table

**Purpose:** Immutable history of PRD changes

**Schema:**
```sql
CREATE TABLE prd_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prd_id UUID NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes_summary TEXT
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `prd_id` | UUID | Which PRD this version belongs to |
| `version` | INTEGER | Version number snapshot |
| `title` | TEXT | PRD title at this version |
| `content` | JSONB | Full content snapshot |
| `created_by` | UUID | Who made this version |
| `changes_summary` | TEXT | What changed (optional) |

**Purpose:**
- Complete audit trail of PRD changes
- Ability to view/restore previous versions
- Track who made what changes

**Business Rules:**
- Immutable (never updated, only created)
- Created automatically when PRD is updated

---

### 6. ✅ `tasks` Table

**Purpose:** Work items for team members

**Schema:**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prd_id UUID REFERENCES prds(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | Which project |
| `prd_id` | UUID | Linked PRD (optional) |
| `title` | TEXT | Task name |
| `description` | TEXT | Task details |
| `status` | task_status | Current status |
| `priority` | task_priority | Urgency level |
| `assigned_to` | UUID | Assigned user (nullable) |
| `created_by` | UUID | Task creator |
| `due_date` | TIMESTAMPTZ | Deadline (nullable) |
| `completed_at` | TIMESTAMPTZ | Completion time (nullable) |
| `order_index` | INTEGER | For Kanban ordering |

**Relationships:**
- Belongs to one `project`
- Optionally links to one `prd`
- Assigned to one `user` (or unassigned)
- Created by one `user`
- Has many `comments`
- Has many `github_commits`

**Business Rules:**
- Can exist without PRD link
- Auto-sets `completed_at` when status = 'completed'
- `order_index` for drag-and-drop ordering

**Indexes:**
```sql
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
```

---

### 7. 💬 `comments` Table

**Purpose:** Discussions on PRDs and tasks

**Schema:**
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,  -- 'prd' or 'task'
  resource_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `resource_type` | TEXT | What type of resource ('prd' or 'task') |
| `resource_id` | UUID | ID of the PRD or task |
| `content` | TEXT | Comment text |
| `parent_id` | UUID | For threaded comments (nullable) |

**Polymorphic Design:**
- `resource_type` + `resource_id` point to PRD or task
- Allows comments on multiple entity types

**Business Rules:**
- Threaded comments via `parent_id`
- Auto-deleted when resource is deleted

**Indexes:**
```sql
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id);
```

---

### 8. 📄 `documents` Table

**Purpose:** File storage and management

**Schema:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prd_id UUID REFERENCES prds(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `file_url` | TEXT | Supabase Storage URL |
| `file_type` | TEXT | MIME type (e.g., 'application/pdf') |
| `file_size` | BIGINT | Size in bytes |
| `tags` | TEXT[] | Array of tags for filtering |

**Storage:**
- Files stored in Supabase Storage buckets
- `file_url` points to stored file
- Tags for organization (e.g., ["design", "wireframe"])

**Business Rules:**
- Can link to PRD (optional)
- Always belongs to a project

**Indexes:**
```sql
CREATE INDEX idx_documents_project ON documents(project_id);
```

---

### 9. 🔔 `notifications` Table

**Purpose:** User notifications

**Schema:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | notification_type | Notification category |
| `title` | TEXT | Notification headline |
| `message` | TEXT | Detailed message |
| `link` | TEXT | Deep link to resource (nullable) |
| `is_read` | BOOLEAN | Read status |

**Business Rules:**
- Created when events occur (task assigned, etc.)
- User can mark as read
- Auto-deleted with user

**Indexes:**
```sql
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

---

### 10. 📝 `audit_logs` Table

**Purpose:** Complete audit trail

**Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `action` | TEXT | What happened (e.g., 'create', 'update', 'delete') |
| `resource_type` | TEXT | What was changed (e.g., 'task', 'prd') |
| `resource_id` | TEXT | ID of resource |
| `metadata` | JSONB | Additional context |
| `ip_address` | TEXT | User's IP |
| `user_agent` | TEXT | Browser/client info |

**Purpose:**
- Compliance and security
- Troubleshooting
- User activity tracking

**Indexes:**
```sql
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

---

### 11. 🔗 `github_integrations` Table

**Purpose:** GitHub repository connections

**Schema:**
```sql
CREATE TABLE github_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL,
  access_token TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `repository_url` | TEXT | GitHub repo URL |
| `access_token` | TEXT | GitHub access token (encrypted) |
| `webhook_secret` | TEXT | Webhook signature verification |
| `is_active` | BOOLEAN | Integration enabled/disabled |

**Security:**
- `access_token` should be encrypted
- `webhook_secret` verifies GitHub requests

---

### 12. 🔗 `github_commits` Table

**Purpose:** Track code commits

**Schema:**
```sql
CREATE TABLE github_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES github_integrations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  commit_sha TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `commit_sha` | TEXT | Git commit hash (unique) |
| `message` | TEXT | Commit message |
| `author` | TEXT | Git author name |
| `committed_at` | TIMESTAMPTZ | When committed |

**Linking to Tasks:**
- Commit messages can include task IDs
- Format: `#<task-uuid>` in commit message

**Indexes:**
```sql
CREATE INDEX idx_github_commits_task ON github_commits(task_id);
```

---

### 13. 🚀 `deployments` Table

**Purpose:** Deployment tracking

**Schema:**
```sql
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,  -- 'staging', 'production'
  version TEXT NOT NULL,
  status TEXT NOT NULL,       -- 'pending', 'success', 'failed'
  deployed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  logs TEXT
);
```

**Purpose:**
- Track deployment history
- Monitor success/failure rates
- Store deployment logs

---

## 🔗 Relationships Summary

### One-to-Many Relationships

| Parent | Child | Relationship |
|--------|-------|--------------|
| users | projects | One user owns many projects |
| users | tasks (assigned) | One user has many assigned tasks |
| users | tasks (created) | One user creates many tasks |
| users | notifications | One user receives many notifications |
| projects | prds | One project has many PRDs |
| projects | tasks | One project has many tasks |
| projects | documents | One project has many documents |
| prds | prd_versions | One PRD has many versions |
| prds | tasks | One PRD links to many tasks |
| tasks | comments | One task has many comments |

### Many-to-Many Relationships

| Table 1 | Junction Table | Table 2 |
|---------|---------------|---------|
| users | project_members | projects |

### Polymorphic Relationships

| Parent | Child | Type Field | ID Field |
|--------|-------|-----------|----------|
| Multiple | comments | resource_type | resource_id |

---

## 📊 Indexes Strategy

### Primary Indexes (Automatic)
- All primary keys automatically indexed
- Unique constraints automatically indexed

### Foreign Key Indexes
```sql
-- User relationships
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- Project relationships
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_prds_project ON prds(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_documents_project ON documents(project_id);

-- Status/filtering indexes
CREATE INDEX idx_prds_status ON prds(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Polymorphic indexes
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id);

-- Audit indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### Why These Indexes?
- **Foreign keys** - Fast joins
- **Status fields** - Filtering (WHERE status = 'active')
- **Composite** - Multiple column queries
- **Polymorphic** - Fast lookups for comments

---

## 🔐 Security: Row Level Security (RLS)

### RLS Overview

Row Level Security ensures users can only access data they're authorized to see, enforced at the database level.

### Policies Implemented

#### 1. Users Table
```sql
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);
```

#### 2. Projects Table
```sql
-- Members can view projects they belong to
CREATE POLICY "Project members can view projects" 
  ON projects FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = projects.id 
      AND user_id = auth.uid()
    )
  );

-- Owners can update their projects
CREATE POLICY "Project owners can update projects" 
  ON projects FOR UPDATE 
  USING (owner_id = auth.uid());

-- Owners can delete their projects
CREATE POLICY "Project owners can delete projects" 
  ON projects FOR DELETE 
  USING (owner_id = auth.uid());

-- Authenticated users can create projects
CREATE POLICY "Authenticated users can create projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);
```

#### 3. Tasks Table
```sql
-- Project members can view tasks
CREATE POLICY "Project members can view tasks" 
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = tasks.project_id 
      AND user_id = auth.uid()
    )
  );

-- Project members can create tasks
CREATE POLICY "Project members can create tasks" 
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = tasks.project_id 
      AND user_id = auth.uid()
    )
  );
```

#### 4. Notifications Table
```sql
-- Users can only view their own notifications
CREATE POLICY "Users can view their notifications" 
  ON notifications FOR SELECT 
  USING (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update their notifications" 
  ON notifications FOR UPDATE 
  USING (user_id = auth.uid());
```

### Security Benefits
- ✅ Database-level enforcement
- ✅ Works even if API is bypassed
- ✅ Prevents unauthorized data access
- ✅ Automatic with Supabase Auth

---

## ⚙️ Triggers & Functions

### 1. Auto-Update Timestamps

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied to:**
- users
- projects
- prds
- tasks
- comments
- documents
- github_integrations

**Purpose:** Automatically update `updated_at` on row changes

---

### 2. Auto-Create User Profile

**Function:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'developer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Purpose:** Automatically create user profile when account is created

---

## 📈 Data Flow Examples

### Example 1: Creating a Task

```
1. User creates task via API
   ↓
2. API validates input (Zod)
   ↓
3. Check project membership (RLS)
   ↓
4. INSERT into tasks table
   ↓
5. Trigger: update_updated_at_column fires
   ↓
6. If assigned_to set:
   INSERT into notifications
   ↓
7. INSERT into audit_logs
   ↓
8. Return task to user
```

### Example 2: Approving a PRD

```
1. PM approves PRD via API
   ↓
2. Check PM has permission
   ↓
3. UPDATE prds SET:
   - status = 'approved'
   - approved_by = current_user
   - approved_at = NOW()
   ↓
4. INSERT into prd_versions (new version)
   ↓
5. INSERT notification for PRD author
   ↓
6. INSERT audit_log
   ↓
7. Return updated PRD
```

---

## 🎯 Design Decisions

### Why UUID over BIGINT?
- **Global uniqueness** - No collisions across distributed systems
- **Security** - Harder to guess than sequential IDs
- **Merging** - Easy to merge data from multiple sources

### Why JSONB for PRD content?
- **Flexibility** - Schema can evolve without migrations
- **Queryable** - Can query inside JSON with PostgreSQL
- **Validation** - Handled at application layer with Zod

### Why TEXT[] for tags?
- **Simple** - No need for separate tags table for MVP
- **Indexed** - PostgreSQL can index arrays
- **Queryable** - Can search with `@>` operator

### Why TIMESTAMPTZ?
- **Timezone aware** - Handles global users correctly
- **Standard** - PostgreSQL best practice
- **Sortable** - Easy to order by time

---

## 🚀 Performance Considerations

### Query Optimization
- All foreign keys indexed
- Composite indexes for common queries
- Partial indexes for status fields

### Storage Optimization
- JSONB for flexible content
- Array for simple lists (tags)
- Cascade deletes to maintain integrity

### Scalability
- Normalized structure (3NF)
- Efficient joins via indexes
- Supabase handles connection pooling

---

## 📋 Migration Checklist

When running the schema:

- [ ] Backup existing database (if any)
- [ ] Enable UUID extension
- [ ] Create ENUM types first
- [ ] Create tables in dependency order
- [ ] Create indexes
- [ ] Create triggers
- [ ] Enable RLS on tables
- [ ] Create RLS policies
- [ ] Test with sample data

---

## 🔮 Future Enhancements

Potential schema additions (not in MVP):

- **tags** table - Separate table for tag management
- **sprints** table - Sprint planning support
- **time_tracking** table - Time logging
- **attachments** table - Additional file types
- **webhooks** table - Custom webhook support
- **api_keys** table - API key management

---

## 📊 Quick Reference

### Table Sizes (Estimated)

| Table | Expected Growth | Index Impact |
|-------|----------------|--------------|
| users | Slow | Low |
| projects | Medium | Low |
| tasks | Fast | Medium |
| comments | Fast | Medium |
| notifications | Very Fast | High |
| audit_logs | Very Fast | High |

### Critical Relationships

```
User → Project (owner) ⚡ Most important
Project → Tasks (contains) ⚡ Most queries
Task → User (assigned) ⚡ Dashboard queries
PRD → Tasks (links) ⚡ Feature tracking
```

---

## ✅ Summary

**The Zyndrx database is:**
- ✅ Normalized (3NF)
- ✅ Secure (RLS enabled)
- ✅ Indexed (20+ indexes)
- ✅ Auditable (complete logs)
- ✅ Scalable (efficient design)
- ✅ Flexible (JSONB where needed)

**Ready to implement!**

Next step: Run `src/database/schema.sql` in Supabase SQL Editor.

---

*This schema supports all Zyndrx features while maintaining performance, security, and data integrity.* 🎯
