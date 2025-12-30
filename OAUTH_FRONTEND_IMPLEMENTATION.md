# OAuth Frontend Implementation Guide

This guide explains how to implement Google and GitHub OAuth authentication in your frontend application.

## Overview

The backend uses **Supabase OAuth** flow. The frontend initiates OAuth with Supabase, then exchanges the Supabase session token for your backend's JWT token.

## Architecture Flow

```
Frontend → Supabase OAuth → User Authenticates → Supabase Session
    ↓
Frontend receives Supabase access token
    ↓
Frontend → Backend API (/api/v1/auth/oauth/session)
    ↓
Backend exchanges Supabase token for JWT token
    ↓
Frontend stores JWT token and user data
```

## Prerequisites

1. **Supabase Project Setup**
   - Configure Google OAuth provider in Supabase Dashboard
   - Configure GitHub OAuth provider in Supabase Dashboard
   - Add authorized redirect URLs in both providers
   - Copy your Supabase URL and anon key

2. **Backend Environment Variables**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only)
   - `SUPABASE_ANON_KEY` - Anon key (can be used by frontend)

3. **Frontend Environment Variables**
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:5000/api/v1  # or your production API URL
   ```

## Installation

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

### 2. Create Supabase Client

Create a file `src/lib/supabase.ts` (or similar):

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Implementation

### Step 1: Create OAuth Service/Utility

Create `src/services/authService.ts`:

```typescript
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
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
  };
  message?: string;
}

interface TwoFactorResponse {
  success: boolean;
  data: {
    require2fa: true;
    email: string;
  };
  message?: string;
}

export class AuthService {
  /**
   * Initiate Google OAuth login via Supabase
   */
  static async loginWithGoogle(companyName?: string): Promise<void> {
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Store companyName in state if provided (for new signups)
        ...(companyName && { 
          // Note: You can pass companyName through state or handle it differently
          // This is just one approach
        }),
      },
    });

    if (error) {
      throw new Error(`Google OAuth failed: ${error.message}`);
    }

    // User will be redirected to Google, then back to /auth/callback
  }

  /**
   * Initiate GitHub OAuth login via Supabase
   */
  static async loginWithGitHub(companyName?: string): Promise<void> {
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        // Store companyName if provided
      },
    });

    if (error) {
      throw new Error(`GitHub OAuth failed: ${error.message}`);
    }

    // User will be redirected to GitHub, then back to /auth/callback
  }

  /**
   * Exchange Supabase session token for backend JWT token
   * Called after OAuth callback
   */
  static async exchangeOAuthSession(
    supabaseAccessToken: string,
    companyName?: string
  ): Promise<AuthResponse | TwoFactorResponse> {
    const response = await fetch(`${API_URL}/auth/oauth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: supabaseAccessToken,
        companyName, // Optional: for new user signups
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'OAuth session exchange failed');
    }

    return await response.json();
  }

  /**
   * Handle OAuth callback and exchange token
   */
  static async handleOAuthCallback(): Promise<AuthResponse | TwoFactorResponse> {
    // Get the session from Supabase (handles the callback URL params)
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error('Failed to get OAuth session');
    }

    // Exchange Supabase token for backend JWT
    return await this.exchangeOAuthSession(session.access_token);
  }

  /**
   * Store authentication data in localStorage/sessionStorage
   */
  static storeAuthData(data: AuthResponse['data']): void {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.companyId) {
      localStorage.setItem('companyId', data.companyId);
    }
    if (data.companies) {
      localStorage.setItem('companies', JSON.stringify(data.companies));
    }
    if (data.currentCompany) {
      localStorage.setItem('currentCompany', JSON.stringify(data.currentCompany));
    }
  }

  /**
   * Clear authentication data
   */
  static clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
    localStorage.removeItem('companies');
    localStorage.removeItem('currentCompany');
  }

  /**
   * Get stored token
   */
  static getToken(): string | null {
    return localStorage.getItem('token');
  }
}
```

### Step 2: Create OAuth Callback Component

Create `src/pages/AuthCallback.tsx` (or similar):

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '@/services/authService';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function handleCallback() {
      try {
        setLoading(true);
        
        // Exchange Supabase session for backend JWT
        const result = await AuthService.handleOAuthCallback();

        // Check if 2FA is required
        if ('require2fa' in result.data && result.data.require2fa) {
          // Redirect to 2FA verification page
          navigate('/auth/2fa', {
            state: { email: result.data.email },
          });
          return;
        }

        // Store auth data
        if (result.success && result.data) {
          AuthService.storeAuthData(result.data);
          
          // Redirect to dashboard
          navigate('/dashboard');
        } else {
          throw new Error('Authentication failed');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    }

    handleCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold">Authentication Error</p>
          <p className="mt-2">{error}</p>
          <p className="mt-4 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return null;
}
```

### Step 3: Create Login Component with OAuth Buttons

Create `src/components/LoginForm.tsx`:

```typescript
import { useState } from 'react';
import { AuthService } from '@/services/authService';

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await AuthService.loginWithGoogle();
      // User will be redirected to Google OAuth, then callback
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await AuthService.loginWithGitHub();
      // User will be redirected to GitHub OAuth, then callback
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub login failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          {/* Google icon SVG */}
        </svg>
        {loading ? 'Connecting...' : 'Continue with Google'}
      </button>

      <button
        onClick={handleGitHubLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          {/* GitHub icon SVG */}
        </svg>
        {loading ? 'Connecting...' : 'Continue with GitHub'}
      </button>
    </div>
  );
}
```

### Step 4: Set Up Routes

In your router configuration (e.g., `src/App.tsx` or `src/routes.tsx`):

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthCallback from '@/pages/AuthCallback';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 5: Add API Request Interceptor

Create `src/services/api.ts`:

```typescript
import { AuthService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = AuthService.getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle 401 Unauthorized (token expired)
    if (response.status === 401) {
      AuthService.clearAuthData();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return await response.json();
}
```

## Handling 2FA

If the backend returns `require2fa: true`, redirect to a 2FA verification page:

```typescript
// src/pages/TwoFactorAuth.tsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function TwoFactorAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        AuthService.storeAuthData(result.data);
        navigate('/dashboard');
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h2>Two-Factor Authentication</h2>
      <p>Enter the 6-digit code from your authenticator app</p>
      
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        maxLength={6}
        className="w-full px-4 py-2 border rounded"
      />
      
      {error && <p className="text-red-600">{error}</p>}
      
      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? 'Verifying...' : 'Verify'}
      </button>
    </div>
  );
}
```

## Complete Example: React Hook

For a more React-friendly approach, create a custom hook:

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { AuthService } from '@/services/authService';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Load user from localStorage on mount
    const storedUser = localStorage.getItem('user');
    const storedToken = AuthService.getToken();

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }

    setLoading(false);
  }, []);

  const loginWithGoogle = async () => {
    await AuthService.loginWithGoogle();
  };

  const loginWithGitHub = async () => {
    await AuthService.loginWithGitHub();
  };

  const logout = () => {
    AuthService.clearAuthData();
    setUser(null);
    setToken(null);
  };

  return {
    user,
    token,
    loading,
    loginWithGoogle,
    loginWithGitHub,
    logout,
    isAuthenticated: !!user && !!token,
  };
}
```

## Testing

### Test OAuth Flow

1. Click "Login with Google" button
2. Should redirect to Google OAuth consent screen
3. After authorization, should redirect back to `/auth/callback`
4. Callback should exchange token and redirect to dashboard
5. User data and token should be stored in localStorage

### Test Error Cases

- Invalid Supabase configuration
- Network errors during token exchange
- 2FA required flow
- Expired tokens

## Troubleshooting

### Issue: Redirect URI mismatch

**Solution**: Make sure the redirect URL in your OAuth provider settings matches exactly:
- Supabase Dashboard → Authentication → URL Configuration
- Google Cloud Console → OAuth 2.0 Client IDs → Authorized redirect URIs
- GitHub → Settings → Developer settings → OAuth Apps → Authorization callback URL

The redirect URL should be: `https://your-supabase-project.supabase.co/auth/v1/callback`

### Issue: "Invalid session token"

**Solution**: 
- Make sure you're using the `access_token` from the Supabase session, not the `refresh_token`
- Check that the Supabase session is still valid

### Issue: CORS errors

**Solution**: 
- Make sure your backend CORS configuration includes your frontend URL
- Check that the API URL in your frontend matches your backend URL

## Security Best Practices

1. **Never expose service role key** in frontend code
2. **Store tokens securely** (consider httpOnly cookies for production)
3. **Implement token refresh** logic
4. **Validate tokens** on the backend for every request
5. **Use HTTPS** in production
6. **Handle token expiration** gracefully

## API Endpoints Reference

### POST `/api/v1/auth/oauth/session`
Exchange Supabase session token for JWT token.

**Request:**
```json
{
  "accessToken": "supabase_access_token_here",
  "companyName": "Optional company name for new signups"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "User Name",
      "role": "developer",
      "avatarUrl": "https://..."
    },
    "token": "jwt_token_here",
    "companyId": "uuid",
    "companies": [...],
    "currentCompany": {...}
  },
  "message": "OAuth login successful"
}
```

**Response (2FA Required):**
```json
{
  "success": true,
  "data": {
    "require2fa": true,
    "email": "user@example.com"
  },
  "message": "2FA verification required. Please enter your code."
}
```

## Next Steps

1. Implement token refresh mechanism
2. Add protected route wrapper
3. Implement workspace/company switching UI
4. Add error boundary for auth errors
5. Add loading states and skeletons

