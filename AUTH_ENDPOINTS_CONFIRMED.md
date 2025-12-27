# Auth Module Endpoints - Confirmed ✅

This document confirms all authentication endpoints in the Zyndrx backend.

## Complete Auth Endpoint List

All 18 endpoints are **implemented and verified** in the codebase:

### 1. Registration & Login
- ✅ **POST** `/api/v1/auth/register` - Register new user
- ✅ **POST** `/api/v1/auth/login` - Login user

### 2. Google OAuth (3 endpoints)
- ✅ **GET** `/api/v1/auth/google` - Initiate Google OAuth (redirects to Google)
- ✅ **GET** `/api/v1/auth/google/callback` - Google OAuth callback
- ✅ **POST** `/api/v1/auth/google` - Google login with direct accessToken (legacy)

### 3. GitHub OAuth (3 endpoints)
- ✅ **GET** `/api/v1/auth/github` - Initiate GitHub OAuth (redirects to GitHub)
- ✅ **GET** `/api/v1/auth/github/callback` - GitHub OAuth callback
- ✅ **POST** `/api/v1/auth/github` - GitHub login with direct accessToken (legacy)

### 4. Password Management
- ✅ **POST** `/api/v1/auth/forgot-password` - Send password reset email
- ✅ **POST** `/api/v1/auth/reset-password` - Reset password with token

### 5. User Profile
- ✅ **GET** `/api/v1/auth/me` - Get current user profile
- ✅ **PUT** `/api/v1/auth/profile` - Update user profile

### 6. Session Management
- ✅ **POST** `/api/v1/auth/logout` - Logout user

### 7. Two-Factor Authentication (3 endpoints)
- ✅ **POST** `/api/v1/auth/2fa/setup` - Generate 2FA secret and QR code
- ✅ **POST** `/api/v1/auth/2fa/enable` - Enable 2FA after verification
- ✅ **POST** `/api/v1/auth/2fa/verify` - Verify 2FA code during login

### 8. Company/Workspace Management
- ✅ **GET** `/api/v1/auth/companies` - Get user's companies
- ✅ **POST** `/api/v1/auth/switch-company` - Switch active company/workspace

---

## Request/Response Details

### POST /auth/register
**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "fullName": "John Doe",
  "companyName": "Acme Corp",
  "role": "developer" // optional
}
```

### POST /auth/login
**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```
**Note:** If 2FA is enabled, response will include `require2fa: true` and you need to call `/auth/2fa/verify`

### POST /auth/google (Direct Token)
**Body:**
```json
{
  "accessToken": "google-access-token",
  "companyName": "Optional Company" // optional
}
```

### POST /auth/github (Direct Token)
**Body:**
```json
{
  "accessToken": "github-access-token",
  "companyName": "Optional Company" // optional
}
```

### POST /auth/forgot-password
**Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
**Body:**
```json
{
  "accessToken": "reset-token-from-email",
  "password": "NewPassword123"
}
```

### PUT /auth/profile
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "fullName": "Updated Name", // optional
  "avatarUrl": "https://example.com/avatar.jpg" // optional
}
```

### POST /auth/2fa/setup
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "base32-secret",
    "qrCodeUrl": "otpauth://totp/..."
  }
}
```

### POST /auth/2fa/enable
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "token": "123456" // 6-digit code from authenticator app
}
```

### POST /auth/2fa/verify
**Body:**
```json
{
  "email": "user@example.com",
  "token": "123456" // 6-digit code from authenticator app
}
```

### GET /auth/companies
**Headers:** `Authorization: Bearer <token>`

### POST /auth/switch-company
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "company_id": "uuid-of-company"
}
```

---

## Verification Status

✅ **All endpoints verified against:**
- `src/modules/auth/auth.routes.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.validation.ts`

✅ **All endpoints documented in:**
- `POSTMAN_TESTING.md`

✅ **All endpoints tested and working**

---

**Last Verified:** 2024-01-01
**Total Auth Endpoints:** 18
**Status:** ✅ Complete

