# Frontend API Integration Guide

Complete guide for integrating your frontend with the Zyndrx backend API.

## Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Authentication](#authentication)
3. [API Client Setup](#api-client-setup)
4. [Endpoints Reference](#endpoints-reference)
5. [Integration Examples](#integration-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Setup & Configuration

### Base URL
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_VERSION = 'v1';
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;
```

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```typescript
const token = localStorage.getItem('token'); // or from your auth context

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```

### Getting the Token
After login, store the token:
```typescript
// After successful login
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('token', data.data.token);
  localStorage.setItem('user', JSON.stringify(data.data.user));
}
```

---

## API Client Setup

### Recommended: Create an API Client

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_VERSION = 'v1';
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data.data;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_URL}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
```

---

## Endpoints Reference

### 1. PRD Endpoints

#### List PRDs
```typescript
// GET /api/v1/prds?project_id=uuid (optional)
const prds = await apiClient.get<PRD[]>('/prds', { project_id: projectId });
// or all PRDs
const allPrds = await apiClient.get<PRD[]>('/prds');
```

#### Get Single PRD
```typescript
// GET /api/v1/prds/:id
const prd = await apiClient.get<PRD>(`/prds/${prdId}`);
```

#### Create PRD
```typescript
// POST /api/v1/prds
const newPRD = await apiClient.post<PRD>('/prds', {
  project_id: projectId,
  title: 'New Feature PRD',
  content: {
    overview: 'Product overview',
    features: [
      {
        name: 'Feature 1',
        description: 'Feature description'
      }
    ]
  }
});
```

#### Update PRD
```typescript
// PATCH /api/v1/prds/:id
const updatedPRD = await apiClient.patch<PRD>(`/prds/${prdId}`, {
  title: 'Updated Title',
  content: { /* updated content */ }
});
```

#### Delete PRD
```typescript
// DELETE /api/v1/prds/:id
await apiClient.delete(`/prds/${prdId}`);
```

#### Create PRD Version
```typescript
// POST /api/v1/prds/:id/versions
const version = await apiClient.post(`/prds/${prdId}/versions`, {
  title: 'Version 2',
  content: { /* new content */ },
  changes_summary: 'Updated features list'
});
```

#### Get PRD Versions
```typescript
// GET /api/v1/prds/:id/versions
const versions = await apiClient.get(`/prds/${prdId}/versions`);
```

---

### 2. Project Endpoints

#### List Projects
```typescript
// GET /api/v1/projects
const projects = await apiClient.get<Project[]>('/projects');
```

#### Get Single Project
```typescript
// GET /api/v1/projects/:id
const project = await apiClient.get<Project>(`/projects/${projectId}`);
```

#### Create Project
```typescript
// POST /api/v1/projects
const newProject = await apiClient.post<Project>('/projects', {
  name: 'New Project',
  description: 'Project description',
  team_name: 'Engineering',
  start_date: '2024-01-01',
  end_date: '2024-12-31'
});
```

#### Update Project
```typescript
// PATCH /api/v1/projects/:id
const updatedProject = await apiClient.patch<Project>(`/projects/${projectId}`, {
  name: 'Updated Name',
  description: 'Updated description',
  status: 'active',
  team_name: 'Design'
});
```

#### Delete Project
```typescript
// DELETE /api/v1/projects/:id
await apiClient.delete(`/projects/${projectId}`);
```

#### Get Project Members
```typescript
// GET /api/v1/projects/:id/members
const members = await apiClient.get(`/projects/${projectId}/members`);
```

#### Add Project Member
```typescript
// POST /api/v1/projects/:id/members
const member = await apiClient.post(`/projects/${projectId}/members`, {
  user_id: userId,
  role: 'developer'
});
```

#### Remove Project Member
```typescript
// DELETE /api/v1/projects/:id/members/:userId
await apiClient.delete(`/projects/${projectId}/members/${userId}`);
```

---

### 3. Task Endpoints

#### List Tasks
```typescript
// GET /api/v1/tasks?project_id=uuid
const tasks = await apiClient.get<Task[]>('/tasks', { project_id: projectId });
// or all tasks for company/user
const allTasks = await apiClient.get<Task[]>('/tasks');
```

#### Get Single Task
```typescript
// GET /api/v1/tasks/:id
const task = await apiClient.get<Task>(`/tasks/${taskId}`);
```

#### Create Task
```typescript
// POST /api/v1/tasks
const newTask = await apiClient.post<Task>('/tasks', {
  project_id: projectId,
  title: 'New Task',
  description: 'Task description',
  priority: 'high',
  assigned_to: userId,
  tags: ['frontend', 'urgent']
});
```

#### Update Task
```typescript
// PATCH /api/v1/tasks/:id
const updatedTask = await apiClient.patch<Task>(`/tasks/${taskId}`, {
  status: 'in_progress',
  assigned_to: newUserId,
  priority: 'urgent'
});
```

#### Delete Task
```typescript
// DELETE /api/v1/tasks/:id
await apiClient.delete(`/tasks/${taskId}`);
```

---

### 4. Task Comments

#### Get Comments
```typescript
// GET /api/v1/comments?resource_type=task&resource_id=uuid
const comments = await apiClient.get<Comment[]>('/comments', {
  resource_type: 'task',
  resource_id: taskId
});
```

#### Create Comment
```typescript
// POST /api/v1/comments
const comment = await apiClient.post<Comment>('/comments', {
  resource_type: 'task',
  resource_id: taskId,
  project_id: projectId,
  content: 'This is a comment',
  parent_id: parentCommentId // optional, for threading
});
```

#### Update Comment
```typescript
// PATCH /api/v1/comments/:id
const updatedComment = await apiClient.patch<Comment>(`/comments/${commentId}`, {
  content: 'Updated comment text'
});
```

#### Delete Comment
```typescript
// DELETE /api/v1/comments/:id
await apiClient.delete(`/comments/${commentId}`);
```

---

### 5. Task Attachments

#### Get Upload Token
```typescript
// POST /api/v1/tasks/:taskId/attachments/upload-token
const tokenData = await apiClient.post(`/tasks/${taskId}/attachments/upload-token`, {
  task_id: taskId,
  file_name: 'document.pdf',
  file_size: 1024000,
  file_type: 'application/pdf'
});

// tokenData contains: { upload_path, expires_at, max_file_size }
```

#### Upload File (to Supabase Storage)
```typescript
// After getting upload token, upload directly to Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Upload file
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('task-attachments')
  .upload(tokenData.upload_path, file, {
    contentType: file.type,
    upsert: false
  });

if (uploadError) throw uploadError;

// Get public URL
const { data: urlData } = supabase.storage
  .from('task-attachments')
  .getPublicUrl(tokenData.upload_path);
```

#### Save Attachment Metadata
```typescript
// POST /api/v1/tasks/:taskId/attachments
const attachment = await apiClient.post(`/tasks/${taskId}/attachments`, {
  task_id: taskId,
  project_id: projectId,
  file_name: file.name,
  file_path: tokenData.upload_path,
  file_url: urlData.publicUrl,
  file_type: file.type,
  file_size: file.size
});
```

#### List Attachments
```typescript
// GET /api/v1/tasks/:taskId/attachments
const attachments = await apiClient.get(`/tasks/${taskId}/attachments`);
```

#### Download Attachment
```typescript
// GET /api/v1/tasks/attachments/:id/download
const downloadData = await apiClient.get(`/tasks/attachments/${attachmentId}/download`);
// downloadData contains: { download_url, expires_at }
// Use download_url to download the file
window.open(downloadData.download_url, '_blank');
```

#### Delete Attachment
```typescript
// DELETE /api/v1/tasks/attachments/:id
await apiClient.delete(`/tasks/attachments/${attachmentId}`);
```

---

### 6. Document Endpoints

#### List Documents
```typescript
// GET /api/v1/documents?project_id=uuid
const documents = await apiClient.get<Document[]>('/documents', {
  project_id: projectId
});
```

#### Get Single Document
```typescript
// GET /api/v1/documents/:id
const document = await apiClient.get<Document>(`/documents/${documentId}`);
```

#### Get Upload Token
```typescript
// POST /api/v1/documents/upload-token
const tokenData = await apiClient.post('/documents/upload-token', {
  project_id: projectId,
  file_name: 'document.pdf',
  file_size: 1024000,
  file_type: 'application/pdf'
});
```

#### Save Document Metadata
```typescript
// POST /api/v1/documents
const document = await apiClient.post<Document>('/documents', {
  project_id: projectId,
  title: 'Document Title',
  file_path: tokenData.upload_path,
  file_type: 'application/pdf',
  file_size: 1024000,
  tags: ['important', 'reference']
});
```

#### Update Document
```typescript
// PATCH /api/v1/documents/:id
const updatedDoc = await apiClient.patch<Document>(`/documents/${documentId}`, {
  title: 'Updated Title',
  tags: ['updated', 'tags']
});
```

#### Download Document
```typescript
// GET /api/v1/documents/:id/download
const downloadData = await apiClient.get(`/documents/${documentId}/download`);
window.open(downloadData.download_url, '_blank');
```

#### Delete Document
```typescript
// DELETE /api/v1/documents/:id
await apiClient.delete(`/documents/${documentId}`);
```

---

### 7. Handoffs Endpoints

#### List Handoffs
```typescript
// GET /api/v1/handoffs?project_id=uuid&status=pending&user_id=uuid
const handoffs = await apiClient.get<Handoff[]>('/handoffs', {
  project_id: projectId,
  status: 'pending'
});
```

#### Get Single Handoff
```typescript
// GET /api/v1/handoffs/:id
const handoff = await apiClient.get<Handoff>(`/handoffs/${handoffId}`);
```

#### Create Handoff
```typescript
// POST /api/v1/handoffs
const handoff = await apiClient.post<Handoff>('/handoffs', {
  project_id: projectId,
  to_user_id: userId,
  title: 'Handoff Title',
  description: 'Handoff description',
  priority: 'high',
  due_date: '2024-12-31T23:59:59Z'
});
```

#### Update Handoff
```typescript
// PATCH /api/v1/handoffs/:id
const updatedHandoff = await apiClient.patch<Handoff>(`/handoffs/${handoffId}`, {
  title: 'Updated Title',
  status: 'in_review'
});
```

#### Delete Handoff
```typescript
// DELETE /api/v1/handoffs/:id
await apiClient.delete(`/handoffs/${handoffId}`);
```

#### Approve Handoff
```typescript
// POST /api/v1/handoffs/:id/approve
const approvedHandoff = await apiClient.post<Handoff>(`/handoffs/${handoffId}/approve`, {});
```

#### Reject Handoff
```typescript
// POST /api/v1/handoffs/:id/reject
const rejectedHandoff = await apiClient.post<Handoff>(`/handoffs/${handoffId}/reject`, {
  reason: 'Needs more information'
});
```

---

### 8. Teams Endpoints

#### List Teams
```typescript
// GET /api/v1/teams
const teams = await apiClient.get<Team[]>('/teams');
```

#### Get Single Team
```typescript
// GET /api/v1/teams/:id
const team = await apiClient.get<Team>(`/teams/${teamId}`);
```

#### Create Team
```typescript
// POST /api/v1/teams
const team = await apiClient.post<Team>('/teams', {
  name: 'Engineering Team',
  description: 'Main engineering team',
  team_lead_id: leadUserId
});
```

#### Update Team
```typescript
// PATCH /api/v1/teams/:id
const updatedTeam = await apiClient.patch<Team>(`/teams/${teamId}`, {
  name: 'Updated Team Name',
  team_lead_id: newLeadUserId
});
```

#### Delete Team
```typescript
// DELETE /api/v1/teams/:id
await apiClient.delete(`/teams/${teamId}`);
```

#### Get Team Members
```typescript
// GET /api/v1/teams/:id/members
const members = await apiClient.get(`/teams/${teamId}/members`);
```

#### Add Team Member
```typescript
// POST /api/v1/teams/:id/members
const member = await apiClient.post(`/teams/${teamId}/members`, {
  user_id: userId,
  role: 'developer'
});
```

#### Remove Team Member
```typescript
// DELETE /api/v1/teams/:id/members/:userId
await apiClient.delete(`/teams/${teamId}/members/${userId}`);
```

---

### 9. Activity Feed

#### Get Activity Feed
```typescript
// GET /api/v1/activity?project_id=uuid&type=task&user_id=uuid&limit=50
const activities = await apiClient.get<Activity[]>('/activity', {
  project_id: projectId,
  type: 'task', // optional: 'task', 'prd', 'comment', 'file', 'handoff'
  limit: '50'
});
```

---

### 10. Analytics Endpoints

#### Get Full Analytics
```typescript
// GET /api/v1/analytics?project_id=uuid
const analytics = await apiClient.get('/analytics', { project_id: projectId });
// Returns: { kpiCards, projectProgress, teamPerformance, taskAnalytics, documents, prds }
```

#### Get KPI Cards
```typescript
// GET /api/v1/analytics/kpi?project_id=uuid
const kpis = await apiClient.get('/analytics/kpi', { project_id: projectId });
```

#### Get Project Progress
```typescript
// GET /api/v1/analytics/progress?project_id=uuid
const progress = await apiClient.get('/analytics/progress', { project_id: projectId });
```

#### Get Team Performance
```typescript
// GET /api/v1/analytics/team-performance?project_id=uuid
const performance = await apiClient.get('/analytics/team-performance', { project_id: projectId });
```

#### Get Task Analytics
```typescript
// GET /api/v1/analytics/tasks?project_id=uuid
const taskAnalytics = await apiClient.get('/analytics/tasks', { project_id: projectId });
```

---

## Integration Examples

### React Hook for PRDs

```typescript
// hooks/usePRDs.ts
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface PRD {
  id: string;
  title: string;
  content: any;
  status: string;
  project_id: string;
  created_at: string;
}

export const usePRDs = (projectId?: string) => {
  const [prds, setPrds] = useState<PRD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPRDs = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = projectId ? { project_id: projectId } : undefined;
        const data = await apiClient.get<PRD[]>('/prds', params);
        setPrds(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch PRDs');
      } finally {
        setLoading(false);
      }
    };

    fetchPRDs();
  }, [projectId]);

  const createPRD = async (data: { project_id: string; title: string; content: any }) => {
    try {
      const newPRD = await apiClient.post<PRD>('/prds', data);
      setPrds([newPRD, ...prds]);
      return newPRD;
    } catch (err) {
      throw err;
    }
  };

  const updatePRD = async (id: string, updates: { title?: string; content?: any }) => {
    try {
      const updated = await apiClient.patch<PRD>(`/prds/${id}`, updates);
      setPrds(prds.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deletePRD = async (id: string) => {
    try {
      await apiClient.delete(`/prds/${id}`);
      setPrds(prds.filter(p => p.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { prds, loading, error, createPRD, updatePRD, deletePRD };
};
```

### React Hook for Tasks with Comments

```typescript
// hooks/useTasks.ts
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export const useTasks = (projectId?: string) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const params = projectId ? { project_id: projectId } : undefined;
        const data = await apiClient.get('/tasks', params);
        setTasks(data);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId]);

  const getTaskComments = async (taskId: string) => {
    return await apiClient.get('/comments', {
      resource_type: 'task',
      resource_id: taskId
    });
  };

  const addComment = async (taskId: string, projectId: string, content: string) => {
    return await apiClient.post('/comments', {
      resource_type: 'task',
      resource_id: taskId,
      project_id: projectId,
      content
    });
  };

  return { tasks, loading, getTaskComments, addComment };
};
```

### File Upload Example

```typescript
// utils/fileUpload.ts
import { apiClient } from '@/lib/api-client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const uploadTaskAttachment = async (
  taskId: string,
  projectId: string,
  file: File
) => {
  try {
    // 1. Get upload token
    const tokenData = await apiClient.post(`/tasks/${taskId}/attachments/upload-token`, {
      task_id: taskId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type
    });

    // 2. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(tokenData.upload_path, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 3. Get public URL
    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(tokenData.upload_path);

    // 4. Save metadata
    const attachment = await apiClient.post(`/tasks/${taskId}/attachments`, {
      task_id: taskId,
      project_id: projectId,
      file_name: file.name,
      file_path: tokenData.upload_path,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size
    });

    return attachment;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

---

## Error Handling

### Standard Error Response Format
```typescript
{
  success: false,
  error: "Error message here"
}
```

### Error Handling Utility
```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  return 'An unexpected error occurred';
};

// Usage
try {
  await apiClient.post('/prds', data);
} catch (error) {
  const errorMessage = handleApiError(error);
  toast.error(errorMessage);
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `413` - Payload Too Large (file size limit)
- `500` - Internal Server Error

---

## Best Practices

### 1. Always Handle Loading States
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

try {
  setLoading(true);
  const data = await apiClient.get('/endpoint');
  // handle data
} catch (err) {
  setError(handleApiError(err));
} finally {
  setLoading(false);
}
```

### 2. Use React Query or SWR for Caching
```typescript
// Using React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const usePRDs = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: prds, isLoading } = useQuery({
    queryKey: ['prds', projectId],
    queryFn: () => apiClient.get('/prds', projectId ? { project_id: projectId } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/prds', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prds'] });
    },
  });

  return { prds, isLoading, createPRD: createMutation.mutate };
};
```

### 3. Implement Retry Logic for Failed Requests
```typescript
const retryRequest = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 4. Validate Data Before Sending
```typescript
// Use Zod for validation
import { z } from 'zod';

const createPRDSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(3),
  content: z.object({}),
});

const createPRD = async (data: unknown) => {
  const validated = createPRDSchema.parse(data);
  return await apiClient.post('/prds', validated);
};
```

### 5. Implement Request Cancellation
```typescript
useEffect(() => {
  const abortController = new AbortController();

  const fetchData = async () => {
    try {
      const response = await fetch(url, {
        signal: abortController.signal
      });
      // handle response
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
      }
    }
  };

  fetchData();

  return () => {
    abortController.abort();
  };
}, [url]);
```

---

## TypeScript Types

### Recommended Type Definitions

```typescript
// types/api.ts
export interface PRD {
  id: string;
  project_id: string;
  title: string;
  content: any;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  created_by: string;
  tags: string[];
  assignee?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface Comment {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

export interface Handoff {
  id: string;
  project_id: string;
  from_user_id: string;
  to_user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  from_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  to_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface Team {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  team_lead_id?: string;
  team_lead?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface Activity {
  id: string;
  type: 'task' | 'prd' | 'comment' | 'file' | 'handoff';
  action: string;
  resource_type: string;
  resource_id: string;
  title: string;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  project_id: string;
  timestamp: string;
  metadata?: any;
}
```

---

## Quick Reference Commands

### Install Dependencies
```bash
npm install @supabase/supabase-js zod
# or
yarn add @supabase/supabase-js zod
```

### Setup Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Test API Connection
```typescript
// Test endpoint
const testConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('API Status:', data);
  } catch (error) {
    console.error('API Connection Failed:', error);
  }
};
```

---

## Common Patterns

### Pattern 1: Fetch with Loading State
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiClient.get('/endpoint');
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### Pattern 2: Optimistic Updates
```typescript
const updateTask = async (id: string, updates: any) => {
  // Optimistically update UI
  setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  
  try {
    await apiClient.patch(`/tasks/${id}`, updates);
  } catch (error) {
    // Revert on error
    setTasks(originalTasks);
    throw error;
  }
};
```

### Pattern 3: Pagination
```typescript
const [page, setPage] = useState(1);
const limit = 20;

const fetchPaginated = async () => {
  const data = await apiClient.get('/endpoint', {
    page: page.toString(),
    limit: limit.toString()
  });
  return data;
};
```

---

## Troubleshooting

### Issue: 401 Unauthorized
**Solution:** Check if token is stored and included in headers
```typescript
const token = localStorage.getItem('token');
if (!token) {
  // Redirect to login
  router.push('/login');
}
```

### Issue: 403 Forbidden
**Solution:** User doesn't have permission. Check user role and company membership.

### Issue: CORS Errors
**Solution:** Ensure backend CORS is configured to allow your frontend origin.

### Issue: File Upload Fails
**Solution:** 
1. Check file size limits
2. Verify Supabase bucket exists and is configured
3. Ensure upload token is valid (not expired)

---

## Next Steps

1. **Set up API Client** - Copy the `ApiClient` class to your project
2. **Create Type Definitions** - Add TypeScript types for all entities
3. **Implement Hooks** - Create React hooks for each resource type
4. **Add Error Handling** - Implement global error handler
5. **Set up Loading States** - Use the loading state patterns
6. **Test Endpoints** - Test each endpoint with your frontend

---

**Need Help?** Check the backend logs or contact the backend team for API issues.


