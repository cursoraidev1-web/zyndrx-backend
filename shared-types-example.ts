/**
 * SHARED TYPES FOR FRONTEND
 * 
 * Copy these types into your frontend project.
 * You can put them in: src/types/auth.ts or src/types/api.ts
 * 
 * These match the backend API response types.
 */

// User role enum
export type UserRole = 'admin' | 'product_manager' | 'developer' | 'qa' | 'devops' | 'designer';

// User interface
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
}

// Company interface
export interface Company {
  id: string;
  name: string;
  role: string;
}

// Auth response from backend (successful login)
export interface AuthResponse {
  user: User;
  token: string;
  companyId?: string;
  companies?: Company[];
  currentCompany?: {
    id: string;
    name: string;
  };
}

// 2FA response from backend (requires 2FA verification)
export interface TwoFactorResponse {
  require2fa: true;
  email: string;
}

// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Backend API response types (what the backend actually returns)
export type AuthApiResponse = ApiResponse<AuthResponse>;
export type TwoFactorApiResponse = ApiResponse<TwoFactorResponse>;

// Frontend auth state (optional, for context/store)
export interface AuthState {
  user: User | null;
  token: string | null;
  companyId: string | null;
  companies: Company[];
  currentCompany: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

