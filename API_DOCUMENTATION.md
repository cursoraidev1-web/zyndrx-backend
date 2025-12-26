# Zyndrx Backend API Documentation

Complete API reference for frontend integration.

## Base Configuration

- **Base URL**: `http://localhost:5000` (or your server URL)
- **API Version**: `v1`
- **API Prefix**: `/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: Bearer token in `Authorization` header

### Authentication Header Format
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Health Check & Root

### **GET** `/health`
**Description**: Check if API is running  
**Access**: Public  
**Request**: None  
**Response**:
```json
{
  "success": true,
  "message": "Zyndrx API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

### **GET** `/`
**Description**: API directory  
**Access**: Public  
**Request**: None  
**Response**:
```json
{
  "success": true,
  "message": "Welcome to Zyndrx API",
  "version": "v1",
  "endpoints": {
    "health": "/health",
    "auth": "/api/v1/auth",
    "projects": "/api/v1/projects",
    "prds": "/api/v1/prds",
    "tasks": "/api/v1/tasks",
    "github": "/api/v1/github",
    "notifications": "/api/v1/notifications",
    "documents": "/api/v1/documents",
    "analytics": "/api/v1/analytics",
    "teams": "/api/v1/teams"
  }
}
```

---

## 2. Authentication (`/api/v1/auth`)

### **POST** `/api/v1/auth/register`
**Description**: Register a new user  
**Access**: Public  
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "fullName": "John Doe",
  "role": "developer"
}
```
**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Valid Roles** (optional): `"admin" | "product_manager" | "developer" | "qa" | "devops" | "designer"`

**Response**: JWT token and user data

---

### **POST** `/api/v1/auth/login`
**Description**: Login user (Step 1 - returns token or 2FA requirement)  
**Access**: Public  
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```
**Response**: 
- If 2FA disabled: Returns JWT token
- If 2FA enabled: Returns `requires2FA: true` (then call `/2fa/verify`)

---

### **POST** `/api/v1/auth/google`
**Description**: Login or Register with Google OAuth  
**Access**: Public  
**Request Body**:
```json
{
  "accessToken": "<google_oauth_access_token>"
}
```
**Response**: JWT token and user data

---

### **POST** `/api/v1/auth/github`
**Description**: Login or Register with GitHub OAuth  
**Access**: Public  
**Request Body**: None (handled by GitHub OAuth flow)  
**Response**: JWT token and user data

---

### **POST** `/api/v1/auth/forgot-password`
**Description**: Send password reset email  
**Access**: Public  
**Request Body**:
```json
{
  "email": "user@example.com"
}
```
**Response**: Success message

---

### **POST** `/api/v1/auth/reset-password`
**Description**: Reset password using token from email  
**Access**: Public  
**Request Body**:
```json
{
  "password": "NewPassword123",
  "accessToken": "<supabase_reset_token_from_email>"
}
```
**Response**: Success message

---

### **GET** `/api/v1/auth/me`
**Description**: Get current user profile  
**Access**: Private (requires Bearer token)  
**Request**: None  
**Response**: User profile object

---

### **PUT** `/api/v1/auth/profile`
**Description**: Update user profile  
**Access**: Private  
**Request Body**:
```json
{
  "fullName": "John Doe Updated",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```
**Note**: Both fields are optional  
**Response**: Updated user profile

---

### **POST** `/api/v1/auth/logout`
**Description**: Logout user  
**Access**: Private  
**Request**: None  
**Response**: Success message

---

### 2FA Endpoints

### **POST** `/api/v1/auth/2fa/setup`
**Description**: Generate 2FA secret and QR code URL  
**Access**: Private  
**Request**: None  
**Response**: 
```json
{
  "secret": "...",
  "qrCodeUrl": "otpauth://totp/..."
}
```

---

### **POST** `/api/v1/auth/2fa/enable`
**Description**: Verify first code and enable 2FA permanently  
**Access**: Private  
**Request Body**:
```json
{
  "token": "123456"
}
```
**Note**: Token must be exactly 6 digits  
**Response**: Success message

---

### **POST** `/api/v1/auth/2fa/verify`
**Description**: Login Step 2 - Verify 2FA code after password/Google login  
**Access**: Public  
**Request Body**:
```json
{
  "email": "user@example.com",
  "token": "123456"
}
```
**Note**: Token must be exactly 6 digits  
**Response**: Final JWT token

---

## 3. Projects (`/api/v1/projects`)

All endpoints require authentication.

### **POST** `/api/v1/projects`
**Description**: Create a new project  
**Access**: Private  
**Request Body**:
```json
{
  "name": "My Project",
  "description": "Project description",
  "start_date": "2024-01-01T00:00:00.000Z",
  "end_date": "2024-12-31T23:59:59.999Z"
}
```
**Note**: `description`, `start_date`, and `end_date` are optional. Dates must be ISO datetime strings.  
**Response**: Created project object

---

### **GET** `/api/v1/projects`
**Description**: List all projects for current user  
**Access**: Private  
**Request**: None  
**Response**: Array of project objects

---

### **GET** `/api/v1/projects/:id`
**Description**: Get project details  
**Access**: Private  
**Request**: None (ID in URL path)  
**Response**: Project object with details

---

## 4. PRDs (`/api/v1/prds`)

All endpoints require authentication.

### **POST** `/api/v1/prds`
**Description**: Create a new PRD  
**Access**: Private (requires `product_manager` or `admin` role)  
**Request Body**:
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "PRD Title",
  "content": {
    "section1": "content",
    "section2": {
      "nested": "data"
    }
  },
  "version": 1
}
```
**Note**: 
- `project_id` must be a valid UUID
- `content` can be any JSON object structure
- `version` is optional, defaults to 1  
**Response**: Created PRD object

---

### **GET** `/api/v1/prds/:id`
**Description**: Get PRD by ID  
**Access**: Private  
**Request**: None (ID in URL path)  
**Response**: PRD object

---

### **PATCH** `/api/v1/prds/:id/status`
**Description**: Update PRD status (Approve/Reject)  
**Access**: Private (requires `admin` role only)  
**Request Body**:
```json
{
  "status": "draft"
}
```
**Valid Status Values**: `"draft" | "in_review" | "approved" | "rejected"`  
**Response**: Updated PRD object

---

## 5. Tasks (`/api/v1/tasks`)

All endpoints require authentication.

### **GET** `/api/v1/tasks`
**Description**: Get tasks for a project  
**Access**: Private  
**Query Parameters**:
- `project_id` (required): UUID string

**Example**: `GET /api/v1/tasks?project_id=550e8400-e29b-41d4-a716-446655440000`  
**Response**: Array of task objects

---

### **POST** `/api/v1/tasks`
**Description**: Create a new task manually  
**Access**: Private  
**Request Body**:
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Task Title",
  "description": "Task description",
  "priority": "high",
  "assigned_to": "550e8400-e29b-41d4-a716-446655440001",
  "tags": ["tag1", "tag2"]
}
```
**Note**: 
- `project_id` and `title` are required
- `description`, `priority`, `assigned_to`, and `tags` are optional
- `priority` must be: `"low" | "medium" | "high" | "urgent"`
- `assigned_to` must be a valid UUID
- `tags` is an array of strings  
**Response**: Created task object

---

### **PATCH** `/api/v1/tasks/:id`
**Description**: Update task (move card, assign, etc.)  
**Access**: Private  
**Request Body** (all fields optional):
```json
{
  "status": "in_progress",
  "priority": "high",
  "assigned_to": "550e8400-e29b-41d4-a716-446655440001",
  "description": "Updated description"
}
```
**Note**: 
- `status` must be: `"todo" | "in_progress" | "in_review" | "completed" | "blocked"`
- `priority` must be: `"low" | "medium" | "high" | "urgent"`
- `assigned_to` can be `null` to unassign a task
- All fields are optional - only send the fields you want to update  
**Response**: Updated task object

---

## 6. Teams (`/api/v1/teams`)

All endpoints require authentication.

### **POST** `/api/v1/teams/invite`
**Description**: Invite a user to a project  
**Access**: Private  
**Request Body**:
```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "developer"
}
```
**Note**: 
- `projectId` must be a valid UUID
- `email` must be a valid email address
- `role` is optional, defaults to `"developer"`
- Valid roles: `"admin" | "product_manager" | "developer" | "qa" | "devops" | "designer" | "member" | "viewer"`  
**Response**: Invite object

---

### **POST** `/api/v1/teams/accept-invite`
**Description**: Accept a team invitation  
**Access**: Private  
**Request Body**:
```json
{
  "token": "invite-token-string"
}
```
**Note**: `token` is required (minimum 1 character)  
**Response**: Success message

---

### **GET** `/api/v1/teams/:projectId/members`
**Description**: Get all members of a project  
**Access**: Private  
**Request**: None (projectId in URL path)  
**Response**: Array of member objects

---

## 7. Documents (`/api/v1/documents`)

All endpoints require authentication.

### **POST** `/api/v1/documents`
**Description**: Save document metadata  
**Access**: Private  
**Request Body**:
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Document Title",
  "file_url": "https://example.com/file.pdf",
  "file_type": "application/pdf",
  "file_size": 1024000
}
```
**Note**: 
- All fields are required
- `file_size` should be in bytes
- `file_url` should be a valid URL  
**Response**: Created document object

---

### **GET** `/api/v1/documents`
**Description**: Get documents for a project  
**Access**: Private  
**Query Parameters**:
- `project_id` (required): UUID string

**Example**: `GET /api/v1/documents?project_id=550e8400-e29b-41d4-a716-446655440000`  
**Response**: Array of document objects

---

## 8. Notifications (`/api/v1/notifications`)

All endpoints require authentication.

### **GET** `/api/v1/notifications`
**Description**: Get all notifications for current user  
**Access**: Private  
**Request**: None  
**Response**: Array of notification objects

---

### **PATCH** `/api/v1/notifications/:id/read`
**Description**: Mark a notification as read  
**Access**: Private  
**Request**: None (ID in URL path)  
**Response**: Success message

---

### **PATCH** `/api/v1/notifications/mark-all-read`
**Description**: Mark all notifications as read  
**Access**: Private  
**Request**: None  
**Response**: Success message

---

## 9. Analytics (`/api/v1/analytics`)

All endpoints require authentication.

### **GET** `/api/v1/analytics`
**Description**: Get project statistics  
**Access**: Private  
**Query Parameters**:
- `project_id` (required): UUID string

**Example**: `GET /api/v1/analytics?project_id=550e8400-e29b-41d4-a716-446655440000`  
**Response**: Analytics/stats object

---

## 10. GitHub (`/api/v1/github`)

### **POST** `/api/v1/github/webhook`
**Description**: GitHub webhook endpoint (for GitHub integration)  
**Access**: Public (secured by GitHub signature)  
**Request Headers**:
- `x-github-event`: GitHub event type
- `x-hub-signature-256`: GitHub webhook signature

**Request Body**: GitHub webhook payload (varies by event type)  
**Response**: Success message

**Note**: This endpoint is typically called by GitHub, not directly by your frontend. Configure it in your GitHub repository settings.

---

## Error Response Format

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Frontend Implementation Notes

### 1. Token Storage
Store JWT token from login/register responses (typically in localStorage or httpOnly cookie)

### 2. Request Interceptor
Add token to all authenticated requests:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### 3. Error Handling
Handle 401 responses by redirecting to login and clearing stored token

### 4. CORS Configuration
Ensure your frontend URL is in the `ALLOWED_ORIGINS` environment variable on the backend

### 5. Rate Limiting
API has rate limiting (default: 100 requests per 15 minutes). Handle 429 status codes appropriately.

### 6. 2FA Flow
1. User logs in → If 2FA enabled, returns `requires2FA: true`
2. Frontend shows 2FA input → Call `/2fa/verify` with email and code
3. Receive final JWT token

### 7. UUID Format
All IDs are UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### 8. Date Format
All dates should be ISO 8601 datetime strings (e.g., `2024-01-01T00:00:00.000Z`)

### 9. Example Frontend API Client Structure

```javascript
// Example using fetch
const API_BASE_URL = 'http://localhost:5000/api/v1';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized - redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // Auth methods
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials,
    });
  }

  // Project methods
  async getProjects() {
    return this.request('/projects');
  }

  async createProject(projectData) {
    return this.request('/projects', {
      method: 'POST',
      body: projectData,
    });
  }

  // ... other methods
}
```

---

## Quick Reference: Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | Public | Health check |
| GET | `/` | Public | API directory |
| POST | `/api/v1/auth/register` | Public | Register user |
| POST | `/api/v1/auth/login` | Public | Login user |
| POST | `/api/v1/auth/google` | Public | Google OAuth |
| POST | `/api/v1/auth/github` | Public | GitHub OAuth |
| POST | `/api/v1/auth/forgot-password` | Public | Request password reset |
| POST | `/api/v1/auth/reset-password` | Public | Reset password |
| GET | `/api/v1/auth/me` | Private | Get current user |
| PUT | `/api/v1/auth/profile` | Private | Update profile |
| POST | `/api/v1/auth/logout` | Private | Logout |
| POST | `/api/v1/auth/2fa/setup` | Private | Setup 2FA |
| POST | `/api/v1/auth/2fa/enable` | Private | Enable 2FA |
| POST | `/api/v1/auth/2fa/verify` | Public | Verify 2FA code |
| POST | `/api/v1/projects` | Private | Create project |
| GET | `/api/v1/projects` | Private | List projects |
| GET | `/api/v1/projects/:id` | Private | Get project |
| POST | `/api/v1/prds` | Private* | Create PRD |
| GET | `/api/v1/prds/:id` | Private | Get PRD |
| PATCH | `/api/v1/prds/:id/status` | Private** | Update PRD status |
| GET | `/api/v1/tasks` | Private | Get tasks |
| POST | `/api/v1/tasks` | Private | Create task |
| PATCH | `/api/v1/tasks/:id` | Private | Update task |
| POST | `/api/v1/teams/invite` | Private | Invite member |
| POST | `/api/v1/teams/accept-invite` | Private | Accept invite |
| GET | `/api/v1/teams/:projectId/members` | Private | Get members |
| POST | `/api/v1/documents` | Private | Save document |
| GET | `/api/v1/documents` | Private | Get documents |
| GET | `/api/v1/notifications` | Private | Get notifications |
| PATCH | `/api/v1/notifications/:id/read` | Private | Mark read |
| PATCH | `/api/v1/notifications/mark-all-read` | Private | Mark all read |
| GET | `/api/v1/analytics` | Private | Get analytics |
| POST | `/api/v1/github/webhook` | Public | GitHub webhook |

\* Requires `product_manager` or `admin` role  
\** Requires `admin` role only

---

**Last Updated**: Generated from codebase analysis  
**API Version**: v1




