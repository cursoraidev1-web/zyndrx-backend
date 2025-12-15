# 🚀 ZYNDRX API - COMPLETE POSTMAN TESTING GUIDE

**Base URL:** `http://localhost:5000/api/v1`

---

## 📋 TABLE OF CONTENTS

1. [Authentication](#authentication)
2. [Projects](#projects)
3. [PRDs](#prds)
4. [Tasks](#tasks)
5. [Documents](#documents)
6. [Notifications](#notifications)
7. [Analytics](#analytics)
8. [GitHub Integration](#github-integration)

---

## 🔐 AUTHENTICATION

### 1. Register User
**POST** `/auth/register`

**Body:**
```json
{
  "email": "admin@zyndrx.com",
  "password": "SecurePass123!",
  "fullName": "John Admin",
  "role": "admin"
}
```

**Roles:** `admin`, `product_manager`, `developer`, `qa`, `devops`, `designer`

---

### 2. Login
**POST** `/auth/login`

**Body:**
```json
{
  "email": "admin@zyndrx.com",
  "password": "SecurePass123!"
}
```

**Response:** Copy the `token` and set as `{{token}}` in Postman environment!

---

### 3. Get Current User
**GET** `/auth/me`

**Headers:** `Authorization: Bearer {{token}}`

---

### 4. Update Profile
**PUT** `/auth/profile`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "fullName": "John Admin Updated",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

---

## 📁 PROJECTS

### 1. Create Project
**POST** `/projects`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "name": "Zyndrx Mobile App",
  "description": "Mobile application for project management",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z"
}
```

---

### 2. Get All Projects
**GET** `/projects`

**Headers:** `Authorization: Bearer {{token}}`

---

### 3. Get Project By ID
**GET** `/projects/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

### 4. Update Project
**PUT** `/projects/:id`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "name": "Zyndrx Mobile App v2",
  "status": "active"
}
```

---

### 5. Add Member to Project
**POST** `/projects/:id/members`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "userId": "user-uuid-here",
  "role": "developer"
}
```

---

### 6. Get Project Members
**GET** `/projects/:id/members`

**Headers:** `Authorization: Bearer {{token}}`

---

### 7. Remove Member
**DELETE** `/projects/:id/members/:userId`

**Headers:** `Authorization: Bearer {{token}}`

---

### 8. Delete Project
**DELETE** `/projects/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

## 📝 PRDS

### 1. Create PRD
**POST** `/prds`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "projectId": "project-uuid",
  "title": "User Authentication Feature",
  "content": {
    "overview": "Implement secure user authentication",
    "goals": ["Enable secure registration", "Implement JWT auth"],
    "features": [
      {
        "title": "User Registration",
        "description": "Allow users to create accounts",
        "priority": "high",
        "acceptanceCriteria": [
          "Email validation",
          "Password requirements met"
        ]
      }
    ],
    "userStories": [
      {
        "asA": "new user",
        "iWant": "to create an account",
        "soThat": "I can access the platform"
      }
    ],
    "technicalRequirements": ["Use bcrypt", "Implement JWT"],
    "constraints": ["GDPR compliance"],
    "successMetrics": ["99% success rate"],
    "timeline": {
      "estimatedStart": "2025-01-15",
      "estimatedEnd": "2025-02-15"
    }
  }
}
```

---

### 2. Get All PRDs
**GET** `/prds?projectId=xxx&status=draft&page=1&limit=20`

**Headers:** `Authorization: Bearer {{token}}`

**Query Params:**
- `projectId` (optional)
- `status` (optional): `draft`, `in_review`, `approved`, `rejected`
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

---

### 3. Get PRD By ID
**GET** `/prds/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

### 4. Update PRD
**PUT** `/prds/:id`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "title": "User Authentication & Password Reset",
  "content": {...},
  "changesSummary": "Added password reset feature"
}
```

---

### 5. Update PRD Status
**PATCH** `/prds/:id/status`

**Headers:** `Authorization: Bearer {{token}}`

**Submit for Review:**
```json
{
  "status": "in_review"
}
```

**Approve:**
```json
{
  "status": "approved"
}
```

**Reject:**
```json
{
  "status": "rejected",
  "rejectionReason": "Missing technical requirements"
}
```

---

### 6. Get PRD Versions
**GET** `/prds/:id/versions`

**Headers:** `Authorization: Bearer {{token}}`

---

### 7. Delete PRD
**DELETE** `/prds/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

## ✅ TASKS

### 1. Create Task
**POST** `/tasks`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "projectId": "project-uuid",
  "prdId": "prd-uuid",
  "title": "Implement user registration API",
  "description": "Create POST /auth/register endpoint",
  "priority": "high",
  "assignedTo": "user-uuid",
  "dueDate": "2025-01-31T23:59:59.000Z"
}
```

**Priority:** `low`, `medium`, `high`, `urgent`

---

### 2. Get All Tasks
**GET** `/tasks?projectId=xxx&status=todo&priority=high`

**Headers:** `Authorization: Bearer {{token}}`

**Query Params:**
- `projectId` (optional)
- `prdId` (optional)
- `status` (optional): `todo`, `in_progress`, `in_review`, `completed`, `blocked`
- `priority` (optional): `low`, `medium`, `high`, `urgent`
- `assignedTo` (optional)
- `search` (optional)
- `sortBy` (optional): `created_at`, `due_date`, `priority`, `order_index`
- `sortOrder` (optional): `asc`, `desc`
- `page`, `limit`

---

### 3. Get Task By ID
**GET** `/tasks/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

### 4. Update Task
**PUT** `/tasks/:id`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "title": "Implement user registration API (updated)",
  "status": "in_progress",
  "priority": "urgent",
  "assignedTo": "another-user-uuid"
}
```

---

### 5. Get Task Statistics
**GET** `/tasks/stats/:projectId`

**Headers:** `Authorization: Bearer {{token}}`

**Response:**
```json
{
  "total": 25,
  "byStatus": {
    "todo": 5,
    "in_progress": 10,
    "in_review": 3,
    "completed": 7,
    "blocked": 0
  },
  "byPriority": {
    "low": 3,
    "medium": 12,
    "high": 8,
    "urgent": 2
  },
  "completionRate": "28.00"
}
```

---

### 6. Bulk Update Tasks (Reorder)
**PATCH** `/tasks/bulk`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "tasks": [
    { "id": "task-1-uuid", "orderIndex": 0 },
    { "id": "task-2-uuid", "orderIndex": 1 },
    { "id": "task-3-uuid", "orderIndex": 2 }
  ]
}
```

---

### 7. Delete Task
**DELETE** `/tasks/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

## 📄 DOCUMENTS

### 1. Create Document
**POST** `/documents`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "projectId": "project-uuid",
  "prdId": "prd-uuid",
  "title": "Technical Architecture Diagram",
  "fileUrl": "https://your-storage.com/file.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000,
  "tags": ["architecture", "technical", "design"]
}
```

**Note:** File upload happens separately (e.g., to Supabase Storage). This endpoint just creates the database record.

---

### 2. Get All Documents
**GET** `/documents?projectId=xxx&fileType=pdf&tags=architecture`

**Headers:** `Authorization: Bearer {{token}}`

**Query Params:**
- `projectId` (optional)
- `prdId` (optional)
- `fileType` (optional)
- `tags` (optional, comma-separated)
- `search` (optional)
- `page`, `limit`

---

### 3. Get Document By ID
**GET** `/documents/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

### 4. Update Document
**PUT** `/documents/:id`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "title": "Technical Architecture Diagram v2",
  "tags": ["architecture", "technical", "design", "updated"]
}
```

---

### 5. Delete Document
**DELETE** `/documents/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

## 🔔 NOTIFICATIONS

### 1. Get Notifications
**GET** `/notifications?isRead=false&page=1&limit=20`

**Headers:** `Authorization: Bearer {{token}}`

**Query Params:**
- `isRead` (optional): `true` or `false`
- `type` (optional): `task_assigned`, `task_completed`, `prd_approved`, etc.
- `page`, `limit`

---

### 2. Get Unread Count
**GET** `/notifications/unread-count`

**Headers:** `Authorization: Bearer {{token}}`

**Response:**
```json
{
  "unreadCount": 5
}
```

---

### 3. Mark As Read
**PATCH** `/notifications/read`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "notificationIds": ["notif-1-uuid", "notif-2-uuid"]
}
```

---

### 4. Mark All As Read
**PATCH** `/notifications/read-all`

**Headers:** `Authorization: Bearer {{token}}`

---

### 5. Delete Notification
**DELETE** `/notifications/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

## 📊 ANALYTICS

### 1. Get User Dashboard
**GET** `/analytics/me`

**Headers:** `Authorization: Bearer {{token}}`

**Response:**
```json
{
  "projects": { "total": 5 },
  "tasks": {
    "assigned": 12,
    "created": 25,
    "byStatus": {...},
    "overdue": 2
  },
  "prds": { "created": 8 },
  "notifications": { "unread": 3 }
}
```

---

### 2. Get Project Analytics
**GET** `/analytics/projects/:projectId`

**Headers:** `Authorization: Bearer {{token}}`

**Response:**
```json
{
  "project": {
    "id": "xxx",
    "name": "Zyndrx Mobile App",
    "memberCount": 5
  },
  "tasks": {
    "total": 50,
    "byStatus": {...},
    "byPriority": {...},
    "completionRate": "42.00"
  },
  "prds": {
    "total": 10,
    "draft": 2,
    "approved": 6
  },
  "documents": { "total": 15 }
}
```

---

## 🔗 GITHUB INTEGRATION

### 1. Create GitHub Integration
**POST** `/github/integrations`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "projectId": "project-uuid",
  "repositoryUrl": "https://github.com/username/repo-name",
  "accessToken": "ghp_yourGitHubToken",
  "webhookSecret": "optional-secret"
}
```

---

### 2. Get Project Integration
**GET** `/github/integrations/:projectId`

**Headers:** `Authorization: Bearer {{token}}`

---

### 3. Update Integration
**PUT** `/github/integrations/:id`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "repositoryUrl": "https://github.com/username/new-repo",
  "isActive": false
}
```

---

### 4. Delete Integration
**DELETE** `/github/integrations/:id`

**Headers:** `Authorization: Bearer {{token}}`

---

### 5. Get Commits
**GET** `/github/commits?projectId=xxx&taskId=yyy&page=1&limit=20`

**Headers:** `Authorization: Bearer {{token}}`

**Query Params:**
- `projectId` (optional)
- `taskId` (optional)
- `page`, `limit`

---

### 6. Link Commit to Task
**PATCH** `/github/commits/:id/link`

**Headers:** `Authorization: Bearer {{token}}`

**Body:**
```json
{
  "taskId": "task-uuid"
}
```

---

### 7. GitHub Webhook (Public Endpoint)
**POST** `/github/webhook/:projectId`

**Headers:**
```
X-Hub-Signature-256: sha256=signature
Content-Type: application/json
```

**Note:** This is called automatically by GitHub. Configure in your repo settings.

---

## 🧪 COMPLETE WORKFLOW TEST

```
1. POST /auth/register (admin) → Save token
2. POST /auth/register (developer) → Save userId
3. POST /projects → Save projectId
4. POST /projects/:id/members (add developer)
5. POST /prds (create PRD) → Save prdId
6. PATCH /prds/:id/status (submit for review)
7. PATCH /prds/:id/status (approve)
8. POST /tasks (create task) → Save taskId
9. PUT /tasks/:id (update status to in_progress)
10. POST /documents (upload document)
11. POST /github/integrations (setup GitHub)
12. GET /github/commits (view commits)
13. GET /analytics/projects/:projectId (view stats)
14. GET /analytics/me (view user dashboard)
```

---

## ✅ POSTMAN ENVIRONMENT VARIABLES

Create an environment in Postman with:

- `base_url`: `http://localhost:5000/api/v1`
- `token`: (auto-populated after login)
- `projectId`: (save after creating project)
- `prdId`: (save after creating PRD)
- `taskId`: (save after creating task)

---

## 🎯 AUTO-SAVE TOKEN SCRIPT

In your **Login request → Tests tab**, add:

```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set('token', response.data.token);
    pm.environment.set('user_id', response.data.user.id);
}
```

---

**🚀 Your Zyndrx API is now complete and ready for testing!**
