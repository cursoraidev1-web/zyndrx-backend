# Shared Types for Frontend

Since the backend and frontend are separate codebases, you **cannot directly import** the backend TypeScript files. However, you can share types in a few ways:

## Option 1: Copy Type Definitions (Simplest)

Copy the interface definitions from the documentation into your frontend code. The `OAUTH_FRONTEND_IMPLEMENTATION.md` guide already includes all the types you need.

## Option 2: Create a Shared Types Package (Recommended for Larger Projects)

If you have a monorepo or want to share types, create a shared package:

### Backend Types to Share

```typescript
// shared-types/src/auth.ts

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'product_manager' | 'developer' | 'qa' | 'devops' | 'designer';
    avatarUrl: string | null;
  };
  token: string;
  companyId?: string;
  companies?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  currentCompany?: {
    id: string;
    name: string;
  };
}

export interface TwoFactorResponse {
  require2fa: true;
  email: string;
}

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
```

## Option 3: Use the Frontend Code from Documentation (Easiest)

The `OAUTH_FRONTEND_IMPLEMENTATION.md` file contains **complete, ready-to-use frontend code** that you can:

1. **Copy directly** into your frontend project
2. **Adapt** to your project structure (file paths, naming conventions)
3. **Import and use** - it's standalone frontend code

### What You CAN Use from Backend:

✅ **API Endpoints** - Call the backend API endpoints
✅ **Type Definitions** - Copy/duplicate the interfaces
✅ **Implementation Guide** - Follow the step-by-step instructions

### What You CANNOT Use:

❌ **Backend Service Classes** - Cannot import `AuthService` or `OAuthService` (Node.js only)
❌ **Backend Middleware** - Cannot import Express middleware
❌ **Backend Controllers** - Cannot import Express controllers

## Quick Start: Using the Documentation Code

The frontend code in `OAUTH_FRONTEND_IMPLEMENTATION.md` is **ready to use**. Here's what to do:

1. **Copy the `AuthService` class** from the guide into your frontend
2. **Copy the TypeScript interfaces** (AuthResponse, TwoFactorResponse, etc.)
3. **Install dependencies**: `npm install @supabase/supabase-js`
4. **Set environment variables** in your frontend `.env`:
   ```
   VITE_SUPABASE_URL=https://rlzdtlfabtqicofrrxnc.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
   VITE_API_URL=http://localhost:5000/api/v1
   ```

That's it! The code is designed to work standalone in the frontend.

