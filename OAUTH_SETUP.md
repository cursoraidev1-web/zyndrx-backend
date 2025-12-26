# OAuth Setup Guide (Backend-Only Implementation)

## Overview

The backend now handles **complete OAuth flows** for Google and GitHub. Your frontend doesn't need any OAuth credentials or setup - just redirect users to backend endpoints.

---

## Backend Environment Variables

Add these to your `.env` file:

```env
# Google OAuth (Get from https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (Get from https://github.com/settings/developers)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Frontend URL (for OAuth callbacks)
FRONTEND_URL=http://localhost:3000
```

---

## OAuth Provider Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth 2.0 Client ID**
6. Configure:
   - **Application type**: Web application
   - **Name**: Zyndrx Backend
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/v1/auth/google/callback` (development)
     - `https://your-backend.com/api/v1/auth/google/callback` (production)
7. Copy **Client ID** and **Client Secret** to `.env`

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Configure:
   - **Application name**: Zyndrx
   - **Homepage URL**: `http://localhost:3000` (or your frontend URL)
   - **Authorization callback URL**:
     - `http://localhost:5000/api/v1/auth/github/callback` (development)
     - `https://your-backend.com/api/v1/auth/github/callback` (production)
4. Copy **Client ID** and **Client Secret** to `.env`

---

## Frontend Implementation

### No OAuth Setup Required!

Your frontend **doesn't need**:
- ❌ Google Client ID
- ❌ GitHub Client ID
- ❌ OAuth libraries
- ❌ OAuth configuration

### Simple Frontend Implementation

#### Google OAuth Button

```javascript
// Just redirect to backend endpoint
const handleGoogleLogin = () => {
  const companyName = 'My Company'; // Optional: for new signups
  window.location.href = `http://localhost:5000/api/v1/auth/google${companyName ? `?companyName=${encodeURIComponent(companyName)}` : ''}`;
};

// In your component
<button onClick={handleGoogleLogin}>
  Sign in with Google
</button>
```

#### GitHub OAuth Button

```javascript
const handleGitHubLogin = () => {
  const companyName = 'My Company'; // Optional: for new signups
  window.location.href = `http://localhost:5000/api/v1/auth/github${companyName ? `?companyName=${encodeURIComponent(companyName)}` : ''}`;
};

<button onClick={handleGitHubLogin}>
  Sign in with GitHub
</button>
```

#### Handle OAuth Callback

```javascript
// In your auth callback page (e.g., /auth/callback)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');

  if (error) {
    // Handle error
    console.error('OAuth error:', error);
    // Redirect to login with error message
    navigate('/login?error=' + encodeURIComponent(error));
    return;
  }

  if (token) {
    // Store token
    localStorage.setItem('token', token);
    
    // Get user info
    fetch('http://localhost:5000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('user', JSON.stringify(data.data));
        navigate('/dashboard');
      });
  }
}, []);
```

#### Handle 2FA Redirect

```javascript
// In your 2FA page (e.g., /auth/2fa)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  
  if (email) {
    setEmail(email);
    // Show 2FA input form
  }
}, []);

// Submit 2FA code
const handle2FA = async (code) => {
  const response = await fetch('http://localhost:5000/api/v1/auth/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token: code })
  });
  
  const result = await response.json();
  if (result.success) {
    localStorage.setItem('token', result.data.token);
    navigate('/dashboard');
  }
};
```

---

## API Endpoints

### Google OAuth

1. **GET `/api/v1/auth/google`** - Initiate OAuth flow
   - Redirects user to Google
   - Query params: `?companyName=MyCompany` (optional)

2. **GET `/api/v1/auth/google/callback`** - OAuth callback
   - Handled by backend automatically
   - Redirects to frontend with token

3. **POST `/api/v1/auth/google`** - Direct token (legacy)
   - Body: `{ "accessToken": "..." }`
   - For backward compatibility

### GitHub OAuth

1. **GET `/api/v1/auth/github`** - Initiate OAuth flow
   - Redirects user to GitHub
   - Query params: `?companyName=MyCompany` (optional)

2. **GET `/api/v1/auth/github/callback`** - OAuth callback
   - Handled by backend automatically
   - Redirects to frontend with token

3. **POST `/api/v1/auth/github`** - Direct token (legacy)
   - Body: `{ "accessToken": "..." }`
   - For backward compatibility

---

## OAuth Flow Diagram

```
User clicks "Sign in with Google"
    ↓
Frontend redirects to: GET /api/v1/auth/google
    ↓
Backend redirects to: Google OAuth page
    ↓
User authorizes on Google
    ↓
Google redirects to: GET /api/v1/auth/google/callback?code=...
    ↓
Backend exchanges code for token
    ↓
Backend creates/logs in user
    ↓
Backend redirects to: Frontend /auth/callback?token=...
    ↓
Frontend stores token and redirects to dashboard
```

---

## Error Handling

If OAuth fails, backend redirects to:
```
FRONTEND_URL/auth/error?error=error_message
```

Frontend should handle this:
```javascript
// In /auth/error page
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  
  // Display error message
  setError(error);
  
  // Optionally redirect to login after delay
  setTimeout(() => navigate('/login'), 5000);
}, []);
```

---

## Production Setup

### Update Redirect URIs

In production, update OAuth provider settings:

**Google:**
- Add: `https://your-backend.com/api/v1/auth/google/callback`

**GitHub:**
- Update callback URL to: `https://your-backend.com/api/v1/auth/github/callback`

### Update Environment Variables

```env
FRONTEND_URL=https://your-frontend.com
NODE_ENV=production
```

### HTTPS Required

OAuth providers require HTTPS in production. Ensure your backend has SSL certificate.

---

## Testing

### Local Development

1. Start backend: `npm run dev`
2. Backend runs on: `http://localhost:5000`
3. Frontend should redirect to: `http://localhost:5000/api/v1/auth/google`

### Test Flow

1. Click "Sign in with Google" button
2. Should redirect to Google login
3. After login, should redirect back to your frontend
4. Check browser console for any errors
5. Verify token is stored in localStorage

---

## Troubleshooting

### "OAuth not configured" error
- Check `.env` file has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Restart backend server after adding env vars

### "Redirect URI mismatch" error
- Verify redirect URI in OAuth provider matches exactly:
  - Development: `http://localhost:5000/api/v1/auth/google/callback`
  - Production: `https://your-backend.com/api/v1/auth/google/callback`

### Callback not working
- Check backend logs for errors
- Verify `FRONTEND_URL` is set correctly
- Ensure backend is accessible from internet (for production)

### Token not received
- Check browser network tab for redirect
- Verify frontend callback page handles `?token=` parameter
- Check backend logs for OAuth errors

---

## Summary

✅ **Backend handles everything** - No frontend OAuth setup needed  
✅ **Simple redirect** - Frontend just redirects to backend endpoint  
✅ **Automatic callback** - Backend handles OAuth callback  
✅ **Token in URL** - Backend redirects to frontend with token  
✅ **Company creation** - Optional companyName for new signups  

Your frontend just needs to:
1. Redirect to `/api/v1/auth/google` or `/api/v1/auth/github`
2. Handle callback at `/auth/callback?token=...`
3. Store token and redirect to dashboard

That's it! 🎉



