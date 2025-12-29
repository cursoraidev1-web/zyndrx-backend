# API Quick Reference Card

**Base URL**: `http://localhost:5000/api/v1`  
**Auth**: `Authorization: Bearer {token}`

---

## 🔐 Auth (No token required)

```
POST   /auth/register        { email, password, full_name, companyName }
POST   /auth/login           { email, password }
POST   /auth/forgot-password { email }
POST   /auth/reset-password  { token, password }
GET    /plans                (public - available plans)
```

## 🔒 Protected Endpoints (Token required)

### Auth
```
GET    /auth/me              Current user
PUT    /auth/profile         Update profile
POST   /auth/logout
POST   /auth/2fa/setup
POST   /auth/2fa/enable      { token }
POST   /auth/2fa/verify      { token }
GET    /auth/companies       My companies
```

### Companies
```
GET    /companies/:id
POST   /companies            { name }
GET    /companies/:id/members
POST   /companies/:id/invite { email, role }
PATCH  /companies/:id/members/:userId { role }
DELETE /companies/:id/members/:userId
```

### Users
```
GET    /users                All company users
GET    /users/:id            Single user
GET    /users/search?q=john
GET    /users/stats
```

### Projects
```
GET    /projects?team_name=x&status=active
GET    /projects/:id
POST   /projects             { name, description, team_name }
PATCH  /projects/:id         { name, description, status }
DELETE /projects/:id
GET    /projects/:id/members
POST   /projects/:id/members { user_id, role }
DELETE /projects/:id/members/:userId
```

### PRDs
```
GET    /prds?project_id=uuid
GET    /prds/:id
POST   /prds                 { project_id, title, content }
PATCH  /prds/:id             { title, content }
DELETE /prds/:id
PATCH  /prds/:id/status      { status } (admin only)
POST   /prds/:id/versions    { title, content, changes_summary }
GET    /prds/:id/versions
```

### Tasks
```
GET    /tasks?project_id=uuid
GET    /tasks                All company tasks
GET    /tasks/:id
POST   /tasks                { project_id, title, description, priority, assigned_to }
PATCH  /tasks/:id            { status, assigned_to, priority }
DELETE /tasks/:id
```

### Task Attachments
```
POST   /tasks/:taskId/attachments/upload-token  { file_name, file_size, file_type }
POST   /tasks/:taskId/attachments               { file_path, file_name, file_size, file_type }
GET    /tasks/:taskId/attachments
GET    /tasks/attachments/:id/download
DELETE /tasks/attachments/:id
```

### Documents
```
POST   /documents/upload-token  { project_id, file_name, file_size, file_type }
POST   /documents               { project_id, title, file_path, file_name, file_size, file_type }
GET    /documents?project_id=uuid
GET    /documents/:id
GET    /documents/:id/download
PATCH  /documents/:id           { title, tags }
DELETE /documents/:id
```

### Teams
```
POST   /teams/:project_id/invite  { email, role }
POST   /teams/accept              { token }
GET    /teams/:project_id/members
POST   /teams                     { name, description, team_lead_id }
GET    /teams
GET    /teams/:id
PATCH  /teams/:id                 { name, team_lead_id }
DELETE /teams/:id
GET    /teams/:id/members
POST   /teams/:id/members         { user_id, role }
DELETE /teams/:id/members/:userId
```

### Comments
```
POST   /comments                  { project_id, resource_type, resource_id, content, parent_id? }
GET    /comments?resource_type=task&resource_id=uuid&project_id=uuid
PATCH  /comments/:id              { content }
DELETE /comments/:id
```

### Notifications
```
GET    /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/mark-all-read
```

### Analytics
```
GET    /analytics?project_id=uuid
```

### Handoffs
```
POST   /handoffs                  { project_id, to_user_id, title, description, priority, due_date }
GET    /handoffs?project_id=uuid&status=pending
GET    /handoffs/:id
PATCH  /handoffs/:id              { status, notes }
DELETE /handoffs/:id
```

### Activity
```
GET    /activity?project_id=uuid&type=task&limit=50
```

### Subscriptions
```
GET    /subscription              Company subscription
GET    /subscription/usage        Current usage
POST   /subscription/change       { plan_type }
```

---

## 📊 Common Enums

### Task Status
`todo`, `in_progress`, `in_review`, `completed`, `blocked`

### Task Priority
`low`, `medium`, `high`, `urgent`

### PRD Status
`draft`, `under_review`, `approved`, `rejected`

### Project Status
`active`, `archived`, `completed`

### User Roles
`admin`, `user`

### Company Roles
`admin`, `member`, `viewer`

### Team Member Roles
`developer`, `manager`, `viewer`

### Handoff Status
`pending`, `approved`, `rejected`

---

## 🚨 Error Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `409` - Conflict (duplicate)
- `413` - File too large
- `500` - Server Error

---

## 💡 Quick Tips

### Authentication
```typescript
// Store after login
localStorage.setItem('token', response.data.token);

// Use in requests
headers: { 'Authorization': `Bearer ${token}` }
```

### File Upload (2-step)
```typescript
// 1. Get upload token
POST /documents/upload-token
// 2. Upload to Supabase
PUT signed_url (from step 1)
// 3. Save metadata
POST /documents
```

### Error Handling
```typescript
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Success Response
```typescript
{
  "success": true,
  "data": { /* result */ },
  "message": "Optional message"
}
```

---

## 🔑 Required Fields

### Registration
- `email` ✅
- `password` ✅
- `full_name` ✅
- `companyName` ✅ **IMPORTANT: Creates company**

### Login
- `email` ✅
- `password` ✅

### Create Project
- `name` ✅
- `team_name` (optional)

### Create Task
- `project_id` ✅
- `title` ✅

### Create PRD
- `project_id` ✅
- `title` ✅
- `content` ✅

### Create Comment
- `project_id` ✅
- `resource_type` ✅
- `resource_id` ✅
- `content` ✅

---

## 🎯 Common Flows

### 1. New User Registration
```
1. POST /auth/register (creates user + company)
2. Store token
3. GET /auth/me (get user details)
4. GET /projects (start using app)
```

### 2. Login Existing User
```
1. POST /auth/login
2. Store token + company info
3. Redirect to dashboard
```

### 3. Create Project with Tasks
```
1. POST /projects
2. POST /tasks (for project_id)
3. GET /tasks?project_id=xxx (list tasks)
```

### 4. Upload Document
```
1. POST /documents/upload-token
2. PUT to Supabase (signed URL)
3. POST /documents (save metadata)
4. GET /documents/:id/download (when needed)
```

### 5. Add Comment
```
1. POST /comments (with resource info)
2. GET /comments?resource_id=xxx (refresh)
```

---

**Remember**: All endpoints need:
- Valid JWT token in Authorization header
- User must belong to company (companyId in JWT)
- Company isolation is enforced (can't access other companies' data)

**Health Check**: `GET /health` (no auth needed)
