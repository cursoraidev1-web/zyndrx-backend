# Quick Start Guide

Get Zyndrx backend running in under 10 minutes.

## Prerequisites

- Node.js v20+ installed
- npm v9+ installed
- Supabase account (free)

## Step-by-Step Setup

### 1. Install Dependencies (1 minute)

```bash
npm install
```

### 2. Set Up Supabase (3 minutes)

1. **Create Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization, enter project name
   - Select region and create database password
   - Wait for project initialization (~2 minutes)

2. **Get API Keys**
   - Dashboard → Settings → API
   - Copy `Project URL`
   - Copy `anon` key (public)
   - Copy `service_role` key (secret)

3. **Run Database Schema**
   - Dashboard → SQL Editor
   - Click "New Query"
   - Copy entire contents of `src/database/schema.sql`
   - Paste and click "Run"
   - Should see "Success" message

### 3. Configure Environment (1 minute)

```bash
# Copy example file
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

Minimal required configuration:
```env
# From Supabase Dashboard
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_ANON_KEY=eyJhbG...

# Generate a secure secret (at least 32 characters)
JWT_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
```

**Quick JWT Secret Generation:**
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use Node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Start Development Server (30 seconds)

```bash
npm run dev
```

You should see:
```
🚀 Zyndrx API server running on port 5000
📝 Environment: development
🔗 API: http://localhost:5000/api/v1
```

### 5. Test the API (1 minute)

**Health Check:**
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Zyndrx API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

**Register First User:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!",
    "fullName": "Admin User",
    "role": "admin"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

Save the `token` from the response - you'll need it for authenticated requests.

## Next Steps

### 1. Create Your First Project

```bash
# Use the token from login
export TOKEN="your-token-here"

curl -X POST http://localhost:5000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Project",
    "description": "Testing Zyndrx platform"
  }'
```

### 2. Explore the API

Check out `API_EXAMPLES.md` for comprehensive examples of all endpoints.

### 3. Connect Your Frontend

Update your frontend `.env`:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 4. Optional: Create Storage Buckets

For file uploads (documents, avatars):

1. Supabase Dashboard → Storage
2. Create buckets:
   - `documents` (private)
   - `avatars` (public)
   - `project-files` (private)
3. Set bucket policies as needed

## Common Issues

### Port Already in Use
```bash
# Change port in .env
PORT=3001

# Or kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Database Connection Failed
- Verify Supabase URL and keys are correct
- Check if schema was run successfully
- Ensure database is not paused (free tier pauses after 1 week inactivity)

### TypeScript Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Supabase Auth Errors
- Make sure you ran the complete schema.sql
- Check if the trigger `on_auth_user_created` was created
- Verify JWT secret matches Supabase settings

## Development Workflow

### Recommended Setup

**Terminal 1 - API:**
```bash
npm run dev
```

**Terminal 2 - Logs:**
```bash
tail -f logs/combined.log  # If logging to file
```

**Terminal 3 - Testing:**
```bash
# Run your curl commands or tests
```

### Hot Reload

The dev server uses `ts-node-dev` for hot reload. Changes to `.ts` files will automatically restart the server.

### Database Changes

After modifying `schema.sql`:
1. Run new migrations in Supabase SQL Editor
2. Update `src/types/database.types.ts` if needed
3. Restart dev server

## Useful Commands

```bash
# Development
npm run dev           # Start with hot reload

# Production
npm run build         # Compile TypeScript
npm start             # Run compiled code

# Code Quality
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues

# Testing (if configured)
npm test              # Run tests
npm run test:watch    # Watch mode
```

## VS Code Setup

Recommended extensions:
- ESLint
- Prettier
- Thunder Client (for API testing)

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Environment Switching

### Development
```env
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Production
```env
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
ALLOWED_ORIGINS=https://your-app.com
```

## Debugging

### Enable Debug Logs
```env
LOG_LEVEL=debug
```

### VS Code Debugger

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Zyndrx API",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Testing with Postman

1. Import collection (if available)
2. Set environment variables:
   - `api_url`: `http://localhost:5000/api/v1`
   - `token`: Your JWT token
3. Start testing!

## Need Help?

- **Documentation:** See `README.md` for full docs
- **API Examples:** Check `API_EXAMPLES.md`
- **Deployment:** See `DEPLOYMENT.md`
- **Database:** Check `src/database/README.md`

## Success Checklist

- [ ] Dependencies installed
- [ ] Supabase project created
- [ ] Database schema executed
- [ ] Environment variables configured
- [ ] Dev server running
- [ ] Health check passing
- [ ] First user registered
- [ ] First project created
- [ ] Frontend connected (if applicable)

---

**You're all set!** 🎉 Start building your project management features.
