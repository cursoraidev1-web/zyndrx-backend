# Supabase OAuth Integration Guide

This document explains how to integrate OAuth authentication (Google and GitHub) using Supabase's built-in OAuth flow.

## Overview

The backend has been refactored to use Supabase's built-in OAuth authentication instead of manual OAuth flows. This simplifies the implementation and removes the need for backend OAuth client secrets.

## Architecture

### Flow Diagram

```
Frontend (Vercel)                    Supabase                    Provider (Google/GitHub)
     |                                    |                              |
     |-- signInWithOAuth() ------------->|                              |
     |                                    |-- OAuth redirect ---------->|
     |                                    |<-- OAuth callback -----------|
     |<-- Redirect with session ---------|                              |
     |-- POST /oauth/session ----------->|                              |
     |                                    |-- Validate session           |
     |                                    |-- Sync user to DB            |
     |<-- JWT token ---------------------|                              |
```

## Frontend Implementation

### 1. Initialize Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: `${window.location.origin}/auth/callback`,
    flowType: 'pkce', // Recommended for security
  },
});
```

### 2. Configure Supabase OAuth Providers

In your Supabase dashboard:
1. Go to **Authentication** > **Providers**
2. Enable **Google** and/or **GitHub**
3. Add your OAuth app credentials:
   - **Google**: Client ID and Client Secret from Google Cloud Console
   - **GitHub**: Client ID and Client Secret from GitHub OAuth Apps
4. Set redirect URLs:
   - For Google: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - For GitHub: `https://<your-supabase-project>.supabase.co/auth/v1/callback`

### 3. Initiate OAuth Login

```typescript
// Google OAuth
const handleGoogleLogin = async (companyName?: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        // Optional: pass company name for new signups
        ...(companyName && { state: btoa(companyName) }),
      },
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    // Handle error
  }
  // User will be redirected to Google, then back to /auth/callback
};

// GitHub OAuth
const handleGitHubLogin = async (companyName?: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        ...(companyName && { state: btoa(companyName) }),
      },
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    // Handle error
  }
};
```

### 4. Handle OAuth Callback

Create a callback page at `/auth/callback`:

```typescript
// pages/auth/callback.tsx or app/auth/callback/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.error('Session error:', error);
        router.push('/auth/error?error=session_failed');
        return;
      }

      // Extract company name from state if present
      const urlParams = new URLSearchParams(window.location.search);
      const state = urlParams.get('state');
      const companyName = state ? atob(state) : undefined;

      try {
        // Exchange Supabase session for JWT token
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: session.access_token,
            companyName,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Session exchange failed');
        }

        const data = await response.json();

        // Check if 2FA is required
        if (data.data.require2fa) {
          router.push(`/auth/2fa?email=${encodeURIComponent(data.data.user.email)}`);
          return;
        }

        // Store JWT token
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('companyId', data.data.companyId || '');

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (error: any) {
        console.error('Session exchange error:', error);
        router.push(`/auth/error?error=${encodeURIComponent(error.message)}`);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
```

### 5. Complete Example Component

```typescript
// components/auth/OAuthButtons.tsx
import { supabase } from '@/lib/supabase';

export function OAuthButtons() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      // Show error to user
    }
  };

  const handleGitHubLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('GitHub OAuth error:', error);
      // Show error to user
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          {/* Google icon SVG */}
        </svg>
        Continue with Google
      </button>

      <button
        onClick={handleGitHubLogin}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
          {/* GitHub icon SVG */}
        </svg>
        Continue with GitHub
      </button>
    </div>
  );
}
```

## Backend API Endpoints

### POST `/api/v1/auth/oauth/session`

Exchange Supabase OAuth session token for JWT token.

**Request Body:**
```json
{
  "accessToken": "supabase_access_token_here",
  "companyName": "Optional Company Name" // For new signups
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "developer",
      "avatarUrl": "https://..."
    },
    "token": "jwt_token_here",
    "companyId": "company-uuid",
    "companies": [...],
    "currentCompany": {...}
  },
  "message": "OAuth login successful"
}
```

**2FA Response:**
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

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

### Backend

No OAuth client secrets needed! The backend only needs:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Benefits

1. **Simplified Flow**: Frontend handles OAuth directly with Supabase
2. **No Client Secrets in Backend**: Secrets are managed by Supabase
3. **Automatic User Sync**: Supabase automatically creates users in `auth.users`
4. **Better Security**: PKCE flow supported by Supabase
5. **Less Code**: Removed ~400 lines of manual OAuth code

## Migration Notes

### Removed Endpoints

The following endpoints have been removed:
- `GET /api/v1/auth/google` (initiate)
- `GET /api/v1/auth/google/callback`
- `GET /api/v1/auth/github` (initiate)
- `GET /api/v1/auth/github/callback`

### Legacy Endpoints (Still Available)

These endpoints still work but now use Supabase session exchange internally:
- `POST /api/v1/auth/google` (accepts Supabase access token)
- `POST /api/v1/auth/github` (accepts Supabase access token)

## Troubleshooting

### "Invalid session token" Error

- Ensure the Supabase session is still valid (not expired)
- Check that you're using `session.access_token`, not `session.refresh_token`
- Verify the Supabase client is initialized correctly

### Redirect URI Mismatch

- Ensure the redirect URL in Supabase dashboard matches your callback URL
- For production: `https://your-frontend.vercel.app/auth/callback`
- For development: `http://localhost:3000/auth/callback`

### User Not Created in Database

- The backend automatically syncs users from Supabase Auth to the `users` table
- Check backend logs for sync errors
- Verify the `users` table has proper triggers/setup

## Support

For issues or questions:
1. Check Supabase dashboard logs
2. Check backend logs (Render dashboard)
3. Verify OAuth provider settings (Google Cloud Console / GitHub OAuth Apps)

