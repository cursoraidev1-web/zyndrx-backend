# Frontend OAuth Implementation Guide

## ✅ No OAuth Setup Required!

Your frontend **does NOT need**:
- ❌ Google Client ID
- ❌ GitHub Client ID  
- ❌ OAuth libraries (`@react-oauth/google`, etc.)
- ❌ OAuth configuration files
- ❌ Environment variables for OAuth

**Everything is handled by the backend!**

---

## 🚀 Simple Implementation

### 1. Google OAuth Button

```javascript
// Just redirect to backend endpoint
const handleGoogleLogin = () => {
  // Optional: pass company name for new signups
  const companyName = 'My Company';
  const url = `http://localhost:5000/api/v1/auth/google${companyName ? `?companyName=${encodeURIComponent(companyName)}` : ''}`;
  window.location.href = url;
};

// In your component
<button onClick={handleGoogleLogin}>
  Sign in with Google
</button>
```

### 2. GitHub OAuth Button

```javascript
const handleGitHubLogin = () => {
  const companyName = 'My Company'; // Optional
  const url = `http://localhost:5000/api/v1/auth/github${companyName ? `?companyName=${encodeURIComponent(companyName)}` : ''}`;
  window.location.href = url;
};

<button onClick={handleGitHubLogin}>
  Sign in with GitHub
</button>
```

---

## 📋 OAuth Flow

1. **User clicks button** → Frontend redirects to backend
2. **Backend redirects** → User sees Google/GitHub login
3. **User authorizes** → Google/GitHub redirects to backend callback
4. **Backend processes** → Creates/logs in user, generates token
5. **Backend redirects** → Frontend receives token in URL
6. **Frontend stores token** → User is logged in

---

## 🔄 Handle OAuth Callback

### Create `/auth/callback` Page

```javascript
// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const provider = searchParams.get('provider'); // 'google' or 'github'

    if (error) {
      // Handle error
      console.error('OAuth error:', error);
      navigate(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      // Store token
      localStorage.setItem('token', token);
      
      // Fetch user data
      fetch('http://localhost:5000/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Store user data
            localStorage.setItem('user', JSON.stringify(data.data));
            
            // Redirect to dashboard
            navigate('/dashboard');
          } else {
            throw new Error('Failed to get user data');
          }
        })
        .catch(err => {
          console.error('Error fetching user:', err);
          navigate('/login?error=auth_failed');
        });
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate]);

  return (
    <div>
      <p>Completing authentication...</p>
    </div>
  );
};

export default AuthCallback;
```

### Add Route

```javascript
// In your router
<Route path="/auth/callback" element={<AuthCallback />} />
```

---

## 🔐 Handle 2FA Redirect

If user has 2FA enabled, backend redirects to `/auth/2fa?email=...`

```javascript
// src/pages/TwoFactorAuth.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TwoFactorAuth = () => {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const email = searchParams.get('email');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          token: code
        })
      });

      const result = await response.json();

      if (result.success && result.data.token) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        navigate('/dashboard');
      } else {
        setError(result.message || 'Invalid code');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    }
  };

  return (
    <div>
      <h2>Two-Factor Authentication</h2>
      <p>Enter the 6-digit code from your authenticator app</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(value);
          }}
          placeholder="000000"
          maxLength={6}
          required
          autoFocus
        />
        
        {error && <div className="error">{error}</div>}
        
        <button type="submit" disabled={code.length !== 6}>
          Verify
        </button>
      </form>
    </div>
  );
};

export default TwoFactorAuth;
```

---

## ⚠️ Handle Errors

### Create `/auth/error` Page

```javascript
// src/pages/AuthError.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthError = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get('error');

  useEffect(() => {
    // Auto-redirect to login after 5 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const errorMessages: Record<string, string> = {
    'no_code': 'Authorization code not received',
    'oauth_failed': 'OAuth authentication failed',
    'access_denied': 'You denied access to your account',
  };

  return (
    <div>
      <h2>Authentication Error</h2>
      <p>{errorMessages[error || ''] || error || 'An unknown error occurred'}</p>
      <p>Redirecting to login...</p>
      <button onClick={() => navigate('/login')}>Go to Login</button>
    </div>
  );
};

export default AuthError;
```

---

## 📝 Complete Example

### Login Page with OAuth Buttons

```javascript
// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = 'http://localhost:5000/api/v1/auth/google';
  };

  const handleGitHubLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = 'http://localhost:5000/api/v1/auth/github';
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    // Your existing email/password login logic
  };

  return (
    <div>
      <h1>Login</h1>
      
      {/* Email/Password Login */}
      <form onSubmit={handleEmailLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Login</button>
      </form>

      <div>OR</div>

      {/* OAuth Buttons */}
      <button onClick={handleGoogleLogin}>
        Sign in with Google
      </button>
      
      <button onClick={handleGitHubLogin}>
        Sign in with GitHub
      </button>
    </div>
  );
};

export default Login;
```

---

## 🔧 Router Setup

```javascript
// src/App.jsx or router file
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import TwoFactorAuth from './pages/TwoFactorAuth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/error" element={<AuthError />} />
        <Route path="/auth/2fa" element={<TwoFactorAuth />} />
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 🎯 Summary

**Frontend Implementation:**
1. ✅ Create OAuth buttons that redirect to backend
2. ✅ Create `/auth/callback` page to handle token
3. ✅ Create `/auth/error` page for error handling
4. ✅ Create `/auth/2fa` page for 2FA verification
5. ✅ Store token and user data in localStorage
6. ✅ Redirect to dashboard after successful auth

**No OAuth libraries or credentials needed!** 🎉

---

## 📚 Backend Endpoints

- `GET /api/v1/auth/google` - Start Google OAuth
- `GET /api/v1/auth/google/callback` - Google callback (handled by backend)
- `GET /api/v1/auth/github` - Start GitHub OAuth
- `GET /api/v1/auth/github/callback` - GitHub callback (handled by backend)

All OAuth credentials are stored in backend `.env` file.



