# Frontend Integration Guide

This guide will help you integrate your frontend application with the Zyndrx backend API.

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [API Client Setup](#api-client-setup)
4. [Multi-Company/Workspace Context](#multi-companyworkspace-context)
5. [Subscription & Plan Limits](#subscription--plan-limits)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Error Handling](#error-handling)
8. [Common Integration Patterns](#common-integration-patterns)
9. [Code Examples](#code-examples)

---

## Base Configuration

### Base URL

```
Development: http://localhost:5000/api/v1
Production: https://your-backend-domain.com/api/v1
```

### Content-Type

All requests must include:
```
Content-Type: application/json
```

### Authentication Header

For protected endpoints:
```
Authorization: Bearer <jwt-token>
```

### Environment Variables

Create a `.env` file in your frontend project root:

```env
# Backend API URL (REQUIRED)
REACT_APP_API_URL=http://localhost:5000/api/v1
# or for production:
# REACT_APP_API_URL=https://your-backend-domain.com/api/v1

# OAuth Configuration (OPTIONAL - only if using OAuth)
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_GITHUB_CLIENT_ID=your-github-client-id

# Optional: Frontend URL for OAuth callbacks
REACT_APP_FRONTEND_URL=http://localhost:3000
```

**Note:** For Next.js, use `NEXT_PUBLIC_` prefix instead of `REACT_APP_`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

**Required Environment Variables:**
- `REACT_APP_API_URL` or `NEXT_PUBLIC_API_URL` - **REQUIRED** - Backend API base URL

**Optional Environment Variables:**
- `REACT_APP_GOOGLE_CLIENT_ID` - Only needed if implementing Google OAuth
- `REACT_APP_GITHUB_CLIENT_ID` - Only needed if implementing GitHub OAuth
- `REACT_APP_FRONTEND_URL` - Only needed for OAuth callback URLs

---

## Authentication

### 1. User Registration

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "fullName": "John Doe",
  "companyName": "Acme Corp"  // Required: Creates default workspace
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "developer",
      "avatarUrl": null
    },
    "token": "jwt-token-here",
    "companyId": "uuid",
    "companies": [
      {
        "id": "uuid",
        "name": "Acme Corp",
        "role": "admin"
      }
    ],
    "currentCompany": {
      "id": "uuid",
      "name": "Acme Corp"
    }
  },
  "message": "Registration successful"
}
```

**Important Notes:**
- `companyName` is **required** - it creates the user's default workspace
- User is automatically added as "admin" of the created company
- A free subscription with 30-day trial is automatically created
- Store the `token` in localStorage/sessionStorage
- Store `companyId` for company context

### 2. User Login

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt-token-here",
    "companyId": "uuid",
    "companies": [ /* array of companies */ ],
    "currentCompany": { /* current company object */ }
  }
}
```

**Response (2FA Required):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "require2fa": true
  }
}
```

### 3. Get Current User

**Endpoint:** `GET /api/v1/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "developer",
    "avatarUrl": null
  }
}
```

### 4. OAuth Authentication

#### Google OAuth

**Option 1: Direct Access Token**
```javascript
POST /api/v1/auth/google
{
  "accessToken": "google-access-token-from-client"
}
```

**Option 2: Authorization Code Exchange**
```javascript
POST /api/v1/auth/google
{
  "code": "authorization-code",
  "redirect_uri": "http://localhost:3000/auth/google/callback"
}
```

#### GitHub OAuth

```javascript
POST /api/v1/auth/github
{
  "accessToken": "github-access-token-from-client"
}
```

**Response:** Same format as login response

---

## API Client Setup

### Recommended API Client Structure

```typescript
// api/client.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private companyId: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadFromStorage();
  }

  private loadFromStorage() {
    this.token = localStorage.getItem('zyndrx_token');
    this.companyId = localStorage.getItem('zyndrx_company_id');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('zyndrx_token', token);
  }

  setCompanyId(companyId: string) {
    this.companyId = companyId;
    localStorage.setItem('zyndrx_company_id', companyId);
  }

  clearAuth() {
    this.token = null;
    this.companyId = null;
    localStorage.removeItem('zyndrx_token');
    localStorage.removeItem('zyndrx_company_id');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Optional: Include company context in header (if needed)
    if (this.companyId && options.method !== 'GET') {
      headers['X-Company-ID'] = this.companyId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || 'Request failed', response.status, data);
    }

    return data;
  }

  // Auth methods
  async register(data: RegisterData) {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
      if (response.data.companyId) {
        this.setCompanyId(response.data.companyId);
      }
    }
    
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
      if (response.data.companyId) {
        this.setCompanyId(response.data.companyId);
      }
    }
    
    return response;
  }

  async getCurrentUser() {
    return this.request<User>('/auth/me');
  }

  // Company methods
  async switchCompany(companyId: string) {
    const response = await this.request<SwitchCompanyResponse>('/auth/switch-company', {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
      this.setCompanyId(companyId);
    }
    
    return response;
  }

  async getUserCompanies() {
    return this.request<Company[]>('/companies');
  }

  // Project methods
  async getProjects(filters?: { status?: string; team_name?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.team_name) params.append('team_name', filters.team_name);
    
    const query = params.toString();
    return this.request<Project[]>(`/projects${query ? `?${query}` : ''}`);
  }

  async createProject(data: CreateProjectData) {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(id: string) {
    return this.request<Project>(`/projects/${id}`);
  }

  // Task methods
  async getTasks(projectId: string) {
    return this.request<Task[]>(`/tasks?project_id=${projectId}`);
  }

  async createTask(data: CreateTaskData) {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, updates: Partial<Task>) {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(id: string) {
    return this.request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Subscription methods
  async getSubscription() {
    return this.request<SubscriptionDetails>('/subscription');
  }

  async getPlans() {
    return this.request<Plan[]>('/plans');
  }

  async upgradeSubscription(planType: 'pro' | 'enterprise') {
    return this.request<SubscriptionResponse>('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planType }),
    });
  }

  async checkLimits(resource?: 'project' | 'task' | 'team_member' | 'document') {
    const query = resource ? `?resource=${resource}` : '';
    return this.request<LimitsResponse>(`/subscription/limits${query}`);
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

---

## Multi-Company/Workspace Context

### Understanding Company Context

- Users can belong to **multiple companies/workspaces**
- Each company has **isolated data** (projects, tasks, documents)
- The JWT token includes the **current active company ID**
- Users can **switch between companies**

### Company Switching Flow

```typescript
// 1. Get user's companies
const companies = await apiClient.getUserCompanies();

// 2. Switch company
const response = await apiClient.switchCompany(selectedCompanyId);

// 3. Update token and reload data
if (response.success) {
  // Token is automatically updated in apiClient
  // Reload all company-specific data
  await loadProjects();
  await loadTasks();
  await loadNotifications();
}
```

### Company Switcher Component Example

```typescript
// components/CompanySwitcher.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export const CompanySwitcher = () => {
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await apiClient.getUserCompanies();
      if (response.success) {
        setCompanies(response.data);
        // Get current company from token context
        const currentId = localStorage.getItem('zyndrx_company_id');
        const current = response.data.find(c => c.id === currentId);
        setCurrentCompany(current || response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load companies', error);
    }
  };

  const handleSwitch = async (companyId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.switchCompany(companyId);
      if (response.success) {
        setCurrentCompany(response.data.company);
        // Reload all data for new company
        window.location.reload(); // Or use your state management to reload
      }
    } catch (error) {
      console.error('Failed to switch company', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={currentCompany?.id || ''}
      onChange={(e) => handleSwitch(e.target.value)}
      disabled={loading}
    >
      {companies.map(company => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>
  );
};
```

---

## Subscription & Plan Limits

### Understanding Plan Limits

The backend enforces plan limits before allowing resource creation:

- **Free Plan:** 3 projects, 50 tasks, 5 team members, 20 documents, 1 GB storage
- **Pro Plan:** Unlimited projects/tasks/documents, 25 team members, 50 GB storage
- **Enterprise Plan:** Unlimited everything

### Checking Limits Before Creation

```typescript
// Before creating a project
const limitsCheck = await apiClient.checkLimits('project');
if (!limitsCheck.data.canCreate.project) {
  // Show upgrade prompt
  showUpgradeModal('projects');
  return;
}

// Create project
await apiClient.createProject(projectData);
```

### Handling Limit Errors

```typescript
try {
  await apiClient.createProject(projectData);
} catch (error) {
  if (error instanceof ApiError && error.status === 403) {
    // Plan limit reached
    const message = error.data?.error || 'Plan limit reached';
    showUpgradePrompt(message);
  } else {
    // Other error
    showError(error.message);
  }
}
```

### Subscription Status Component

```typescript
// components/SubscriptionStatus.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export const SubscriptionStatus = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await apiClient.getSubscription();
      if (response.success) {
        setSubscription(response.data.subscription);
      }
    } catch (error) {
      console.error('Failed to load subscription', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!subscription) return null;

  const { plan, limits, usage } = subscription;

  return (
    <div>
      <h3>Current Plan: {plan.name}</h3>
      <p>Status: {plan.status}</p>
      
      {plan.status === 'trial' && plan.trialEndDate && (
        <p>
          Trial ends: {new Date(plan.trialEndDate).toLocaleDateString()}
        </p>
      )}

      <div>
        <h4>Usage</h4>
        <p>Projects: {usage.projectsCount} / {limits.maxProjects === -1 ? '∞' : limits.maxProjects}</p>
        <p>Tasks: {usage.tasksCount} / {limits.maxTasks === -1 ? '∞' : limits.maxTasks}</p>
        <p>Team Members: {usage.teamMembersCount} / {limits.maxTeamMembers === -1 ? '∞' : limits.maxTeamMembers}</p>
      </div>

      {plan.status === 'trial' && (
        <button onClick={() => showUpgradeModal()}>
          Upgrade Now
        </button>
      )}
    </div>
  );
};
```

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login user |
| GET | `/auth/me` | Yes | Get current user |
| PUT | `/auth/profile` | Yes | Update profile |
| POST | `/auth/logout` | Yes | Logout |
| POST | `/auth/google` | No | Google OAuth |
| POST | `/auth/github` | No | GitHub OAuth |
| POST | `/auth/switch-company` | Yes | Switch active company |

### Companies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/companies` | Yes | Get user's companies |
| POST | `/companies` | Yes | Create company |
| GET | `/companies/:id` | Yes | Get company details |
| POST | `/companies/:id/invite` | Yes | Invite user to company |
| POST | `/companies/accept-invite` | No | Accept invitation |
| PATCH | `/companies/:id/members/:userId` | Yes | Update member role |
| DELETE | `/companies/:id/members/:userId` | Yes | Remove member |

### Projects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/projects` | Yes | Get all projects |
| GET | `/projects/:id` | Yes | Get project details |
| POST | `/projects` | Yes | Create project |
| PATCH | `/projects/:id` | Yes | Update project |
| DELETE | `/projects/:id` | Yes | Delete project |

### Tasks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tasks?project_id=:id` | Yes | Get tasks by project |
| POST | `/tasks` | Yes | Create task |
| PATCH | `/tasks/:id` | Yes | Update task |
| DELETE | `/tasks/:id` | Yes | Delete task |

### Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/documents?project_id=:id` | Yes | Get documents |
| POST | `/documents` | Yes | Create document |
| DELETE | `/documents/:id` | Yes | Delete document |

### Subscriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/subscription` | Yes | Get current subscription |
| GET | `/subscription/limits` | Yes | Check limits and usage |
| POST | `/subscription/upgrade` | Yes | Upgrade subscription |
| POST | `/subscription/cancel` | Yes | Cancel subscription |
| GET | `/plans` | No | Get available plans |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Yes | Get notifications |
| PATCH | `/notifications/:id/read` | Yes | Mark as read |
| PATCH | `/notifications/mark-all-read` | Yes | Mark all as read |

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Error with Additional Data

```json
{
  "success": false,
  "error": "Plan limit reached",
  "limitType": "projects",
  "currentUsage": 3,
  "maxLimit": 3
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (plan limit, permission denied)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

### Error Handling Example

```typescript
async function handleApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle specific error types
      if (error.status === 401) {
        // Token expired or invalid
        apiClient.clearAuth();
        redirectToLogin();
        return { error: 'Session expired. Please login again.' };
      } else if (error.status === 403) {
        // Plan limit or permission denied
        return { error: error.message };
      } else if (error.status === 404) {
        return { error: 'Resource not found' };
      }
    }
    
    return { error: error.message || 'An unexpected error occurred' };
  }
}
```

---

## Common Integration Patterns

### 1. Protected Route Wrapper

```typescript
// components/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export const ProtectedRoute = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success) {
        setAuthenticated(true);
      } else {
        redirectToLogin();
      }
    } catch (error) {
      redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!authenticated) return null;

  return children;
};
```

### 2. Data Fetching Hook

```typescript
// hooks/useProjects.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export const useProjects = (filters?: { status?: string; team_name?: string }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, [filters?.status, filters?.team_name]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProjects(filters);
      if (response.success) {
        setProjects(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { projects, loading, error, refetch: loadProjects };
};
```

### 3. Form Submission with Error Handling

```typescript
// components/CreateProjectForm.tsx
import { useState } from 'react';
import { apiClient } from '../api/client';

export const CreateProjectForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    team_name: 'Engineering',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check limits first
      const limitsCheck = await apiClient.checkLimits('project');
      if (!limitsCheck.data.canCreate.project) {
        setError('Plan limit reached. Please upgrade to create more projects.');
        setLoading(false);
        return;
      }

      const response = await apiClient.createProject(formData);
      if (response.success) {
        onSuccess(response.data);
        // Reset form
        setFormData({
          name: '',
          description: '',
          start_date: '',
          end_date: '',
          team_name: 'Engineering',
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create project');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
};
```

---

## Code Examples

### Complete Registration Flow

```typescript
// pages/Register.tsx
import { useState } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.register(formData);
      if (response.success) {
        // Store user data in context/state
        // Token and companyId are automatically stored in apiClient
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Full Name"
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Company/Workspace Name"
        value={formData.companyName}
        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};
```

### Task Management Example

```typescript
// components/TaskList.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export const TaskList = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      const response = await apiClient.getTasks(projectId);
      if (response.success) {
        setTasks(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await apiClient.updateTask(taskId, { status: newStatus });
      if (response.success) {
        // Update local state
        setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      }
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>Status: {task.status}</p>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(task.id, e.target.value)}
          >
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      ))}
    </div>
  );
};
```

---

## Important Notes

### 1. Company Context is Critical

- **Always** ensure company context is set before making data requests
- The JWT token includes `companyId` - backend automatically filters by company
- When switching companies, **reload all data** to reflect the new company's data

### 2. Plan Limits

- Backend **enforces limits** before resource creation
- Always check limits before showing create buttons/forms
- Show upgrade prompts when limits are reached
- Trial period: 30 days for new users on Free plan

### 3. Task Status Values

- Backend uses: `todo`, `in_progress`, `in_review`, `completed`
- Frontend can normalize: `in-progress` ↔ `in_progress`, `in-review` ↔ `in_review`
- API accepts both formats, but backend stores as `in_progress` and `in_review`

### 4. Date Formats

- All dates should be in **ISO 8601 format**: `2024-01-01T00:00:00Z`
- Use `new Date().toISOString()` for current timestamp

### 5. Error Handling

- Always handle 401 errors (unauthorized) - redirect to login
- Handle 403 errors (forbidden) - show appropriate message (plan limit, permission)
- Handle 404 errors (not found) - show not found message
- Always show user-friendly error messages

### 6. Token Management

- Store token in `localStorage` or `sessionStorage`
- Include token in `Authorization` header for all protected requests
- Clear token on logout
- Handle token expiration (401 response)

---

## Support

For questions or issues:
- Check the API documentation
- Review error messages carefully
- Ensure company context is set correctly
- Verify plan limits before resource creation

---

**Last Updated:** 2024-01-XX
**API Version:** v1

