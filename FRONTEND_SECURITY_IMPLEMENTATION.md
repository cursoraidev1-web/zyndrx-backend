# Frontend Security Implementation Guide

This document outlines all the frontend changes required to work with the enhanced security features implemented in the backend.

## Table of Contents
1. [Password Requirements](#password-requirements)
2. [Account Lockout Handling](#account-lockout-handling)
3. [Email Verification Flow](#email-verification-flow)
4. [Invitation System](#invitation-system)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Input Validation](#input-validation)
8. [Security Headers Compliance](#security-headers-compliance)
9. [Security Event Display](#security-event-display)

---

## Password Requirements

### Updated Password Rules

The backend now enforces stricter password requirements. Update your frontend validation to match:

**Requirements:**
- ✅ Minimum **12 characters** (increased from 8)
- ✅ At least one **uppercase letter** (A-Z)
- ✅ At least one **lowercase letter** (a-z)
- ✅ At least one **number** (0-9)
- ✅ At least one **special character** (!@#$%^&*()_+-=[]{}|;':"\\,.<>/?)
- ✅ **No spaces** allowed
- ✅ Cannot contain common patterns (password123, qwerty, abc123, etc.)

### Frontend Implementation

```typescript
// utils/passwordValidation.ts
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (password.includes(' ')) {
    errors.push('Password cannot contain spaces');
  }

  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', 'password123'];
  const lowerPwd = password.toLowerCase();
  if (commonPatterns.some(pattern => lowerPwd.includes(pattern))) {
    errors.push('Password cannot contain common patterns');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
```

### UI Example

```tsx
// components/PasswordInput.tsx
import { useState } from 'react';
import { validatePassword } from '@/utils/passwordValidation';

export const PasswordInput = ({ value, onChange, showRequirements = true }) => {
  const [showPassword, setShowPassword] = useState(false);
  const validation = validatePassword(value);

  return (
    <div>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          placeholder="Enter password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-2"
        >
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>

      {showRequirements && (
        <div className="mt-2 text-sm">
          <p className="font-semibold mb-1">Password Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li className={value.length >= 12 ? 'text-green-600' : 'text-gray-500'}>
              At least 12 characters
            </li>
            <li className={/[A-Z]/.test(value) ? 'text-green-600' : 'text-gray-500'}>
              One uppercase letter
            </li>
            <li className={/[a-z]/.test(value) ? 'text-green-600' : 'text-gray-500'}>
              One lowercase letter
            </li>
            <li className={/[0-9]/.test(value) ? 'text-green-600' : 'text-gray-500'}>
              One number
            </li>
            <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value) ? 'text-green-600' : 'text-gray-500'}>
              One special character
            </li>
            <li className={!value.includes(' ') ? 'text-green-600' : 'text-gray-500'}>
              No spaces
            </li>
          </ul>
        </div>
      )}

      {value && !validation.valid && (
        <div className="mt-2 text-red-600 text-sm">
          {validation.errors.map((error, i) => (
            <p key={i}>• {error}</p>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Apply to:**
- Registration form
- Password reset form
- Change password form
- Admin user creation form

---

## Account Lockout Handling

### Backend Behavior

- Accounts lock after **5 failed login attempts**
- Lockout duration: **30 minutes**
- Error response includes remaining lockout time

### Frontend Implementation

```typescript
// hooks/useLogin.ts
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export const useLogin = () => {
  const [error, setError] = useState<string | null>(null);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      setLockoutTime(null);

      const response = await apiClient.post('/auth/login', { email, password });
      return response;
    } catch (err: any) {
      // Handle account lockout (HTTP 423)
      if (err.response?.status === 423) {
        const errorMessage = err.response?.data?.error || '';
        const match = errorMessage.match(/try again in (\d+) minutes/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          setLockoutTime(minutes);
          setError(`Account locked. Please try again in ${minutes} minutes.`);
        } else {
          setError(errorMessage);
        }
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, error, lockoutTime, loading };
};
```

### UI Component

```tsx
// components/LoginForm.tsx
import { useState } from 'react';
import { useLogin } from '@/hooks/useLogin';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, lockoutTime, loading } = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Redirect on success
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {lockoutTime && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-800 font-semibold">Account Locked</p>
          <p className="text-red-600">
            Too many failed login attempts. Please try again in{' '}
            <strong>{lockoutTime} minutes</strong>.
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all"
                style={{ width: `${(lockoutTime / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {error && !lockoutTime && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        disabled={!!lockoutTime}
        required
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={!!lockoutTime}
        required
      />

      <button type="submit" disabled={loading || !!lockoutTime}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

**Key Points:**
- Display lockout message when status is 423
- Show remaining time countdown
- Disable form inputs during lockout
- Extract lockout time from error message

---

## Email Verification Flow

### Backend Behavior

- Users must verify email before accessing the platform
- Email verification link sent automatically on registration
- Users cannot login until email is verified

### Frontend Implementation

```tsx
// pages/Register.tsx
export const RegisterPage = () => {
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  const handleRegister = async (formData) => {
    try {
      await apiClient.post('/auth/register', formData);
      
      // Show verification message instead of auto-login
      setShowVerificationMessage(true);
    } catch (error) {
      // Handle error
    }
  };

  if (showVerificationMessage) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-blue-50 border border-blue-200 rounded">
        <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
        <p className="mb-4">
          We've sent a verification email to <strong>{formData.email}</strong>.
          Please click the link in the email to verify your account.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Didn't receive the email? Check your spam folder or{' '}
          <button className="text-blue-600 underline">resend verification email</button>.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Registration form...
};
```

### Login with Unverified Email

```typescript
// Handle unverified email error
try {
  await login(email, password);
} catch (error: any) {
  if (error.response?.status === 403 && error.response?.data?.error?.includes('email')) {
    // Show resend verification email option
    setShowResendVerification(true);
  }
}
```

---

## Invitation System

### Accepting Company Invitations

When a user receives an invitation email, they should be able to register with the invitation token.

### Frontend Implementation

```tsx
// pages/AcceptInvite.tsx
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export const AcceptInvitePage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/auth/register', {
        ...formData,
        invitationToken: token, // Include invitation token
        // Don't include companyName when using invitation
      });

      // User is automatically added to company
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      if (error.response?.status === 400) {
        // Invalid or expired token
        setError('This invitation link is invalid or has expired.');
      }
    }
  };

  if (!token) {
    return (
      <div className="text-center mt-20">
        <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
        <p>This invitation link is missing or invalid.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
      <p className="mb-6 text-gray-600">
        Create your account to join the company.
      </p>
      
      <form onSubmit={handleRegister}>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Email"
          required
        />
        
        <PasswordInput
          value={formData.password}
          onChange={(value) => setFormData({ ...formData, password: value })}
        />
        
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          placeholder="Full Name"
          required
        />
        
        <button type="submit">Create Account & Join</button>
      </form>
    </div>
  );
};
```

### Invitation Link Format

The backend sends invitation links in this format:
```
https://your-frontend.com/accept-company-invite?token=<invitation_token>
```

**Route Setup:**
```tsx
// app/accept-company-invite/page.tsx (Next.js App Router)
// or pages/accept-company-invite.tsx (Pages Router)
```

---

## Error Handling

### Updated Error Codes

The backend now returns additional error codes. Update your error handling:

```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any): { message: string; type: string } => {
  const status = error.response?.status;
  const errorData = error.response?.data;

  switch (status) {
    case 423:
      // Account locked
      return {
        message: errorData?.error || 'Account is locked',
        type: 'LOCKED',
      };
    
    case 429:
      // Rate limit exceeded
      return {
        message: errorData?.error || 'Too many requests. Please try again later.',
        type: 'RATE_LIMIT',
      };
    
    case 409:
      // Conflict (duplicate email, company name, etc.)
      return {
        message: errorData?.error || 'This resource already exists',
        type: 'CONFLICT',
      };
    
    case 400:
      // Bad request (validation errors)
      return {
        message: errorData?.error || 'Invalid request',
        type: 'VALIDATION',
      };
    
    case 401:
      // Unauthorized
      return {
        message: errorData?.error || 'Authentication required',
        type: 'UNAUTHORIZED',
      };
    
    case 403:
      // Forbidden
      return {
        message: errorData?.error || 'Access denied',
        type: 'FORBIDDEN',
      };
    
    default:
      return {
        message: errorData?.error || 'An unexpected error occurred',
        type: 'UNKNOWN',
      };
  }
};
```

### Rate Limiting Error Display

```tsx
// components/RateLimitMessage.tsx
export const RateLimitMessage = ({ retryAfter }: { retryAfter?: number }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
      <p className="text-yellow-800 font-semibold">Rate Limit Exceeded</p>
      <p className="text-yellow-700">
        Too many requests. Please wait{' '}
        {retryAfter ? `${retryAfter} seconds` : 'a moment'} before trying again.
      </p>
    </div>
  );
};
```

---

## Rate Limiting

### Registration Rate Limiting

- **3 registrations per 15 minutes per IP**
- Returns HTTP 429 with `retryAfter` in seconds

### Frontend Implementation

```typescript
// hooks/useRegister.ts
export const useRegister = () => {
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const register = async (data: RegisterData) => {
    try {
      setError(null);
      setRetryAfter(null);
      
      await apiClient.post('/auth/register', data);
      return { success: true };
    } catch (err: any) {
      if (err.response?.status === 429) {
        const retry = err.response?.data?.retryAfter;
        setRetryAfter(retry);
        setError('Too many registration attempts. Please try again later.');
      } else {
        setError(err.response?.data?.error || 'Registration failed');
      }
      throw err;
    }
  };

  return { register, error, retryAfter };
};
```

### UI Display

```tsx
{retryAfter && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
    <p className="text-yellow-800">
      Please wait {Math.ceil(retryAfter / 60)} minutes before registering again.
    </p>
  </div>
)}
```

---

## Input Validation

### Client-Side Validation

While the backend sanitizes all inputs, you should still validate on the frontend for better UX:

```typescript
// utils/inputSanitization.ts
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Use in forms
const handleInputChange = (value: string) => {
  const sanitized = sanitizeInput(value);
  setFormData({ ...formData, field: sanitized });
};
```

### React Hook

```typescript
// hooks/useSanitizedInput.ts
import { useState, useCallback } from 'react';
import { sanitizeInput } from '@/utils/inputSanitization';

export const useSanitizedInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);

  const onChange = useCallback((newValue: string) => {
    setValue(sanitizeInput(newValue));
  }, []);

  return { value, onChange };
};
```

---

## Security Headers Compliance

### Content Security Policy (CSP)

The backend sets strict CSP headers. Ensure your frontend complies:

**Allowed Sources:**
- Scripts: Same origin only
- Styles: Same origin + inline (for some libraries)
- Images: Same origin, data:, https:
- Connections: Same origin + Supabase URL

**If you need to load external resources:**
- Contact backend team to update CSP
- Or use proxy endpoints

### HTTPS Requirement

- Backend enforces HSTS (HTTP Strict Transport Security)
- Always use HTTPS in production
- Redirect HTTP to HTTPS

---

## Security Event Display (Optional)

### Admin Security Dashboard

If you want to show security events to admins:

```typescript
// hooks/useSecurityEvents.ts
export const useSecurityEvents = (userId?: string) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const params = userId ? { user_id: userId } : {};
        const data = await apiClient.get('/security/events', params);
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch security events', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [userId]);

  return { events, loading };
};
```

**Note:** This endpoint may need to be implemented if not already available.

---

## Testing Checklist

### Password Validation
- [ ] Test password with 11 characters (should fail)
- [ ] Test password without special character (should fail)
- [ ] Test password with spaces (should fail)
- [ ] Test password with common patterns (should fail)
- [ ] Test valid password (should pass)

### Account Lockout
- [ ] Attempt login 5 times with wrong password
- [ ] Verify account locks
- [ ] Verify lockout message displays
- [ ] Verify form is disabled during lockout
- [ ] Wait 30 minutes and verify unlock

### Email Verification
- [ ] Register new user
- [ ] Verify email verification message displays
- [ ] Try to login before verifying email (should fail)
- [ ] Verify email and login (should succeed)

### Invitation System
- [ ] Click invitation link
- [ ] Verify invitation token is extracted from URL
- [ ] Register with invitation token
- [ ] Verify user is added to company automatically

### Rate Limiting
- [ ] Attempt 4 registrations from same IP within 15 minutes
- [ ] Verify 4th attempt is blocked
- [ ] Verify rate limit message displays
- [ ] Verify retry time is shown

### Error Handling
- [ ] Test all error codes (400, 401, 403, 409, 423, 429, 500)
- [ ] Verify appropriate error messages display
- [ ] Verify user-friendly error messages (not technical)

---

## Migration Steps

1. **Update Password Validation**
   - Change minimum length from 8 to 12
   - Add special character requirement
   - Add pattern checking
   - Update all password inputs

2. **Add Account Lockout Handling**
   - Update login error handling
   - Add lockout UI component
   - Add countdown timer

3. **Update Registration Flow**
   - Remove auto-login after registration
   - Add email verification message
   - Handle invitation tokens

4. **Add Invitation Acceptance Page**
   - Create `/accept-company-invite` route
   - Extract token from URL
   - Pass token to registration

5. **Update Error Handling**
   - Add 423 (Locked) handling
   - Add 429 (Rate Limit) handling
   - Update error messages

6. **Test All Flows**
   - Registration
   - Login (including lockout)
   - Password reset
   - Invitation acceptance
   - Rate limiting

---

## API Changes Summary

### Updated Endpoints

1. **POST /api/v1/auth/register**
   - New: `invitationToken` parameter (optional)
   - Changed: `companyName` is now optional (required only if no invitationToken)
   - Changed: Password requirements (12+ chars, special chars)

2. **POST /api/v1/auth/login**
   - New: Returns 423 status when account is locked
   - New: Error message includes remaining lockout time

3. **POST /api/v1/auth/users/:companyId** (Admin only)
   - New: Enhanced password requirements

4. **POST /api/v1/auth/reset-password**
   - Changed: Enhanced password requirements

### New Error Responses

- **423 Locked**: Account locked due to failed attempts
- **429 Too Many Requests**: Rate limit exceeded (with `retryAfter`)

---

## Support

If you encounter issues implementing these changes:
1. Check the backend API documentation
2. Review error responses in browser DevTools
3. Contact the backend team for clarification

---

**Last Updated:** After security improvements implementation
**Backend Version:** Latest with 10/10 security score

