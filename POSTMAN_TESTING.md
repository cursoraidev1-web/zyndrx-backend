# Postman Testing Guide for Zyndrx Backend

Complete guide for testing the Zyndrx backend API using Postman locally.

## Table of Contents

1. [Setup Postman Environment](#1-setup-postman-environment)
2. [Health Check](#2-health-check-start-here)
3. [Authentication Flow](#3-authentication-flow)
4. [Companies/Workspaces](#4-companiesworkspaces)
5. [Projects](#5-projects)
6. [Tasks](#6-tasks)
7. [Documents](#7-documents)
8. [Subscriptions & Plans](#8-subscriptions--plans)
9. [Notifications](#9-notifications)
10. [PRDs](#10-prds-product-requirements-documents)
11. [Analytics](#11-analytics)
12. [Teams](#12-teams)
13. [Postman Collection Setup Tips](#postman-collection-setup-tips)
14. [Testing Workflow](#testing-workflow)
15. [Common Issues & Solutions](#common-issues--solutions)

---

## ⚠️ Important Notes

**This guide has been verified against the actual codebase.** All endpoints listed below are confirmed to exist in the code.

**Endpoints NOT implemented:**
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `DELETE /tasks/:id` - Delete task
- `DELETE /documents/:id` - Delete document
- `GET /prds?project_id=...` - List PRDs by project (use GET /prds/:id instead)
- `PUT /companies/:id` - Update company
- `POST /companies/accept-invite` - Accept company invitation (not implemented)

**Special Notes:**
- Get user's companies: Use `GET /auth/companies` (not `/companies`)
- Switch company body parameter: Use `company_id` (not `companyId`)
- Teams invite: `projectId` goes in request body, not URL path
- Teams get members: Use `projectId` in URL path (not `project_id`)

---

## 1. Setup Postman Environment

Create a new environment in Postman with the following variables:

**Variables:**
- `base_url` = `http://localhost:5000/api/v1`
- `token` = (leave empty, will be set after login)
- `company_id` = (leave empty, will be set after registration)
- `project_id` = (leave empty, for testing)
- `task_id` = (leave empty, for testing)
- `user_id` = (leave empty, for testing)

---

## 2. Health Check (Start Here)

**GET** `http://localhost:5000/health`

**Expected Response:**
```json
{
  "success": true,
  "message": "Zyndrx API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

---

## 3. Authentication Flow

### 3.1 Register New User

**POST** `{{base_url}}/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "test@example.com",
  "password": "Test1234",
  "fullName": "Test User",
  "companyName": "Test Company"
}
```

**What to Save:**
- Copy `token` from response → Set `{{token}}` variable
- Copy `companyId` from response → Set `{{company_id}}` variable

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "companyId": "uuid-here",
    "companies": [ ... ]
  }
}
```

### 3.2 Login

**POST** `{{base_url}}/auth/login`

**Body:**
```json
{
  "email": "test@example.com",
  "password": "Test1234"
}
```

**Save:** Update `{{token}}` variable

### 3.3 Get Current User

**GET** `{{base_url}}/auth/me`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 3.4 Update Profile

**PUT** `{{base_url}}/auth/profile`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "fullName": "Updated Name",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

### 3.5 Forgot Password

**POST** `{{base_url}}/auth/forgot-password`

**Body:**
```json
{
  "email": "test@example.com"
}
```

### 3.6 Reset Password

**POST** `{{base_url}}/auth/reset-password`

**Body:**
```json
{
  "accessToken": "reset-token-from-email",
  "password": "NewPassword123"
}
```

### 3.6a Google OAuth - Initiate (Browser Redirect)

**GET** `{{base_url}}/auth/google?companyName=OptionalCompanyName`

**Note:** This redirects to Google's OAuth page. For Postman testing, use the POST endpoint below instead.

### 3.6b Google OAuth - Direct Token (Postman Testing)

**POST** `{{base_url}}/auth/google`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "accessToken": "google-access-token-here",
  "companyName": "Optional Company Name"
}
```

**Note:** This is the legacy/direct token method. For production, use the GET redirect flow.

### 3.6c Google OAuth Callback

**GET** `{{base_url}}/auth/google/callback?code=...&state=...`

**Note:** This is handled automatically by the OAuth flow. Not typically used in Postman.

### 3.6d GitHub OAuth - Initiate (Browser Redirect)

**GET** `{{base_url}}/auth/github?companyName=OptionalCompanyName`

**Note:** This redirects to GitHub's OAuth page. For Postman testing, use the POST endpoint below instead.

### 3.6e GitHub OAuth - Direct Token (Postman Testing)

**POST** `{{base_url}}/auth/github`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "accessToken": "github-access-token-here",
  "companyName": "Optional Company Name"
}
```

**Note:** This is the legacy/direct token method. For production, use the GET redirect flow.

### 3.6f GitHub OAuth Callback

**GET** `{{base_url}}/auth/github/callback?code=...&state=...`

**Note:** This is handled automatically by the OAuth flow. Not typically used in Postman.

### 3.7 Switch Company

**POST** `{{base_url}}/auth/switch-company`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "company_id": "{{company_id}}"
}
```

**Note:** The response doesn't include a new token. You may need to call `/auth/me` after switching to get updated user info with the new company context.

### 3.8 Setup 2FA

**POST** `{{base_url}}/auth/2fa/setup`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "secret": "base32-secret",
    "qrCodeUrl": "otpauth://totp/..."
  }
}
```

### 3.9 Enable 2FA

**POST** `{{base_url}}/auth/2fa/enable`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "token": "123456"
}
```

**Note:** `token` is the 6-digit code from your authenticator app

### 3.10 Verify 2FA (During Login)

**POST** `{{base_url}}/auth/2fa/verify`

**Body:**
```json
{
  "email": "test@example.com",
  "token": "123456"
}
```

**Note:** This is used after initial login when 2FA is enabled. No auth header needed.

---

## 4. Companies/Workspaces

### 4.1 Get User's Companies

**GET** `{{base_url}}/auth/companies`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Note:** This endpoint is under `/auth/companies`, not `/companies`

### 4.2 Create Company

**POST** `{{base_url}}/companies`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "New Company"
}
```

**Note:** `slug` is auto-generated, you don't need to provide it

### 4.3 Get Company Details

**GET** `{{base_url}}/companies/{{company_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 4.4 Get Company Members

**GET** `{{base_url}}/companies/{{company_id}}/members`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 4.5 Invite User to Company

**POST** `{{base_url}}/companies/{{company_id}}/invite`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

**Note:** `role` is optional, defaults to "member". Valid roles: `admin`, `member`, `viewer`

### 4.6 Update Member Role

**PATCH** `{{base_url}}/companies/{{company_id}}/members/{{user_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "role": "admin"
}
```

**Valid roles:** `admin`, `member`, `viewer`

### 4.7 Remove Member

**DELETE** `{{base_url}}/companies/{{company_id}}/members/{{user_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Note:** Company accept-invite endpoint does not exist in the current implementation

---

## 5. Projects

### 5.1 Get All Projects

**GET** `{{base_url}}/projects`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Params (optional):**
- `status` = `active` | `completed` | `on_hold`
- `team_name` = `Engineering`

### 5.2 Create Project

**POST** `{{base_url}}/projects`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "team_name": "Engineering"
}
```

**Save:** Copy `id` → Set `{{project_id}}` variable

### 5.3 Get Project Details

**GET** `{{base_url}}/projects/{{project_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Note:** Update and Delete endpoints for projects are not currently implemented in the codebase

---

## 6. Tasks

### 6.1 Get Tasks by Project

**GET** `{{base_url}}/tasks?project_id={{project_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 6.2 Create Task

**POST** `{{base_url}}/tasks`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "status": "todo",
  "priority": "medium",
  "project_id": "{{project_id}}",
  "due_date": "2024-01-15"
}
```

**Save:** Copy `id` → Set `{{task_id}}` variable

### 6.3 Update Task

**PATCH** `{{base_url}}/tasks/{{task_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "status": "in_progress",
  "priority": "high"
}
```

**Note:** Delete endpoint for tasks is not currently implemented in the codebase

---

## 7. Documents

### 7.1 Get Documents

**GET** `{{base_url}}/documents?project_id={{project_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 7.2 Create Document

**POST** `{{base_url}}/documents`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "project_id": "{{project_id}}",
  "title": "Document Title",
  "file_url": "https://example.com/file.pdf",
  "file_type": "pdf",
  "file_size": 1024000
}
```

**Note:** Delete endpoint for documents is not currently implemented in the codebase

---

## 8. Subscriptions & Plans

### 8.1 Get Available Plans (Public)

**GET** `{{base_url}}/plans`

**No Auth Required**

### 8.2 Get Current Subscription

**GET** `{{base_url}}/subscription`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 8.3 Check Limits and Usage

**GET** `{{base_url}}/subscription/limits`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Params (optional):**
- `resource` = `projects` | `tasks` | `teamMembers` | `documents` | `storage`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "limits": {
      "maxProjects": 3,
      "maxTasks": 50,
      "maxTeamMembers": 5,
      "maxDocuments": 20,
      "maxStorageGB": 1
    },
    "usage": {
      "projectsCount": 2,
      "tasksCount": 15,
      "teamMembersCount": 3,
      "documentsCount": 5,
      "storageUsedGB": 0.5
    },
    "canCreate": {
      "projects": true,
      "tasks": true,
      "teamMembers": true,
      "documents": true,
      "storage": true
    }
  }
}
```

### 8.4 Upgrade Subscription

**POST** `{{base_url}}/subscription/upgrade`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "planType": "pro"
}
```

### 8.5 Cancel Subscription

**POST** `{{base_url}}/subscription/cancel`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "cancelImmediately": false
}
```

---

## 9. Notifications

### 9.1 Get Notifications

**GET** `{{base_url}}/notifications`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 9.2 Mark Notification as Read

**PATCH** `{{base_url}}/notifications/{notification_id}/read`

**Headers:**
```
Authorization: Bearer {{token}}
```

### 9.3 Mark All as Read

**PATCH** `{{base_url}}/notifications/mark-all-read`

**Headers:**
```
Authorization: Bearer {{token}}
```

---

## 10. PRDs (Product Requirements Documents)

### 10.1 Create PRD

**POST** `{{base_url}}/prds`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "project_id": "{{project_id}}",
  "title": "PRD Title",
  "content": "PRD content here",
  "version": "1.0"
}
```

### 10.2 Get PRD Details

**GET** `{{base_url}}/prds/{{prd_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Note:** To get PRDs by project, you need to query by project_id in your application logic. There's no dedicated endpoint for listing PRDs by project.

### 10.3 Update PRD Status

**PATCH** `{{base_url}}/prds/{prd_id}/status`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "status": "approved"
}
```

**Status Options:** `draft` | `in_review` | `approved` | `rejected`

---

## 11. Analytics

### 11.1 Get Project Analytics

**GET** `{{base_url}}/analytics?project_id={{project_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

---

## 12. Teams

### 12.1 Invite User to Project

**POST** `{{base_url}}/teams/invite`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "projectId": "{{project_id}}",
  "email": "user@example.com",
  "role": "developer"
}
```

**Note:** `projectId` is in the request body, not the URL path

### 12.2 Accept Project Invitation

**POST** `{{base_url}}/teams/accept-invite`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "token": "invitation-token-from-email"
}
```

**Note:** This endpoint requires authentication (user must be logged in to accept invite)

### 12.3 Get Project Members

**GET** `{{base_url}}/teams/{{projectId}}/members`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Note:** Use `projectId` in the URL path (not `project_id`)

---

## Postman Collection Setup Tips

### 1. Pre-request Script (Auto-set Token)

Add this to **Collection Pre-request Script**:

```javascript
// Auto-set token from environment
if (pm.environment.get("token")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.environment.get("token")
    });
}
```

This automatically adds the Authorization header to all requests in the collection.

### 2. Test Script (Auto-save Token)

Add this to **Login/Register requests** in the **Tests** tab:

```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.token) {
        pm.environment.set("token", jsonData.data.token);
        console.log("Token saved!");
    }
    if (jsonData.data && jsonData.data.companyId) {
        pm.environment.set("company_id", jsonData.data.companyId);
        console.log("Company ID saved!");
    }
}
```

### 3. Test Script (Auto-save IDs)

For **Create requests**, add this to the **Tests** tab:

```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    const jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.id) {
        // Auto-detect and save based on endpoint
        const url = pm.request.url.toString();
        if (url.includes('/projects')) {
            pm.environment.set("project_id", jsonData.data.id);
            console.log("Project ID saved!");
        } else if (url.includes('/tasks')) {
            pm.environment.set("task_id", jsonData.data.id);
            console.log("Task ID saved!");
        }
    }
}
```

### 4. Response Validation Test

Add this to validate successful responses:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
});
```

---

## Testing Workflow

### Step-by-Step Testing Flow

1. **Start Backend**
   ```bash
   npm run dev
   ```
   Backend should run on `http://localhost:5000`

2. **Test Health Check**
   - `GET /health`
   - Should return 200 with success message

3. **Register New User**
   - `POST /auth/register`
   - Save token and company_id from response

4. **Get User Info**
   - `GET /auth/me`
   - Verify user data is correct

5. **Get Companies**
   - `GET /companies`
   - Should see the company created during registration

6. **Get Available Plans**
   - `GET /plans`
   - Verify plan limits are returned

7. **Check Subscription Limits**
   - `GET /subscription/limits`
   - Verify current usage and limits

8. **Create Project**
   - `POST /projects`
   - Save project_id from response
   - Verify plan limit checking works

9. **Create Task**
   - `POST /tasks`
   - Save task_id from response
   - Link to project_id

10. **Create Document**
    - `POST /documents`
    - Link to project_id

11. **Test CRUD Operations**
    - Update project, task, document
    - Delete resources
    - Verify proper error handling

12. **Test Error Cases**
    - Invalid token (401)
    - Missing required fields (400)
    - Plan limit reached (403)
    - Resource not found (404)

---

## Common Issues & Solutions

### Issue: 401 Unauthorized

**Problem:** Token is missing or invalid

**Solution:**
- Check `Authorization: Bearer {{token}}` header is set
- Verify token variable is saved in environment
- Re-login to get a fresh token

### Issue: 403 Forbidden

**Problem:** User doesn't have permission or plan limit reached

**Solution:**
- Check user role has required permissions
- Verify subscription limits: `GET /subscription/limits`
- Upgrade plan if limit reached

### Issue: 400 Bad Request

**Problem:** Request body doesn't match validation schema

**Solution:**
- Check error message in response for specific validation errors
- Verify all required fields are included
- Check data types match (string, number, date format, etc.)

### Issue: CORS Error

**Problem:** Frontend origin not allowed

**Solution:**
- Ensure `ALLOWED_ORIGINS` in backend `.env` includes your origin
- For Postman, this shouldn't be an issue, but check if testing from browser

### Issue: 404 Not Found

**Problem:** Endpoint doesn't exist or resource not found

**Solution:**
- Verify endpoint URL is correct: `{{base_url}}/endpoint`
- Check resource ID exists (project_id, task_id, etc.)
- Verify resource belongs to user's company

### Issue: 500 Internal Server Error

**Problem:** Server-side error

**Solution:**
- Check backend logs for detailed error
- Verify database connection (Supabase credentials)
- Check environment variables are set correctly

### Issue: Token Expired

**Problem:** JWT token has expired

**Solution:**
- Re-login to get a new token
- Default expiration is 7 days (configurable via `JWT_EXPIRES_IN`)

---

## Environment Variables for Testing

Make sure your backend `.env` file has:

```env
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key
SUPABASE_ANON_KEY=your-key
JWT_SECRET=your-32-char-minimum-secret
```

---

## Quick Reference

### Base URL
```
http://localhost:5000/api/v1
```

### Common Headers
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Tips for Efficient Testing

1. **Use Environment Variables**: Set up variables for `base_url`, `token`, `company_id`, etc.

2. **Create Folders**: Organize requests by feature (Auth, Projects, Tasks, etc.)

3. **Use Pre-request Scripts**: Automatically set headers and variables

4. **Use Test Scripts**: Auto-save tokens and IDs from responses

5. **Save Examples**: Save example requests/responses for documentation

6. **Use Collection Runner**: Run multiple requests in sequence for integration testing

7. **Export Collection**: Share your collection with team members

---

## Next Steps

After testing all endpoints:

1. Export your Postman collection
2. Share with frontend team for reference
3. Create automated tests using Postman's test runner
4. Set up CI/CD integration tests if needed

---

**Happy Testing! 🚀**

