# Backend Gap Analysis & Implementation Plan

## Current State vs. Roadmap Requirements

### ✅ What's Already Implemented

#### Authentication (Mostly Complete)
- ✅ `POST /api/v1/auth/register` - User registration
- ✅ `POST /api/v1/auth/login` - User login
- ✅ `POST /api/v1/auth/google` - Google OAuth
- ✅ `POST /api/v1/auth/github` - GitHub OAuth
- ✅ `GET /api/v1/auth/me` - Get current user
- ✅ `PUT /api/v1/auth/profile` - Update profile
- ✅ `POST /api/v1/auth/logout` - Logout
- ✅ `POST /api/v1/auth/forgot-password` - Request password reset
- ✅ `POST /api/v1/auth/reset-password` - Reset password
- ✅ `POST /api/v1/auth/2fa/setup` - Setup 2FA
- ✅ `POST /api/v1/auth/2fa/enable` - Enable 2FA
- ✅ `POST /api/v1/auth/2fa/verify` - Verify 2FA code

#### Projects
- ✅ `POST /api/v1/projects` - Create project
- ✅ `GET /api/v1/projects` - List projects (with filters)
- ✅ `GET /api/v1/projects/:id` - Get project details

#### PRDs
- ✅ `POST /api/v1/prds` - Create PRD
- ✅ `GET /api/v1/prds/:id` - Get single PRD
- ✅ `PATCH /api/v1/prds/:id/status` - Update PRD status

#### Tasks
- ✅ `GET /api/v1/tasks?project_id=...` - Get tasks
- ✅ `POST /api/v1/tasks` - Create task
- ✅ `PATCH /api/v1/tasks/:id` - Update task

#### Teams
- ✅ `POST /api/v1/teams/invite` - Invite member
- ✅ `POST /api/v1/teams/accept-invite` - Accept invite
- ✅ `GET /api/v1/teams/:projectId/members` - Get members

#### Documents
- ✅ `POST /api/v1/documents` - Create document
- ✅ `GET /api/v1/documents?project_id=...` - Get documents

#### Notifications
- ✅ `GET /api/v1/notifications` - Get notifications
- ✅ `PATCH /api/v1/notifications/:id/read` - Mark as read
- ✅ `PATCH /api/v1/notifications/mark-all-read` - Mark all read

#### Analytics
- ✅ `GET /api/v1/analytics?project_id=...` - Get project stats

---

## 🔴 Critical Missing Features (Phase 4 - Highest Priority)

### 1. Company/Workspace Multi-Tenancy Support

**Database Changes Required:**
```sql
-- NEW TABLE: companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NEW TABLE: user_companies (junction table)
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin', -- admin, member, viewer
  status TEXT NOT NULL DEFAULT 'active', -- active, pending, inactive
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- ADD company_id to existing tables
ALTER TABLE projects ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE prds ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_tasks_company_id ON tasks(company_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_prds_company_id ON prds(company_id);
```

**Code Changes Required:**

1. **Update JWT Token Structure:**
   - Add `companyId` to JWT payload
   - Update `auth.middleware.ts` to extract `companyId`
   - Update `express.d.ts` to include `companyId` in `req.user`

2. **Update Registration Endpoint:**
   - Accept `companyName` in request body (required)
   - Create company automatically
   - Add user to company as "admin"
   - Return company info in response

3. **Add Company Filtering:**
   - All queries must filter by `company_id` from JWT
   - Verify user is member of company before operations
   - Add company verification middleware

4. **New Endpoints Needed:**
   - `GET /api/v1/auth/companies` - Get user's companies
   - `POST /api/v1/auth/switch-company` - Switch active company
   - `POST /api/v1/companies` - Create company
   - `GET /api/v1/companies/:id` - Get company details
   - `POST /api/v1/companies/:id/invite` - Invite user to company
   - `POST /api/v1/companies/accept-invite` - Accept company invitation
   - `GET /api/v1/companies/:id/members` - Get company members
   - `PATCH /api/v1/companies/:id/members/:userId` - Update user role
   - `DELETE /api/v1/companies/:id/members/:userId` - Remove user

---

### 2. Missing CRUD Operations

#### Projects
- ❌ `PUT /api/v1/projects/:id` - Update project
- ❌ `DELETE /api/v1/projects/:id` - Delete project

#### PRDs
- ❌ `GET /api/v1/prds?project_id=...` - List PRDs for project
- ❌ `PUT /api/v1/prds/:id` - Update PRD content
- ❌ `DELETE /api/v1/prds/:id` - Delete PRD

#### Tasks
- ❌ `GET /api/v1/tasks/:id` - Get single task details
- ❌ `DELETE /api/v1/tasks/:id` - Delete task
- ❌ Enhanced filtering: `GET /api/v1/tasks?project_id=...&status=...&assigned_to=...&priority=...`

#### Documents
- ❌ `GET /api/v1/documents/:id` - Get single document
- ❌ `PUT /api/v1/documents/:id` - Update document metadata
- ❌ `DELETE /api/v1/documents/:id` - Delete document

#### Teams
- ❌ `DELETE /api/v1/teams/:projectId/members/:userId` - Remove member
- ❌ `PATCH /api/v1/teams/:projectId/members/:userId/role` - Update member role

#### Users
- ❌ `GET /api/v1/users` - List users (for task assignment dropdowns)
- ❌ `GET /api/v1/users/:id` - Get user details

---

### 3. OAuth Improvements

**Google OAuth:**
- ⚠️ Currently only accepts `accessToken`
- ❌ Need to support code exchange: `{ code, redirect_uri }`
- Should handle both formats

---

## 🟠 High Priority Missing Features (Phase 3)

### 1. Enhanced Filtering & Search
- ❌ `GET /api/v1/search?q=...&type=...` - Global search
- ❌ Enhanced task filtering (status, priority, assigned_to, due_date)
- ❌ Project filtering enhancements

### 2. User Management
- ❌ List users endpoint (for dropdowns)
- ❌ User details endpoint
- ❌ User search endpoint

---

## 🟡 Medium Priority Missing Features (Phase 2)

### 1. Analytics Enhancements
- ❌ `GET /api/v1/analytics/user-stats` - Overall user statistics
- ❌ Enhanced project analytics (timeline, velocity, etc.)

### 2. Activity Feed
- ❌ `GET /api/v1/activity` - Get activity feed
- ❌ `GET /api/v1/activity?project_id=:id` - Project-specific activity

---

## 🔵 Low Priority Missing Features (Phase 1)

### 1. Integrations
- ❌ `GET /api/v1/integrations` - Get available integrations
- ❌ `POST /api/v1/integrations/:type/connect` - Connect integration
- ❌ `DELETE /api/v1/integrations/:id` - Disconnect integration

### 2. CI/CD
- ❌ `GET /api/v1/ci-cd/pipelines` - Get pipelines
- ❌ `GET /api/v1/ci-cd/deployments` - Get deployments
- ❌ `GET /api/v1/ci-cd/commits` - Get commits

### 3. Handoffs
- ❌ `GET /api/v1/handoffs` - Get all handoffs
- ❌ `GET /api/v1/handoffs/:id` - Get single handoff
- ❌ `POST /api/v1/handoffs` - Create handoff
- ❌ `PATCH /api/v1/handoffs/:id` - Update handoff
- ❌ `POST /api/v1/handoffs/:id/review` - Submit review

### 4. Feedback
- ❌ `GET /api/v1/feedback` - Get feedback
- ❌ `POST /api/v1/feedback` - Submit feedback

---

## 📋 Implementation Priority Order

### Week 1: Critical Foundation (MUST DO FIRST)
1. **Create companies table and user_companies table**
2. **Add company_id to all existing tables** (projects, tasks, documents, notifications, prds)
3. **Update JWT to include companyId**
4. **Update registration to create company**
5. **Add company filtering to all queries**
6. **Create company management endpoints**

### Week 2: Complete CRUD Operations
1. **Projects:** UPDATE, DELETE
2. **PRDs:** LIST by project, UPDATE content, DELETE
3. **Tasks:** GET single, DELETE, enhanced filtering
4. **Documents:** GET single, UPDATE, DELETE
5. **Teams:** REMOVE member, UPDATE role

### Week 3: User Management & Search
1. **Users:** LIST, GET single
2. **Search:** Global search endpoint
3. **Enhanced filtering:** All endpoints

### Week 4: OAuth & Enhancements
1. **Google OAuth:** Code exchange support
2. **Analytics:** User-level stats
3. **Activity Feed:** Basic implementation

---

## 🔧 Files That Need Changes

### Database
- `src/database/schema.sql` - Add companies tables and company_id columns

### Authentication
- `src/modules/auth/auth.service.ts` - Update registration, add company creation
- `src/modules/auth/auth.controller.ts` - Update registration response
- `src/modules/auth/auth.validation.ts` - Add companyName to register schema
- `src/middleware/auth.middleware.ts` - Extract companyId from JWT
- `src/types/express.d.ts` - Add companyId to req.user

### New Module: Companies
- `src/modules/companies/companies.service.ts` - NEW
- `src/modules/companies/companies.controller.ts` - NEW
- `src/modules/companies/companies.routes.ts` - NEW
- `src/modules/companies/companies.validation.ts` - NEW

### Projects
- `src/modules/projects/projects.service.ts` - Add company filtering, UPDATE, DELETE
- `src/modules/projects/projects.controller.ts` - Add UPDATE, DELETE handlers
- `src/modules/projects/projects.routes.ts` - Add UPDATE, DELETE routes

### PRDs
- `src/modules/prds/prd.service.ts` - Add LIST by project, UPDATE content, DELETE
- `src/modules/prds/prd.controller.ts` - Add new handlers
- `src/modules/prds/prd.routes.ts` - Add new routes

### Tasks
- `src/modules/tasks/tasks.service.ts` - Add GET single, DELETE, enhanced filtering
- `src/modules/tasks/tasks.controller.ts` - Add new handlers
- `src/modules/tasks/tasks.routes.ts` - Add new routes

### Documents
- `src/modules/documents/documents.service.ts` - Add GET single, UPDATE, DELETE
- `src/modules/documents/documents.controller.ts` - Add new handlers
- `src/modules/documents/documents.routes.ts` - Add new routes

### Teams
- `src/modules/teams/teams.service.ts` - Add REMOVE member, UPDATE role
- `src/modules/teams/teams.controller.ts` - Add new handlers
- `src/modules/teams/teams.routes.ts` - Add new routes

### New Module: Users
- `src/modules/users/users.service.ts` - NEW
- `src/modules/users/users.controller.ts` - NEW
- `src/modules/users/users.routes.ts` - NEW

### App Configuration
- `src/app.ts` - Add new route modules

---

## 🚨 Critical Security Considerations

1. **Company Isolation:**
   - ALL queries MUST filter by `company_id` from JWT
   - Verify user is member of company before any operation
   - Never return data from other companies
   - Use parameterized queries

2. **JWT Token:**
   - Must include `companyId` in payload
   - Verify company membership on every request
   - Handle company switching (optional: issue new token)

3. **Authorization:**
   - Check user role within company
   - Verify project belongs to company
   - Verify user has access to resource

---

## ✅ Success Criteria

The backend is ready when:
1. ✅ Users can register with company name
2. ✅ Company is created automatically on registration
3. ✅ JWT includes companyId
4. ✅ All queries filter by company_id
5. ✅ Company switching works
6. ✅ All CRUD operations work
7. ✅ No data leaks between companies
8. ✅ All endpoints verify company membership

---

## 📝 Next Steps

1. **Review this document** with the team
2. **Prioritize implementation** based on frontend needs
3. **Start with Week 1** (Critical Foundation)
4. **Test company isolation** thoroughly
5. **Update API documentation** as you implement

---

**Last Updated:** Based on roadmap requirements analysis
**Status:** Ready for implementation planning



