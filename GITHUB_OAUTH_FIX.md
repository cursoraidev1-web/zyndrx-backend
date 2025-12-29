# GitHub OAuth Redirect URI Fix

## 🚨 Problem

GitHub is rejecting the OAuth request because the redirect URI `http://localhost:3000/auth/github/callback` is not registered in your GitHub OAuth app settings.

**Error:** "The `redirect_uri` is not associated with this application."

## ✅ Solution

You need to add the redirect URI to your GitHub OAuth app settings.

### Step 1: Go to GitHub OAuth App Settings

1. Go to: https://github.com/settings/developers
2. Click on your OAuth App (or create a new one)
3. Find the **"Authorization callback URL"** field

### Step 2: Add Redirect URIs

Add **ALL** of these redirect URIs to your GitHub OAuth app:

#### For Development:
```
http://localhost:5000/api/v1/auth/github/callback
http://localhost:3000/auth/github/callback
```

#### For Production (Render):
```
https://zyndrx-backend-blgx.onrender.com/api/v1/auth/github/callback
https://your-production-frontend.com/auth/github/callback
```

**Important:** GitHub allows multiple redirect URIs. Add all of them.

### Step 3: Understanding the Flow

There are **two possible OAuth flows**:

#### Option A: Frontend Initiates (Current Issue)
- Frontend redirects to: `http://localhost:3000/auth/github/callback`
- **This URI must be registered in GitHub**

#### Option B: Backend Initiates (Recommended)
- Backend redirects to: `http://localhost:5000/api/v1/auth/github/callback` (or Render URL)
- **This URI must be registered in GitHub**

### Step 4: Check Your Current Setup

**Backend Configuration:**
- Backend callback: `/api/v1/auth/github/callback`
- Backend host: `localhost:5000` (dev) or `zyndrx-backend-blgx.onrender.com` (prod)

**Frontend Configuration:**
- Frontend might be using: `/auth/github/callback`
- Frontend host: `localhost:3000`

### Step 5: Recommended Fix

**Option 1: Use Backend Callback (Recommended)**

Update your frontend to use the backend OAuth endpoint:

```typescript
// Frontend should redirect to:
window.location.href = 'https://zyndrx-backend-blgx.onrender.com/api/v1/auth/github';
// or for local dev:
window.location.href = 'http://localhost:5000/api/v1/auth/github';
```

Then in GitHub OAuth app, register:
- `http://localhost:5000/api/v1/auth/github/callback` (dev)
- `https://zyndrx-backend-blgx.onrender.com/api/v1/auth/github/callback` (prod)

**Option 2: Use Frontend Callback**

If your frontend handles the callback, register:
- `http://localhost:3000/auth/github/callback` (dev)
- `https://your-production-frontend.com/auth/github/callback` (prod)

But then your frontend needs to handle the OAuth code exchange, which is more complex.

## 🔧 Quick Fix Steps

1. **Go to GitHub OAuth App Settings:**
   - https://github.com/settings/developers
   - Select your app (Client ID: `Ov23liNGGGXWhHeSWlEt`)

2. **Add Authorization Callback URLs:**
   ```
   http://localhost:5000/api/v1/auth/github/callback
   https://zyndrx-backend-blgx.onrender.com/api/v1/auth/github/callback
   ```

3. **Save Changes**

4. **Test Again:**
   - Clear browser cache
   - Try GitHub OAuth login again

## 📝 Current Backend Flow

The backend is configured to:
1. Receive OAuth initiation at: `GET /api/v1/auth/github`
2. Redirect user to GitHub
3. Receive callback at: `GET /api/v1/auth/github/callback`
4. Exchange code for token
5. Create/login user
6. Redirect to frontend with JWT token

**Backend callback URL format:**
```
{protocol}://{backend-host}/api/v1/auth/github/callback
```

**Examples:**
- Dev: `http://localhost:5000/api/v1/auth/github/callback`
- Prod: `https://zyndrx-backend-blgx.onrender.com/api/v1/auth/github/callback`

## ⚠️ Important Notes

1. **GitHub requires exact match** - The redirect URI must match exactly (including protocol, host, port, path)

2. **Multiple URIs allowed** - You can add multiple redirect URIs in GitHub settings

3. **No wildcards** - GitHub doesn't support wildcards in redirect URIs

4. **HTTPS in production** - Production redirect URIs must use HTTPS

## 🧪 Testing

After adding the redirect URI:

1. **Test in browser:**
   ```
   http://localhost:5000/api/v1/auth/github
   ```
   or
   ```
   https://zyndrx-backend-blgx.onrender.com/api/v1/auth/github
   ```

2. **Should redirect to GitHub login**

3. **After authorization, should redirect back to backend callback**

4. **Backend should then redirect to frontend with token**

## 🔍 Verify Your Setup

Check these in your GitHub OAuth app:

- ✅ **Client ID:** `Ov23liNGGGXWhHeSWlEt` (matches your backend)
- ✅ **Client Secret:** Set in backend `GITHUB_CLIENT_SECRET` env var
- ✅ **Authorization callback URL:** Includes backend callback URL
- ✅ **Homepage URL:** Your app homepage
- ✅ **Application name:** Your app name

---

**Status:** ⚠️ **Action Required** - Add redirect URI to GitHub OAuth app settings

