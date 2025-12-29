/**
 * Zyndrx API TypeScript SDK
 * 
 * Copy this file to your frontend project and import the api instance.
 * 
 * Usage:
 * import api from './api';
 * const response = await api.auth.login({ email, password });
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PRDStatus = 'draft' | 'under_review' | 'approved' | 'rejected';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type UserRole = 'admin' | 'user';
export type CompanyRole = 'admin' | 'member' | 'viewer';
export type HandoffStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  company_role?: CompanyRole;
  two_factor_enabled: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  team_name?: string;
  status: ProjectStatus;
  owner_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
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

export interface PRD {
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

export interface Document {
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

export interface Comment {
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

export interface Notification {
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}

// ============================================================================
// API CLIENT
// ============================================================================

class ZyndrxAPI {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:5000/api/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // AUTH
  // ============================================================================

  auth = {
    register: async (data: {
      email: string;
      password: string;
      full_name: string;
      companyName: string;
    }) => {
      const response = await this.client.post<ApiResponse<{
        user: User;
        token: string;
        company: Company;
      }>>('/auth/register', data);
      
      // Store auth data
      if (response.data.data) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('company', JSON.stringify(response.data.data.company));
      }
      
      return response.data;
    },

    login: async (data: { email: string; password: string }) => {
      const response = await this.client.post<ApiResponse<{
        user: User;
        token: string;
        company: Company;
      }>>('/auth/login', data);
      
      // Store auth data
      if (response.data.data) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('company', JSON.stringify(response.data.data.company));
      }
      
      return response.data;
    },

    logout: async () => {
      await this.client.post('/auth/logout');
      this.clearAuth();
    },

    getMe: async () => {
      const response = await this.client.get<ApiResponse<User>>('/auth/me');
      return response.data;
    },

    updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
      const response = await this.client.put<ApiResponse<User>>('/auth/profile', data);
      return response.data;
    },

    forgotPassword: async (email: string) => {
      const response = await this.client.post<ApiResponse<void>>('/auth/forgot-password', { email });
      return response.data;
    },

    resetPassword: async (data: { token: string; password: string }) => {
      const response = await this.client.post<ApiResponse<void>>('/auth/reset-password', data);
      return response.data;
    },

    setup2FA: async () => {
      const response = await this.client.post<ApiResponse<{
        secret: string;
        qrCode: string;
      }>>('/auth/2fa/setup');
      return response.data;
    },

    enable2FA: async (token: string) => {
      const response = await this.client.post<ApiResponse<void>>('/auth/2fa/enable', { token });
      return response.data;
    },

    verify2FA: async (token: string) => {
      const response = await this.client.post<ApiResponse<void>>('/auth/2fa/verify', { token });
      return response.data;
    },

    getCompanies: async () => {
      const response = await this.client.get<ApiResponse<Company[]>>('/auth/companies');
      return response.data;
    },
  };

  // ============================================================================
  // COMPANIES
  // ============================================================================

  companies = {
    get: async (id: string) => {
      const response = await this.client.get<ApiResponse<Company>>(`/companies/${id}`);
      return response.data;
    },

    create: async (data: { name: string }) => {
      const response = await this.client.post<ApiResponse<Company>>('/companies', data);
      return response.data;
    },

    getMembers: async (id: string) => {
      const response = await this.client.get<ApiResponse<User[]>>(`/companies/${id}/members`);
      return response.data;
    },

    invite: async (id: string, data: { email: string; role: CompanyRole }) => {
      const response = await this.client.post<ApiResponse<void>>(`/companies/${id}/invite`, data);
      return response.data;
    },

    updateMemberRole: async (companyId: string, userId: string, role: CompanyRole) => {
      const response = await this.client.patch<ApiResponse<void>>(
        `/companies/${companyId}/members/${userId}`,
        { role }
      );
      return response.data;
    },

    removeMember: async (companyId: string, userId: string) => {
      const response = await this.client.delete<ApiResponse<void>>(
        `/companies/${companyId}/members/${userId}`
      );
      return response.data;
    },
  };

  // ============================================================================
  // USERS
  // ============================================================================

  users = {
    list: async () => {
      const response = await this.client.get<ApiResponse<User[]>>('/users');
      return response.data;
    },

    get: async (id: string) => {
      const response = await this.client.get<ApiResponse<User>>(`/users/${id}`);
      return response.data;
    },

    search: async (query: string) => {
      const response = await this.client.get<ApiResponse<User[]>>('/users/search', {
        params: { q: query },
      });
      return response.data;
    },

    getStats: async () => {
      const response = await this.client.get<ApiResponse<{
        total: number;
        roleDistribution: Record<string, number>;
      }>>('/users/stats');
      return response.data;
    },
  };

  // ============================================================================
  // PROJECTS
  // ============================================================================

  projects = {
    list: async (filters?: { team_name?: string; status?: ProjectStatus }) => {
      const response = await this.client.get<ApiResponse<Project[]>>('/projects', {
        params: filters,
      });
      return response.data;
    },

    get: async (id: string) => {
      const response = await this.client.get<ApiResponse<Project>>(`/projects/${id}`);
      return response.data;
    },

    create: async (data: {
      name: string;
      description?: string;
      team_name?: string;
      status?: ProjectStatus;
    }) => {
      const response = await this.client.post<ApiResponse<Project>>('/projects', data);
      return response.data;
    },

    update: async (id: string, data: Partial<Project>) => {
      const response = await this.client.patch<ApiResponse<Project>>(`/projects/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await this.client.delete<ApiResponse<void>>(`/projects/${id}`);
      return response.data;
    },

    getMembers: async (id: string) => {
      const response = await this.client.get<ApiResponse<any[]>>(`/projects/${id}/members`);
      return response.data;
    },

    addMember: async (id: string, data: { user_id: string; role: string }) => {
      const response = await this.client.post<ApiResponse<void>>(`/projects/${id}/members`, data);
      return response.data;
    },

    removeMember: async (projectId: string, userId: string) => {
      const response = await this.client.delete<ApiResponse<void>>(
        `/projects/${projectId}/members/${userId}`
      );
      return response.data;
    },
  };

  // ============================================================================
  // TASKS
  // ============================================================================

  tasks = {
    list: async (projectId?: string) => {
      const params = projectId ? { project_id: projectId } : undefined;
      const response = await this.client.get<ApiResponse<Task[]>>('/tasks', { params });
      return response.data;
    },

    get: async (id: string) => {
      const response = await this.client.get<ApiResponse<Task>>(`/tasks/${id}`);
      return response.data;
    },

    create: async (data: {
      project_id: string;
      title: string;
      description?: string;
      priority?: TaskPriority;
      assigned_to?: string;
      due_date?: string;
    }) => {
      const response = await this.client.post<ApiResponse<Task>>('/tasks', data);
      return response.data;
    },

    update: async (id: string, data: Partial<Task>) => {
      const response = await this.client.patch<ApiResponse<Task>>(`/tasks/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await this.client.delete<ApiResponse<void>>(`/tasks/${id}`);
      return response.data;
    },

    // Task Attachments
    requestUploadToken: async (taskId: string, data: {
      file_name: string;
      file_type: string;
      file_size: number;
    }) => {
      const response = await this.client.post<ApiResponse<{
        upload_url: string;
        file_path: string;
      }>>(`/tasks/${taskId}/attachments/upload-token`, data);
      return response.data;
    },

    saveAttachment: async (taskId: string, data: {
      file_path: string;
      file_name: string;
      file_size: number;
      file_type: string;
    }) => {
      const response = await this.client.post<ApiResponse<any>>(
        `/tasks/${taskId}/attachments`,
        data
      );
      return response.data;
    },

    getAttachments: async (taskId: string) => {
      const response = await this.client.get<ApiResponse<any[]>>(
        `/tasks/${taskId}/attachments`
      );
      return response.data;
    },

    getAttachmentDownload: async (attachmentId: string) => {
      const response = await this.client.get<ApiResponse<{ download_url: string }>>(
        `/tasks/attachments/${attachmentId}/download`
      );
      return response.data;
    },

    deleteAttachment: async (attachmentId: string) => {
      const response = await this.client.delete<ApiResponse<void>>(
        `/tasks/attachments/${attachmentId}`
      );
      return response.data;
    },
  };

  // ============================================================================
  // PRDS
  // ============================================================================

  prds = {
    list: async (projectId?: string) => {
      const params = projectId ? { project_id: projectId } : undefined;
      const response = await this.client.get<ApiResponse<PRD[]>>('/prds', { params });
      return response.data;
    },

    get: async (id: string) => {
      const response = await this.client.get<ApiResponse<PRD>>(`/prds/${id}`);
      return response.data;
    },

    create: async (data: {
      project_id: string;
      title: string;
      content: Record<string, any>;
    }) => {
      const response = await this.client.post<ApiResponse<PRD>>('/prds', data);
      return response.data;
    },

    update: async (id: string, data: { title?: string; content?: Record<string, any> }) => {
      const response = await this.client.patch<ApiResponse<PRD>>(`/prds/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await this.client.delete<ApiResponse<void>>(`/prds/${id}`);
      return response.data;
    },

    updateStatus: async (id: string, status: PRDStatus) => {
      const response = await this.client.patch<ApiResponse<PRD>>(`/prds/${id}/status`, { status });
      return response.data;
    },

    createVersion: async (id: string, data: {
      title: string;
      content: Record<string, any>;
      changes_summary: string;
    }) => {
      const response = await this.client.post<ApiResponse<any>>(`/prds/${id}/versions`, data);
      return response.data;
    },

    getVersions: async (id: string) => {
      const response = await this.client.get<ApiResponse<any[]>>(`/prds/${id}/versions`);
      return response.data;
    },
  };

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  documents = {
    requestUploadToken: async (data: {
      project_id: string;
      file_name: string;
      file_size: number;
      file_type: string;
    }) => {
      const response = await this.client.post<ApiResponse<{
        upload_url: string;
        file_path: string;
      }>>('/documents/upload-token', data);
      return response.data;
    },

    save: async (data: {
      project_id: string;
      title: string;
      file_path: string;
      file_name: string;
      file_size: number;
      file_type: string;
      tags?: string[];
    }) => {
      const response = await this.client.post<ApiResponse<Document>>('/documents', data);
      return response.data;
    },

    list: async (projectId: string) => {
      const response = await this.client.get<ApiResponse<Document[]>>('/documents', {
        params: { project_id: projectId },
      });
      return response.data;
    },

    get: async (id: string) => {
      const response = await this.client.get<ApiResponse<Document>>(`/documents/${id}`);
      return response.data;
    },

    getDownloadUrl: async (id: string) => {
      const response = await this.client.get<ApiResponse<{ download_url: string }>>(
        `/documents/${id}/download`
      );
      return response.data;
    },

    update: async (id: string, data: { title?: string; tags?: string[] }) => {
      const response = await this.client.patch<ApiResponse<Document>>(`/documents/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await this.client.delete<ApiResponse<void>>(`/documents/${id}`);
      return response.data;
    },
  };

  // ============================================================================
  // COMMENTS
  // ============================================================================

  comments = {
    create: async (data: {
      project_id: string;
      resource_type: 'task' | 'prd' | 'document';
      resource_id: string;
      content: string;
      parent_id?: string;
    }) => {
      const response = await this.client.post<ApiResponse<Comment>>('/comments', data);
      return response.data;
    },

    list: async (resourceType: string, resourceId: string, projectId: string) => {
      const response = await this.client.get<ApiResponse<Comment[]>>('/comments', {
        params: { resource_type: resourceType, resource_id: resourceId, project_id: projectId },
      });
      return response.data;
    },

    update: async (id: string, content: string) => {
      const response = await this.client.patch<ApiResponse<Comment>>(`/comments/${id}`, { content });
      return response.data;
    },

    delete: async (id: string) => {
      const response = await this.client.delete<ApiResponse<void>>(`/comments/${id}`);
      return response.data;
    },
  };

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  notifications = {
    list: async () => {
      const response = await this.client.get<ApiResponse<Notification[]>>('/notifications');
      return response.data;
    },

    markAsRead: async (id: string) => {
      const response = await this.client.patch<ApiResponse<void>>(`/notifications/${id}/read`);
      return response.data;
    },

    markAllAsRead: async () => {
      const response = await this.client.patch<ApiResponse<void>>('/notifications/mark-all-read');
      return response.data;
    },
  };

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  analytics = {
    getProjectStats: async (projectId: string) => {
      const response = await this.client.get<ApiResponse<any>>('/analytics', {
        params: { project_id: projectId },
      });
      return response.data;
    },
  };

  // ============================================================================
  // ACTIVITY
  // ============================================================================

  activity = {
    getFeed: async (filters?: {
      project_id?: string;
      type?: string;
      limit?: number;
    }) => {
      const response = await this.client.get<ApiResponse<any[]>>('/activity', {
        params: filters,
      });
      return response.data;
    },
  };

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  subscriptions = {
    get: async () => {
      const response = await this.client.get<ApiResponse<any>>('/subscription');
      return response.data;
    },

    getUsage: async () => {
      const response = await this.client.get<ApiResponse<any>>('/subscription/usage');
      return response.data;
    },

    change: async (planType: string) => {
      const response = await this.client.post<ApiResponse<void>>('/subscription/change', {
        plan_type: planType,
      });
      return response.data;
    },

    getPlans: async () => {
      const response = await this.client.get<ApiResponse<any[]>>('/plans');
      return response.data;
    },
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  private clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
  }

  getCurrentUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getCurrentCompany(): Company | null {
    const company = localStorage.getItem('company');
    return company ? JSON.parse(company) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  setBaseURL(url: string) {
    this.client.defaults.baseURL = url;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

const api = new ZyndrxAPI();
export default api;

/**
 * Usage Examples:
 * 
 * // Login
 * const response = await api.auth.login({ email, password });
 * 
 * // Get projects
 * const projects = await api.projects.list({ status: 'active' });
 * 
 * // Create task
 * const task = await api.tasks.create({
 *   project_id: 'uuid',
 *   title: 'New task',
 *   priority: 'high',
 * });
 * 
 * // Upload document
 * const tokenRes = await api.documents.requestUploadToken({
 *   project_id: 'uuid',
 *   file_name: file.name,
 *   file_size: file.size,
 *   file_type: file.type,
 * });
 * 
 * // Upload to Supabase
 * await fetch(tokenRes.data.upload_url, {
 *   method: 'PUT',
 *   body: file,
 * });
 * 
 * // Save document metadata
 * await api.documents.save({
 *   project_id: 'uuid',
 *   title: file.name,
 *   file_path: tokenRes.data.file_path,
 *   file_name: file.name,
 *   file_size: file.size,
 *   file_type: file.type,
 * });
 */
