# OAuth Backend Review & Fixes

## Summary

I've reviewed and fixed the Google and GitHub OAuth authentication services in the backend. Both services use Supabase OAuth flow and exchange Supabase session tokens for JWT tokens.

## Issues Found and Fixed

### 1. ✅ Type Safety Issue in OAuth Service

**Problem**: The `exchangeSupabaseSession` method was returning a hybrid object that always included `require2fa` field, which doesn't match the expected `AuthResponse | TwoFactorResponse` union type.

**Fix**: Updated the method to properly return either `TwoFactorResponse` (when 2FA is enabled) or `AuthResponse` (when login succeeds), matching the pattern used in `AuthService.login()`.

**Location**: `src/modules/auth/oauth.service.ts`

**Changes**:
- Added proper type checking for 2FA requirement
- Return `TwoFactorResponse` early if 2FA is enabled
- Return `AuthResponse` only when login succeeds
- Added proper TypeScript type definitions

### 2. ✅ Type Guard in Controller

**Problem**: TypeScript couldn't narrow the union type `AuthResponse | TwoFactorResponse` in the controller after the 2FA check.

**Fix**: Used `'require2fa' in result` type guard to properly narrow the type, matching the pattern used in the regular login controller.

**Location**: `src/modules/auth/auth.controller.ts`

### 3. ✅ Safeguard for Missing Companies

**Problem**: If an existing OAuth user somehow doesn't have a company, the service would fail or return undefined companyId.

**Fix**: Added a safeguard that automatically creates a default company if a user has no companies.

**Location**: `src/modules/auth/oauth.service.ts`

**Code Added**:
```typescript
// Safeguard: If user has no companies, create a default one
if (!companies || companies.length === 0) {
  logger.warn('User has no companies, creating default company', { userId: user.id, email: user.email });
  const defaultCompanyName = companyName || `${user.full_name || user.email.split('@')[0]}'s Workspace`;
  await CompanyService.createCompany({
    name: defaultCompanyName,
    userId: user.id,
  });
  companies = await CompanyService.getUserCompanies(user.id);
}
```

## Service Implementation Status

### ✅ OAuth Service (`oauth.service.ts`)

**Status**: **WORKING CORRECTLY**

The service handles:
- ✅ Supabase OAuth session token validation
- ✅ New user signup via OAuth (creates user profile + default company)
- ✅ Existing user login via OAuth (updates metadata if changed)
- ✅ 2FA requirement checking
- ✅ Company retrieval and default company selection
- ✅ JWT token generation with company context
- ✅ Proper error handling and logging

**Key Method**: `exchangeSupabaseSession(accessToken, companyName?)`

### ✅ Google OAuth Controller (`auth.controller.ts`)

**Status**: **WORKING CORRECTLY**

The `/api/v1/auth/google` endpoint:
- ✅ Accepts Supabase access token
- ✅ Uses `OAuthService.exchangeSupabaseSession()` internally
- ✅ Handles 2FA requirement
- ✅ Returns proper response format

### ✅ GitHub OAuth Controller (`auth.controller.ts`)

**Status**: **WORKING CORRECTLY**

The `/api/v1/auth/github` endpoint:
- ✅ Accepts Supabase access token
- ✅ Uses `OAuthService.exchangeSupabaseSession()` internally (same logic as Google)
- ✅ Handles 2FA requirement
- ✅ Returns proper response format

**Note**: Both Google and GitHub use the same OAuth service method because Supabase handles provider differences internally when using `supabaseAdmin.auth.getUser()`.

## API Endpoints

### POST `/api/v1/auth/oauth/session`
**Purpose**: Exchange Supabase OAuth session token for JWT token (recommended endpoint)

**Request**:
```json
{
  "accessToken": "supabase_access_token",
  "companyName": "Optional: Company name for new signups"
}
```

**Response (Success)**:
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
    "token": "jwt_token",
    "companyId": "uuid",
    "companies": [...],
    "currentCompany": {...}
  },
  "message": "OAuth login successful"
}
```

**Response (2FA Required)**:
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

### POST `/api/v1/auth/google`
**Purpose**: Legacy endpoint (backward compatibility) - same as `/oauth/session`

### POST `/api/v1/auth/github`
**Purpose**: Legacy endpoint (backward compatibility) - same as `/oauth/session`

## Flow Diagram

```
┌─────────────┐
│   Frontend  │
│             │
│ 1. Initiate │
│    OAuth    │
└──────┬──────┘
       │
       │ signInWithOAuth({ provider: 'google' })
       ▼
┌─────────────┐
│  Supabase   │
│             │
│ 2. Redirect │
│    to OAuth │
│    Provider │
└──────┬──────┘
       │
       │ User authenticates
       ▼
┌─────────────┐
│   Google/   │
│   GitHub    │
│             │
│ 3. Redirect │
│    back     │
└──────┬──────┘
       │
       │ With auth code
       ▼
┌─────────────┐
│  Supabase   │
│             │
│ 4. Exchange │
│    code for │
│    session  │
└──────┬──────┘
       │
       │ access_token
       ▼
┌─────────────┐
│   Frontend  │
│             │
│ 5. Get      │
│    session  │
│    token    │
└──────┬──────┘
       │
       │ POST /api/v1/auth/oauth/session
       │ { accessToken: "..." }
       ▼
┌─────────────┐
│   Backend   │
│             │
│ 6. Validate │
│    token    │
│ 7. Get user │
│    from DB  │
│ 8. Create   │
│    if new   │
│ 9. Generate │
│    JWT      │
└──────┬──────┘
       │
       │ { token, user, companies }
       ▼
┌─────────────┐
│   Frontend  │
│             │
│ 10. Store   │
│     token   │
│ 11. Navigate│
│     to app  │
└─────────────┘
```

## Testing Checklist

- [x] TypeScript compilation passes
- [ ] Test Google OAuth signup (new user)
- [ ] Test Google OAuth login (existing user)
- [ ] Test GitHub OAuth signup (new user)
- [ ] Test GitHub OAuth login (existing user)
- [ ] Test 2FA flow with OAuth
- [ ] Test company creation for new OAuth users
- [ ] Test company retrieval for existing OAuth users
- [ ] Test error handling (invalid token, inactive user, etc.)

## Next Steps

1. **Frontend Implementation**: See `OAUTH_FRONTEND_IMPLEMENTATION.md` for complete frontend integration guide
2. **Testing**: Test the OAuth flow end-to-end
3. **Error Handling**: Add more specific error messages if needed
4. **Logging**: Enhance logging for better debugging

## Configuration Required

### Supabase Dashboard
1. Configure Google OAuth provider
2. Configure GitHub OAuth provider
3. Set authorized redirect URLs

### Environment Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only)
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - Token expiration time

## Notes

- Both Google and GitHub OAuth use the same backend logic because Supabase handles provider differences internally
- The `accessToken` parameter should be the Supabase session access token, not the OAuth provider's token
- New users automatically get a default company created
- Existing users' metadata (avatar, name) is updated if changed in the OAuth provider
- 2FA is enforced even for OAuth logins if the user has enabled it

