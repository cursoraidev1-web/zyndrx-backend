# Frontend Environment Variables Setup

## ❌ Cannot Directly Use Backend `.env`

The backend `.env` file **cannot be directly imported** by the frontend because:
1. Frontend code runs in the browser (no access to Node.js environment variables)
2. Security: Service role keys should NEVER be exposed to frontend
3. Different build systems: Backend uses `dotenv`, frontend uses `VITE_` or `REACT_APP_` prefix

## ✅ What CAN Be Shared

From your backend `.env`, you can share these values (with different variable names):

### Safe to Share (Create Frontend `.env`)

```env
# Frontend .env file (.env.local for Vite, or .env for Create React App)

# Supabase (same values as backend, but with VITE_ prefix)
VITE_SUPABASE_URL=https://rlzdtlfabtqicofrrxnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemR0bGZhYnRxaWNvZnJyeG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDE5ODMsImV4cCI6MjA4MjExNzk4M30.KZmRsHh3s-WbfksAiLPGMvLeeIyk7Gliw0_C9F6mCiU

# Backend API URL (for making API requests)
VITE_API_URL=http://localhost:5000/api/v1

# Optional: Frontend URL (for OAuth redirects)
VITE_FRONTEND_URL=http://localhost:3000
```

## ❌ What CANNOT Be Shared

**NEVER** put these in frontend `.env`:

```env
# ❌ NEVER EXPOSE THESE TO FRONTEND:
SUPABASE_SERVICE_ROLE_KEY=...  # Backend only! Security risk!
JWT_SECRET=...                  # Backend only!
```

## Backend `.env` (What You Have)

```env
# Backend .env - NOT ACCESSIBLE BY FRONTEND
SUPABASE_URL=https://rlzdtlfabtqicofrrxnc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ⚠️ BACKEND ONLY
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...          # ✅ Can share
JWT_SECRET=izaglrhRgi5912i3Eu4JWFZ5OYG8PLhFfxHTS0XOqxg            # ⚠️ BACKEND ONLY
```

## Frontend `.env` (What You Need)

Create a new `.env` or `.env.local` file in your **frontend project**:

```env
# Frontend .env.local (for Vite projects)
# or .env (for Create React App)

# Supabase Configuration (same URL and anon key, but with VITE_ prefix)
VITE_SUPABASE_URL=https://rlzdtlfabtqicofrrxnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemR0bGZhYnRxaWNvZnJyeG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDE5ODMsImV4cCI6MjA4MjExNzk4M30.KZmRsHh3s-WbfksAiLPGMvLeeIyk7Gliw0_C9F6mCiU

# Backend API URL
VITE_API_URL=http://localhost:5000/api/v1

# For production, use your production API URL:
# VITE_API_URL=https://your-api-domain.com/api/v1
```

## Key Differences

| Variable | Backend `.env` | Frontend `.env` | Notes |
|----------|----------------|-----------------|-------|
| Supabase URL | `SUPABASE_URL` | `VITE_SUPABASE_URL` | Same value, different name |
| Supabase Anon Key | `SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` | Same value, different name |
| Service Role Key | `SUPABASE_SERVICE_ROLE_KEY` | ❌ Never | Backend only (security) |
| JWT Secret | `JWT_SECRET` | ❌ Never | Backend only (security) |
| API URL | ❌ Not needed | `VITE_API_URL` | Frontend needs this to call backend |

## Vite vs Create React App

### Vite (Vue, React, Svelte)
- Prefix: `VITE_`
- File: `.env.local` or `.env`
- Access: `import.meta.env.VITE_*`

### Create React App
- Prefix: `REACT_APP_`
- File: `.env.local` or `.env`
- Access: `process.env.REACT_APP_*`

### Next.js
- No prefix needed
- File: `.env.local`
- Access: `process.env.*` (server-side) or `NEXT_PUBLIC_*` (client-side)

## Example Usage in Frontend Code

```typescript
// Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const apiUrl = import.meta.env.VITE_API_URL;

// Create React App
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const apiUrl = process.env.REACT_APP_API_URL;
```

## Quick Setup Steps

1. **Copy these values from your backend `.env`:**
   - `SUPABASE_URL` → `VITE_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` → `VITE_SUPABASE_ANON_KEY`

2. **Add frontend-specific variable:**
   - `VITE_API_URL` (your backend API URL)

3. **Create `.env.local` in your frontend project** with the values above

4. **Never commit `.env.local`** (add to `.gitignore`)

## Your Values for Frontend `.env`

Based on your backend `.env`, here's what to put in your frontend `.env.local`:

```env
VITE_SUPABASE_URL=https://rlzdtlfabtqicofrrxnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemR0bGZhYnRxaWNvZnJyeG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDE5ODMsImV4cCI6MjA4MjExNzk4M30.KZmRsHh3s-WbfksAiLPGMvLeeIyk7Gliw0_C9F6mCiU
VITE_API_URL=http://localhost:5000/api/v1
```

**Remember:** 
- ✅ Use `VITE_` prefix for Vite projects
- ✅ Use `REACT_APP_` prefix for Create React App
- ✅ Anon key is safe to expose (it's meant for frontend)
- ❌ NEVER expose `SUPABASE_SERVICE_ROLE_KEY` or `JWT_SECRET`

