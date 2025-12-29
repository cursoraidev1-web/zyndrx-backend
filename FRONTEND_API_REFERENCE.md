# Frontend API Reference

**Base URL**: `http://localhost:5000/api/v1` (Development)  
**Production**: Update to your production URL

---

## 🔐 Authentication

All endpoints (except registration, login, and public plans) require a JWT token in the Authorization header:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 📋 Table of Contents

1. [Authentication](#authentication-endpoints)
2. [Companies](#companies-endpoints)
3. [Users](#users-endpoints)
4. [Projects](#projects-endpoints)
5. [PRDs](#prds-endpoints)
6. [Tasks](#tasks-endpoints)
7. [Documents](#documents-endpoints)
8. [Teams](#teams-endpoints)
9. [Comments](#comments-endpoints)
10. [Notifications](#notifications-endpoints)
11. [Analytics](#analytics-endpoints)
12. [Handoffs](#handoffs-endpoints)
13. [Activity](#activity-endpoints)
14. [Subscriptions](#subscriptions-endpoints)
15. [TypeScript Types](#typescript-types)
16. [Error Handling](#error-handling)

---

## Authentication Endpoints

### 1. Register
```typescript
POST /auth/register

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "companyName": "Acme Corp"  // REQUIRED - Creates company automatically
}

Response: 200
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "admin"
    },
    "token": "jwt-token",
    "company": {
      "id": "uuid",
      "name": "Acme Corp"
    }
  }
}
```

### 2. Login
```typescript
POST /auth/login

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "token": "jwt-token",
    "company": {
      "id": "uuid",
      "name": "Acme Corp"
    }
  }
}
```

### 3. Get Current User
```typescript
GET /auth/me
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "url",
    "role": "admin",
    "two_factor_enabled": false
  }
}
```

### 4. Update Profile
```typescript
PUT /auth/profile
Headers: Authorization: Bearer {token}

Request:
{
  "full_name": "John Updated",
  "avatar_url": "new-url"
}

Response: 200
{
  "success": true,
  "message": "Profile updated",
  "data": { /* updated user */ }
}
```

### 5. Logout
```typescript
POST /auth/logout
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 6. Forgot Password
```typescript
POST /auth/forgot-password

Request:
{
  "email": "user@example.com"
}

Response: 200
{
  "success": true,
  "message": "Password reset email sent"
}
```

### 7. Reset Password
```typescript
POST /auth/reset-password

Request:
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}

Response: 200
{
  "success": true,
  "message": "Password reset successful"
}
```

### 8. Setup 2FA
```typescript
POST /auth/2fa/setup
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "secret": "base32-secret",
    "qrCode": "data:image/png;base64,..."
  }
}
```

### 9. Enable 2FA
```typescript
POST /auth/2fa/enable
Headers: Authorization: Bearer {token}

Request:
{
  "token": "123456"  // 6-digit code from authenticator
}

Response: 200
{
  "success": true,
  "message": "2FA enabled"
}
```

### 10. Verify 2FA
```typescript
POST /auth/2fa/verify
Headers: Authorization: Bearer {token}

Request:
{
  "token": "123456"
}

Response: 200
{
  "success": true,
  "message": "2FA verified"
}
```

---

## Companies Endpoints

### 1. Get My Companies
```typescript
GET /auth/companies
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "role": "admin",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Get Company Details
```typescript
GET /companies/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Create Company
```typescript
POST /companies
Headers: Authorization: Bearer {token}

Request:
{
  "name": "New Company"
}

Response: 201
{
  "success": true,
  "message": "Company created",
  "data": { /* company */ }
}
```

### 4. Get Company Members
```typescript
GET /companies/:id/members
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 5. Invite User to Company
```typescript
POST /companies/:id/invite
Headers: Authorization: Bearer {token}

Request:
{
  "email": "newuser@example.com",
  "role": "member"  // admin, member, viewer
}

Response: 201
{
  "success": true,
  "message": "Invitation sent"
}
```

### 6. Update Member Role
```typescript
PATCH /companies/:id/members/:userId
Headers: Authorization: Bearer {token}

Request:
{
  "role": "admin"
}

Response: 200
{
  "success": true,
  "message": "Member role updated"
}
```

### 7. Remove Member
```typescript
DELETE /companies/:id/members/:userId
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Member removed"
}
```

---

## Users Endpoints

### 1. List Company Users
```typescript
GET /users
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "avatar_url": "url",
      "role": "admin",
      "company_role": "admin",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Get User
```typescript
GET /users/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "url",
    "role": "admin",
    "company_role": "admin",
    "two_factor_enabled": false
  }
}
```

### 3. Search Users
```typescript
GET /users/search?q=john
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    { /* matching users */ }
  ]
}
```

### 4. Get User Stats
```typescript
GET /users/stats
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "total": 25,
    "roleDistribution": {
      "admin": 2,
      "member": 20,
      "viewer": 3
    }
  }
}
```

---

## Projects Endpoints

### 1. List Projects
```typescript
GET /projects?team_name=frontend&status=active
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Project Alpha",
      "description": "Description",
      "team_name": "frontend",
      "status": "active",
      "owner_id": "uuid",
      "company_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Get Project
```typescript
GET /projects/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Project Alpha",
    "description": "Description",
    "team_name": "frontend",
    "status": "active"
  }
}
```

### 3. Create Project
```typescript
POST /projects
Headers: Authorization: Bearer {token}

Request:
{
  "name": "New Project",
  "description": "Project description",
  "team_name": "backend",
  "status": "active"
}

Response: 201
{
  "success": true,
  "message": "Project created",
  "data": { /* project */ }
}
```

### 4. Update Project
```typescript
PATCH /projects/:id
Headers: Authorization: Bearer {token}

Request:
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "completed"
}

Response: 200
{
  "success": true,
  "data": { /* updated project */ }
}
```

### 5. Delete Project
```typescript
DELETE /projects/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Project deleted"
}
```

### 6. Get Project Members
```typescript
GET /projects/:id/members
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "role": "developer",
      "users": {
        "full_name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### 7. Add Project Member
```typescript
POST /projects/:id/members
Headers: Authorization: Bearer {token}

Request:
{
  "user_id": "uuid",
  "role": "developer"  // developer, manager, viewer
}

Response: 201
{
  "success": true,
  "message": "Member added"
}
```

### 8. Remove Project Member
```typescript
DELETE /projects/:id/members/:userId
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Member removed"
}
```

---

## PRDs Endpoints

### 1. List PRDs
```typescript
GET /prds?project_id=uuid
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Feature X",
      "content": { /* JSON content */ },
      "status": "draft",
      "version": 1,
      "project_id": "uuid",
      "created_by": "uuid"
    }
  ]
}
```

### 2. Get PRD
```typescript
GET /prds/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Feature X",
    "content": { /* JSON */ },
    "status": "draft",
    "projects": { "name": "Project Alpha" },
    "users": { "full_name": "John Doe" }
  }
}
```

### 3. Create PRD
```typescript
POST /prds
Headers: Authorization: Bearer {token}

Request:
{
  "project_id": "uuid",
  "title": "New Feature",
  "content": {
    "sections": [
      {
        "title": "Overview",
        "content": "Feature description"
      }
    ]
  }
}

Response: 201
{
  "success": true,
  "message": "PRD created",
  "data": { /* prd */ }
}
```

### 4. Update PRD
```typescript
PATCH /prds/:id
Headers: Authorization: Bearer {token}

Request:
{
  "title": "Updated Title",
  "content": { /* updated JSON */ }
}

Response: 200
{
  "success": true,
  "data": { /* updated prd */ }
}
```

### 5. Delete PRD
```typescript
DELETE /prds/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "PRD deleted"
}
```

### 6. Update PRD Status (Admin only)
```typescript
PATCH /prds/:id/status
Headers: Authorization: Bearer {token}

Request:
{
  "status": "approved"  // draft, under_review, approved, rejected
}

Response: 200
{
  "success": true,
  "message": "PRD marked as approved"
}
```

### 7. Create PRD Version
```typescript
POST /prds/:id/versions
Headers: Authorization: Bearer {token}

Request:
{
  "title": "Version 2",
  "content": { /* updated content */ },
  "changes_summary": "Added new requirements"
}

Response: 201
{
  "success": true,
  "data": { /* version */ }
}
```

### 8. Get PRD Versions
```typescript
GET /prds/:id/versions
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "version": 1,
      "title": "Initial",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Tasks Endpoints

### 1. List Tasks
```typescript
GET /tasks?project_id=uuid
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Task 1",
      "description": "Description",
      "status": "todo",
      "priority": "high",
      "assigned_to": "uuid",
      "project_id": "uuid",
      "assignee": {
        "full_name": "John Doe"
      }
    }
  ]
}
```

### 2. Get All Tasks (Company-wide)
```typescript
GET /tasks
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [ /* all company tasks */ ]
}
```

### 3. Get Task
```typescript
GET /tasks/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Task 1",
    "status": "in_progress",
    "assignee": { /* user */ },
    "reporter": { /* user */ }
  }
}
```

### 4. Create Task
```typescript
POST /tasks
Headers: Authorization: Bearer {token}

Request:
{
  "project_id": "uuid",
  "title": "New Task",
  "description": "Task description",
  "priority": "medium",
  "assigned_to": "uuid",
  "due_date": "2024-12-31"
}

Response: 201
{
  "success": true,
  "data": { /* task */ }
}
```

### 5. Update Task
```typescript
PATCH /tasks/:id
Headers: Authorization: Bearer {token}

Request:
{
  "status": "completed",
  "assigned_to": "uuid",
  "priority": "urgent"
}

Response: 200
{
  "success": true,
  "message": "Task updated",
  "data": { /* updated task */ }
}
```

### 6. Delete Task
```typescript
DELETE /tasks/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Task deleted"
}
```

### 7. Request Upload Token (for attachments)
```typescript
POST /tasks/:taskId/attachments/upload-token
Headers: Authorization: Bearer {token}

Request:
{
  "file_name": "screenshot.png",
  "file_type": "image/png",
  "file_size": 1024000
}

Response: 200
{
  "success": true,
  "data": {
    "upload_url": "signed-url",
    "file_path": "path/to/file"
  }
}
```

### 8. Save Attachment
```typescript
POST /tasks/:taskId/attachments
Headers: Authorization: Bearer {token}

Request:
{
  "file_path": "path/to/file",
  "file_name": "screenshot.png",
  "file_size": 1024000,
  "file_type": "image/png"
}

Response: 201
{
  "success": true,
  "data": { /* attachment */ }
}
```

### 9. Get Task Attachments
```typescript
GET /tasks/:taskId/attachments
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [ /* attachments */ ]
}
```

### 10. Get Attachment Download URL
```typescript
GET /tasks/attachments/:id/download
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "download_url": "signed-url"
  }
}
```

### 11. Delete Attachment
```typescript
DELETE /tasks/attachments/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Attachment deleted"
}
```

---

## Documents Endpoints

### 1. Request Upload Token
```typescript
POST /documents/upload-token
Headers: Authorization: Bearer {token}

Request:
{
  "project_id": "uuid",
  "file_name": "document.pdf",
  "file_size": 5000000,
  "file_type": "application/pdf"
}

Response: 200
{
  "success": true,
  "data": {
    "upload_url": "signed-url",
    "file_path": "path/to/file"
  }
}
```

### 2. Save Document
```typescript
POST /documents
Headers: Authorization: Bearer {token}

Request:
{
  "project_id": "uuid",
  "title": "Requirements Doc",
  "file_path": "path/to/file",
  "file_name": "document.pdf",
  "file_size": 5000000,
  "file_type": "application/pdf",
  "tags": ["requirements", "v1"]
}

Response: 201
{
  "success": true,
  "data": { /* document */ }
}
```

### 3. List Documents
```typescript
GET /documents?project_id=uuid
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Requirements Doc",
      "file_name": "document.pdf",
      "file_size": 5000000,
      "uploaded_by": "uuid"
    }
  ]
}
```

### 4. Get Document
```typescript
GET /documents/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": { /* document */ }
}
```

### 5. Get Download URL
```typescript
GET /documents/:id/download
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "download_url": "signed-url"
  }
}
```

### 6. Update Document
```typescript
PATCH /documents/:id
Headers: Authorization: Bearer {token}

Request:
{
  "title": "Updated Title",
  "tags": ["updated", "v2"]
}

Response: 200
{
  "success": true,
  "message": "Document updated",
  "data": { /* updated document */ }
}
```

### 7. Delete Document
```typescript
DELETE /documents/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Document deleted"
}
```

---

## Teams Endpoints

### 1. Invite User to Project
```typescript
POST /teams/:project_id/invite
Headers: Authorization: Bearer {token}

Request:
{
  "email": "user@example.com",
  "role": "developer"
}

Response: 201
{
  "success": true,
  "message": "Invite sent",
  "data": {
    "link": "invite-link"
  }
}
```

### 2. Accept Invite
```typescript
POST /teams/accept
Headers: Authorization: Bearer {token}

Request:
{
  "token": "invite-token"
}

Response: 200
{
  "success": true,
  "message": "Joined project"
}
```

### 3. Get Project Members
```typescript
GET /teams/:project_id/members
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [ /* members */ ]
}
```

### 4. Create Team
```typescript
POST /teams
Headers: Authorization: Bearer {token}

Request:
{
  "name": "Frontend Team",
  "description": "Team description",
  "team_lead_id": "uuid"
}

Response: 201
{
  "success": true,
  "data": { /* team */ }
}
```

### 5. List Teams
```typescript
GET /teams
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [ /* teams */ ]
}
```

### 6. Get Team
```typescript
GET /teams/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": { /* team */ }
}
```

### 7. Update Team
```typescript
PATCH /teams/:id
Headers: Authorization: Bearer {token}

Request:
{
  "name": "Updated Name",
  "team_lead_id": "uuid"
}

Response: 200
{
  "success": true,
  "data": { /* updated team */ }
}
```

### 8. Delete Team
```typescript
DELETE /teams/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Team deleted"
}
```

### 9. Get Team Members
```typescript
GET /teams/:id/members
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [ /* team members */ ]
}
```

### 10. Add Team Member
```typescript
POST /teams/:id/members
Headers: Authorization: Bearer {token}

Request:
{
  "user_id": "uuid",
  "role": "developer"
}

Response: 201
{
  "success": true,
  "message": "Member added"
}
```

### 11. Remove Team Member
```typescript
DELETE /teams/:id/members/:userId
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Member removed"
}
```

---

## Comments Endpoints

### 1. Create Comment
```typescript
POST /comments
Headers: Authorization: Bearer {token}

Request:
{
  "project_id": "uuid",
  "resource_type": "task",  // task, prd, document
  "resource_id": "uuid",
  "content": "This is a comment",
  "parent_id": "uuid"  // Optional, for replies
}

Response: 201
{
  "success": true,
  "message": "Comment created",
  "data": {
    "id": "uuid",
    "content": "This is a comment",
    "users": { "full_name": "John Doe" }
  }
}
```

### 2. Get Comments
```typescript
GET /comments?resource_type=task&resource_id=uuid&project_id=uuid
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Comment",
      "users": { /* user */ },
      "replies": [ /* nested comments */ ]
    }
  ]
}
```

### 3. Update Comment
```typescript
PATCH /comments/:id
Headers: Authorization: Bearer {token}

Request:
{
  "content": "Updated comment"
}

Response: 200
{
  "success": true,
  "data": { /* updated comment */ }
}
```

### 4. Delete Comment
```typescript
DELETE /comments/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Comment deleted"
}
```

---

## Notifications Endpoints

### 1. Get Notifications
```typescript
GET /notifications
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "task_assigned",
      "title": "New task assigned",
      "message": "You have been assigned to Task X",
      "link": "/tasks/uuid",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Mark as Read
```typescript
PATCH /notifications/:id/read
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Marked as read"
}
```

### 3. Mark All as Read
```typescript
PATCH /notifications/mark-all-read
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "All marked as read"
}
```

---

## Analytics Endpoints

### 1. Get Project Analytics
```typescript
GET /analytics?project_id=uuid
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "kpiCards": [
      {
        "title": "Total Tasks",
        "value": 50,
        "change": "+12%",
        "trend": "up"
      }
    ],
    "projectProgress": {
      "completion": 75,
      "tasksCompleted": 30,
      "tasksTotal": 40
    },
    "teamPerformance": {
      "totalMembers": 10,
      "activeMembers": 8,
      "tasksPerMember": 5
    },
    "taskAnalytics": {
      "byStatus": {
        "todo": 5,
        "in_progress": 10,
        "completed": 30
      },
      "byPriority": {
        "low": 10,
        "medium": 20,
        "high": 15,
        "urgent": 5
      }
    }
  }
}
```

---

## Handoffs Endpoints

### 1. Create Handoff
```typescript
POST /handoffs
Headers: Authorization: Bearer {token}

Request:
{
  "project_id": "uuid",
  "to_user_id": "uuid",
  "title": "Feature Handoff",
  "description": "Handoff details",
  "priority": "high",
  "due_date": "2024-12-31"
}

Response: 201
{
  "success": true,
  "data": { /* handoff */ }
}
```

### 2. List Handoffs
```typescript
GET /handoffs?project_id=uuid&status=pending
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [ /* handoffs */ ]
}
```

### 3. Get Handoff
```typescript
GET /handoffs/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": { /* handoff */ }
}
```

### 4. Update Handoff
```typescript
PATCH /handoffs/:id
Headers: Authorization: Bearer {token}

Request:
{
  "status": "approved",
  "notes": "Looks good"
}

Response: 200
{
  "success": true,
  "data": { /* updated handoff */ }
}
```

### 5. Delete Handoff
```typescript
DELETE /handoffs/:id
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Handoff deleted"
}
```

---

## Activity Endpoints

### 1. Get Activity Feed
```typescript
GET /activity?project_id=uuid&type=task&limit=50
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "task-uuid",
      "type": "task",
      "action": "created",
      "resource_type": "task",
      "resource_id": "uuid",
      "title": "Task Title",
      "user": {
        "full_name": "John Doe"
      },
      "timestamp": "2024-01-01T00:00:00Z",
      "metadata": {
        "status": "todo"
      }
    }
  ]
}
```

---

## Subscriptions Endpoints

### 1. Get Company Subscription
```typescript
GET /subscription
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "plan_type": "pro",
    "status": "active",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z"
  }
}
```

### 2. Get Usage
```typescript
GET /subscription/usage
Headers: Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "projects": 5,
    "tasks": 150,
    "storageUsedGB": 2.5,
    "teamMembers": 10
  }
}
```

### 3. Get Available Plans (Public)
```typescript
GET /plans

Response: 200
{
  "success": true,
  "data": [
    {
      "name": "free",
      "displayName": "Free",
      "price": 0,
      "features": {
        "maxProjects": 3,
        "maxTasks": 100,
        "maxStorageGB": 5,
        "maxMembers": 5
      }
    },
    {
      "name": "pro",
      "displayName": "Pro",
      "price": 29,
      "features": {
        "maxProjects": 50,
        "maxTasks": 1000,
        "maxStorageGB": 100,
        "maxMembers": 25
      }
    }
  ]
}
```

### 4. Change Subscription
```typescript
POST /subscription/change
Headers: Authorization: Bearer {token}

Request:
{
  "plan_type": "pro"
}

Response: 200
{
  "success": true,
  "message": "Subscription updated"
}
```

---

## TypeScript Types

```typescript
// User Types
interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  company_role?: 'admin' | 'member' | 'viewer';
  two_factor_enabled: boolean;
  created_at: string;
}

// Company Types
interface Company {
  id: string;
  name: string;
  slug?: string;
  created_at: string;
  updated_at: string;
}

// Project Types
interface Project {
  id: string;
  name: string;
  description?: string;
  team_name?: string;
  status: 'active' | 'archived' | 'completed';
  owner_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

// Task Types
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  created_by: string;
  project_id: string;
  company_id: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  assignee?: User;
  reporter?: User;
}

// PRD Types
type PRDStatus = 'draft' | 'under_review' | 'approved' | 'rejected';

interface PRD {
  id: string;
  title: string;
  content: Record<string, any>;
  status: PRDStatus;
  version: number;
  project_id: string;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Document Types
interface Document {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  tags?: string[];
  project_id: string;
  company_id: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// Comment Types
interface Comment {
  id: string;
  content: string;
  user_id: string;
  project_id: string;
  resource_type: 'task' | 'prd' | 'document';
  resource_id: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  users?: User;
  replies?: Comment[];
}

// Notification Types
interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// Team Types
interface Team {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  team_lead_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Handoff Types
interface Handoff {
  id: string;
  project_id: string;
  company_id: string;
  from_user_id: string;
  to_user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}
```

---

## Error Handling

All errors follow this format:

```typescript
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (valid token, insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate entry)
- `413` - Payload Too Large (file size exceeded)
- `500` - Internal Server Error

### Example Error Responses

```typescript
// Validation Error
{
  "success": false,
  "error": "Validation failed",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}

// Unauthorized
{
  "success": false,
  "error": "No token provided",
  "statusCode": 401
}

// Forbidden
{
  "success": false,
  "error": "Access denied. You are not a member of this company.",
  "statusCode": 403
}

// Not Found
{
  "success": false,
  "error": "Task not found or access denied",
  "statusCode": 404
}
```

---

## Implementation Notes

### 1. Token Storage
Store the JWT token securely:
```typescript
// After login
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));
localStorage.setItem('company', JSON.stringify(response.data.company));

// For requests
const token = localStorage.getItem('token');
```

### 2. Axios Example
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. File Upload Flow
```typescript
// Step 1: Request upload token
const tokenResponse = await api.post('/documents/upload-token', {
  project_id: 'uuid',
  file_name: file.name,
  file_size: file.size,
  file_type: file.type,
});

// Step 2: Upload file to Supabase Storage
const { upload_url, file_path } = tokenResponse.data.data;
await fetch(upload_url, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
});

// Step 3: Save document metadata
await api.post('/documents', {
  project_id: 'uuid',
  title: file.name,
  file_path,
  file_name: file.name,
  file_size: file.size,
  file_type: file.type,
});
```

### 4. Real-time Updates (Optional)
For real-time features, consider using Supabase Realtime:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to task updates
const channel = supabase
  .channel('tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `project_id=eq.${projectId}`,
  }, (payload) => {
    console.log('Task updated:', payload);
    // Update UI
  })
  .subscribe();
```

---

## Testing

Use this Postman collection structure or similar:

```json
{
  "info": {
    "name": "Zyndrx API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [{
      "key": "token",
      "value": "{{token}}",
      "type": "string"
    }]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api/v1"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

---

## Support

For issues or questions:
1. Check error responses for details
2. Verify token is valid and not expired
3. Ensure company context (companyId) is set
4. Check CORS if calling from browser

---

**Version**: 1.0  
**Last Updated**: Current  
**Base URL**: `http://localhost:5000/api/v1`  
**Authentication**: JWT Bearer Token  
**All endpoints require companyId in JWT** (except auth and public plans)
