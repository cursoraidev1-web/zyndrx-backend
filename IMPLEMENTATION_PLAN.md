# Backend Implementation Plan
## Based on API Requirements Documentation

## 🔴 Phase 1: Critical Missing APIs (Week 1)

### 1.1 Multi-Tenancy Foundation (MUST DO FIRST)
**Priority: CRITICAL**

#### Database Changes
- [ ] Create `companies` table
- [ ] Create `user_companies` junction table
- [ ] Add `company_id` to: projects, tasks, documents, notifications, prds
- [ ] Create indexes for company_id columns

#### Code Changes
- [ ] Update JWT to include `companyId`
- [ ] Update `auth.middleware.ts` to extract `companyId`
- [ ] Update `express.d.ts` to include `companyId` in req.user
- [ ] Add company filtering middleware
- [ ] Update registration to accept `companyName` and create company
- [ ] Update all service queries to filter by `company_id`

#### New Endpoints
- [ ] `GET /api/v1/auth/companies` - Get user's companies
- [ ] `POST /api/v1/auth/switch-company` - Switch active company
- [ ] `POST /api/v1/companies` - Create company
- [ ] `GET /api/v1/companies/:id` - Get company details
- [ ] `POST /api/v1/companies/:id/invite` - Invite user to company
- [ ] `POST /api/v1/companies/accept-invite` - Accept company invitation
- [ ] `GET /api/v1/companies/:id/members` - Get company members
- [ ] `PATCH /api/v1/companies/:id/members/:userId` - Update user role
- [ ] `DELETE /api/v1/companies/:id/members/:userId` - Remove user

---

### 1.2 Complete CRUD Operations

#### Projects
- [ ] `PUT /api/v1/projects/:id` - Update project
- [ ] `DELETE /api/v1/projects/:id` - Delete project

#### PRDs
- [ ] `GET /api/v1/prds?project_id=:id` - List PRDs by project
- [ ] `PUT /api/v1/prds/:id` - Update PRD content
- [ ] `DELETE /api/v1/prds/:id` - Delete PRD

#### Tasks
- [ ] `GET /api/v1/tasks/:id` - Get single task
- [ ] `DELETE /api/v1/tasks/:id` - Delete task
- [ ] Enhanced filtering: `GET /api/v1/tasks?project_id=...&status=...&assigned_to=...&priority=...`

#### Documents
- [ ] `GET /api/v1/documents/:id` - Get single document
- [ ] `PUT /api/v1/documents/:id` - Update document metadata
- [ ] `DELETE /api/v1/documents/:id` - Delete document

#### Teams
- [ ] `DELETE /api/v1/teams/:projectId/members/:userId` - Remove member
- [ ] `PATCH /api/v1/teams/:projectId/members/:userId/role` - Update member role

#### Users
- [ ] `GET /api/v1/users` - List users (for dropdowns)
- [ ] `GET /api/v1/users/:id` - Get user details

---

### 1.3 OAuth Enhancements
- [ ] Google OAuth: Support code exchange (`{ code, redirect_uri }`)
- [ ] Keep existing accessToken support for backward compatibility

---

## 🟠 Phase 2: Important Features (Week 2)

### 2.1 Enhanced Analytics
- [ ] Update analytics response to match requirements (kpi, projectProgress, teamPerformance)

### 2.2 Activity Feed
- [ ] `GET /api/v1/activity` - Get activity feed
- [ ] `GET /api/v1/activity?project_id=:id` - Project-specific activity

---

## 🟡 Phase 3: Nice-to-Have Features (Week 3+)

### 3.1 Handoffs
- [ ] `GET /api/v1/handoffs` - Get all handoffs
- [ ] `GET /api/v1/handoffs/:id` - Get single handoff
- [ ] `POST /api/v1/handoffs` - Create handoff
- [ ] `PATCH /api/v1/handoffs/:id` - Update handoff status
- [ ] `POST /api/v1/handoffs/:id/review` - Submit handoff review

### 3.2 CI/CD Integration
- [ ] `GET /api/v1/ci-cd/pipelines` - Get pipelines
- [ ] `GET /api/v1/ci-cd/deployments` - Get deployments
- [ ] `GET /api/v1/ci-cd/commits` - Get commits

### 3.3 Integrations
- [ ] `GET /api/v1/integrations` - Get available integrations
- [ ] `POST /api/v1/integrations/:type/connect` - Connect integration
- [ ] `DELETE /api/v1/integrations/:id` - Disconnect integration

### 3.4 Feedback
- [ ] `GET /api/v1/feedback` - Get feedback
- [ ] `POST /api/v1/feedback` - Submit feedback

---

## 📋 Implementation Checklist

### Database Schema
- [ ] Companies table
- [ ] User_companies table
- [ ] Add company_id columns
- [ ] Create indexes
- [ ] Migration script

### Authentication Module
- [ ] Update registration (companyName, create company)
- [ ] Update JWT generation (include companyId)
- [ ] Update auth middleware (extract companyId)
- [ ] Company management endpoints

### Projects Module
- [ ] Add UPDATE endpoint
- [ ] Add DELETE endpoint
- [ ] Add company filtering

### PRDs Module
- [ ] Add LIST by project endpoint
- [ ] Add UPDATE content endpoint
- [ ] Add DELETE endpoint
- [ ] Add company filtering

### Tasks Module
- [ ] Add GET single endpoint
- [ ] Add DELETE endpoint
- [ ] Enhanced filtering
- [ ] Add company filtering

### Documents Module
- [ ] Add GET single endpoint
- [ ] Add UPDATE endpoint
- [ ] Add DELETE endpoint
- [ ] Add company filtering

### Teams Module
- [ ] Add REMOVE member endpoint
- [ ] Add UPDATE role endpoint
- [ ] Add company filtering

### Users Module (NEW)
- [ ] Create module
- [ ] Add LIST endpoint
- [ ] Add GET single endpoint
- [ ] Add company filtering

### Analytics Module
- [ ] Update response format to match requirements

---

## 🚀 Starting Implementation

Let's begin with Phase 1.1 (Multi-Tenancy Foundation) as it's the most critical.



