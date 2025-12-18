# 🔗 GITHUB INTEGRATION MODULE - COMPLETE GUIDE

## 📋 **OVERVIEW**

The GitHub integration module allows you to:
- ✅ Connect GitHub repositories to projects
- ✅ Receive webhook events (push, commits)
- ✅ Track commits automatically
- ✅ Link commits to tasks
- ✅ View commit history

---

## 🛠️ **API ENDPOINTS**

### **1. Create GitHub Integration**

**POST** `/github/integrations`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "projectId": "project-uuid",
  "repositoryUrl": "https://github.com/username/repo-name",
  "accessToken": "ghp_yourGitHubPersonalAccessToken",
  "webhookSecret": "optional-custom-secret"
}
```

**Response:**
```json
{
  "success": true,
  "message": "GitHub integration created successfully",
  "data": {
    "id": "integration-uuid",
    "projectId": "project-uuid",
    "repositoryUrl": "https://github.com/username/repo-name",
    "webhookSecret": "generated-or-custom-secret",
    "isActive": true,
    "createdAt": "2025-12-13T23:00:00.000Z"
  }
}
```

**Notes:**
- Only project owners/admins can create integrations
- Webhook secret is auto-generated if not provided
- Access token is optional (needed for advanced features like reading PR data)

---

### **2. Get Project Integration**

**GET** `/github/integrations/:projectId`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "success": true,
  "message": "GitHub integration retrieved successfully",
  "data": {
    "id": "integration-uuid",
    "projectId": "project-uuid",
    "repositoryUrl": "https://github.com/username/repo-name",
    "isActive": true,
    "createdAt": "2025-12-13T23:00:00.000Z"
  }
}
```

**Note:** Sensitive data (access token, webhook secret) is not exposed in GET requests.

---

### **3. Update GitHub Integration**

**PUT** `/github/integrations/:id`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "repositoryUrl": "https://github.com/username/new-repo",
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "GitHub integration updated successfully",
  "data": {
    "id": "integration-uuid",
    "projectId": "project-uuid",
    "repositoryUrl": "https://github.com/username/new-repo",
    "isActive": false,
    "updatedAt": "2025-12-13T23:30:00.000Z"
  }
}
```

---

### **4. Delete GitHub Integration**

**DELETE** `/github/integrations/:id`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "success": true,
  "message": "GitHub integration deleted successfully",
  "data": {
    "message": "GitHub integration deleted successfully"
  }
}
```

---

### **5. Handle GitHub Webhook** (PUBLIC ENDPOINT)

**POST** `/github/webhook/:projectId`

**Headers:**
```
Content-Type: application/json
X-Hub-Signature-256: sha256=signature-from-github
```

**Body (GitHub sends this automatically):**
```json
{
  "ref": "refs/heads/main",
  "commits": [
    {
      "id": "abc123def456",
      "message": "feat: add user login [task-uuid]",
      "timestamp": "2025-12-13T23:00:00Z",
      "author": {
        "name": "John Developer",
        "email": "john@example.com"
      },
      "url": "https://github.com/username/repo/commit/abc123"
    }
  ],
  "repository": {
    "name": "repo-name",
    "full_name": "username/repo-name",
    "html_url": "https://github.com/username/repo-name"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "message": "Webhook processed successfully",
    "commits": [
      {
        "id": "commit-record-uuid",
        "commitSha": "abc123def456",
        "message": "feat: add user login [task-uuid]",
        "author": "John Developer",
        "taskId": "task-uuid-if-found"
      }
    ]
  }
}
```

**How it works:**
1. GitHub sends push events to this endpoint
2. System verifies webhook signature
3. Extracts commits from payload
4. Stores commits in database
5. Auto-links commits to tasks if task UUID found in message

---

### **6. Get Commits**

**GET** `/github/commits?projectId=xxx&taskId=yyy&page=1&limit=20`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Parameters:**
- `projectId` (optional) - Filter by project
- `taskId` (optional) - Filter by task
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Commits retrieved successfully",
  "data": [
    {
      "id": "commit-record-uuid",
      "integrationId": "integration-uuid",
      "taskId": "task-uuid",
      "task": {
        "id": "task-uuid",
        "title": "Implement user login",
        "status": "completed"
      },
      "commitSha": "abc123def456",
      "message": "feat: add user login [task-uuid]",
      "author": "John Developer",
      "committedAt": "2025-12-13T23:00:00Z",
      "createdAt": "2025-12-13T23:01:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### **7. Link Commit to Task**

**PATCH** `/github/commits/:id/link`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "taskId": "task-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Commit linked to task successfully",
  "data": {
    "id": "commit-record-uuid",
    "taskId": "task-uuid",
    "commitSha": "abc123def456",
    "message": "feat: add user login",
    "author": "John Developer"
  }
}
```

---

## ⚙️ **GITHUB WEBHOOK SETUP**

### **Step 1: Create Integration in Zyndrx**
1. POST to `/github/integrations`
2. Save the `webhookSecret` from response

### **Step 2: Configure GitHub Webhook**
1. Go to your GitHub repo → **Settings** → **Webhooks**
2. Click **Add webhook**
3. **Payload URL:** `http://your-domain.com/api/v1/github/webhook/:projectId`
   - Replace `:projectId` with actual project UUID
   - Example: `https://api.zyndrx.com/api/v1/github/webhook/abc-123-def-456`
4. **Content type:** `application/json`
5. **Secret:** Enter the `webhookSecret` from Step 1
6. **Which events?** Select "Just the push event"
7. Click **Add webhook**

### **Step 3: Test**
1. Make a commit to your repo
2. GitHub will send webhook to your API
3. Check commits: GET `/github/commits?projectId=xxx`

---

## 🎯 **AUTO-LINKING COMMITS TO TASKS**

### **Method 1: Include Task UUID in Commit Message**

```bash
# Format: Include [task-uuid] anywhere in commit message
git commit -m "feat: add login feature [abc-123-def-456]"
git commit -m "fix: resolve bug #abc-123-def-456"
git commit -m "[abc-123-def-456] implement user registration"
```

**The system will:**
1. Extract UUID from commit message
2. Verify task exists in the project
3. Auto-link commit to task

### **Method 2: Manual Linking**

```bash
# After commit is tracked
PATCH /github/commits/:commitId/link
{
  "taskId": "task-uuid"
}
```

---

## 🔐 **WEBHOOK SIGNATURE VERIFICATION**

The system automatically verifies GitHub webhook signatures using HMAC-SHA256:

1. GitHub signs payload with `webhookSecret`
2. Sends signature in `X-Hub-Signature-256` header
3. System verifies signature matches
4. Rejects requests with invalid signatures

**This ensures:**
- ✅ Webhooks come from GitHub
- ✅ Payload hasn't been tampered with
- ✅ Protection from replay attacks

---

## 🧪 **TESTING WORKFLOW**

### **Complete Test Sequence:**

```
1. POST /github/integrations
   → Save integrationId and webhookSecret

2. Configure GitHub webhook in repo settings

3. Make a test commit:
   git commit -m "test: webhook integration [task-uuid]"
   git push

4. GET /github/commits?projectId=xxx
   → Verify commit was tracked

5. Check if commit was auto-linked to task

6. If not auto-linked, manually link:
   PATCH /github/commits/:commitId/link
   { "taskId": "task-uuid" }

7. GET /tasks/:taskId
   → Verify commit shows in task details
```

---

## 📊 **USE CASES**

### **1. Track Team Contributions**
- See who committed what
- Link commits to specific tasks
- View commit history per project

### **2. Auto-Update Task Status**
- Commits with task UUID auto-link
- Track progress via commits
- See commit count per task

### **3. Audit Trail**
- All commits stored
- Author information preserved
- Timestamp tracking

### **4. Integration with CI/CD**
- Webhook triggers on every push
- Can extend to trigger deployments
- Link deployments to commits

---

## 🎨 **COMMIT MESSAGE CONVENTIONS**

Recommended format:

```bash
# Feature
git commit -m "feat: add user authentication [task-uuid]"

# Bug fix
git commit -m "fix: resolve login error [task-uuid]"

# Update
git commit -m "update: improve error handling [task-uuid]"

# Documentation
git commit -m "docs: add API documentation [task-uuid]"

# Refactor
git commit -m "refactor: optimize database queries [task-uuid]"
```

---

## ⚠️ **IMPORTANT NOTES**

1. **Webhook Secret:**
   - Keep it secure
   - Don't commit to version control
   - Regenerate if compromised

2. **Access Token:**
   - Optional for basic webhook tracking
   - Required for advanced features (reading PRs, issues)
   - Use GitHub Personal Access Token
   - Store securely

3. **Permissions:**
   - Only owners/admins can create integrations
   - All project members can view commits
   - All project members can link commits to tasks

4. **Rate Limits:**
   - GitHub webhooks are unlimited
   - API rate limits apply to manual operations

---

## 🔄 **FUTURE ENHANCEMENTS**

Potential features to add:

- [ ] Pull Request tracking
- [ ] Issue tracking
- [ ] Branch management
- [ ] Deployment status updates
- [ ] Code review comments
- [ ] Release notes generation
- [ ] Commit statistics & graphs

---

**🚀 Your GitHub integration is now complete and ready to use!**
