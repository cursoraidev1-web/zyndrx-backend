# Zyndrx Backend - Setup Checklist

Complete this checklist to ensure proper setup.

## ✅ Prerequisites

- [ ] Node.js v20+ installed
  ```bash
  node --version  # Should be v20 or higher
  ```
- [ ] npm v9+ installed
  ```bash
  npm --version   # Should be v9 or higher
  ```
- [ ] Supabase account created at [supabase.com](https://supabase.com)
- [ ] Git installed (for version control)
- [ ] Code editor (VS Code recommended)

---

## 📦 Installation Steps

### 1. Clone & Install Dependencies
- [ ] Repository cloned/downloaded
- [ ] Navigate to project directory
  ```bash
  cd zyndrx-backend
  ```
- [ ] Install dependencies
  ```bash
  npm install
  ```
- [ ] No errors during installation

### 2. Supabase Setup

#### Create Project
- [ ] Logged into Supabase
- [ ] New project created
- [ ] Project name noted: _______________
- [ ] Database password saved securely
- [ ] Region selected (closest to users)
- [ ] Project fully initialized (wait ~2 minutes)

#### Get API Keys
- [ ] Navigate to: Settings → API
- [ ] Copy Project URL: _______________
- [ ] Copy `anon` (public) key
- [ ] Copy `service_role` key

#### Run Database Schema
- [ ] Navigate to: SQL Editor
- [ ] Click "New Query"
- [ ] Open `src/database/schema.sql` from project
- [ ] Copy entire contents
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run"
- [ ] See "Success" message (no errors)

#### Verify Database Tables
- [ ] Navigate to: Table Editor
- [ ] See tables: users, projects, prds, tasks, etc.
- [ ] Total of 11 tables created

#### Create Storage Buckets (Optional)
- [ ] Navigate to: Storage
- [ ] Create bucket: `documents` (Private)
- [ ] Create bucket: `avatars` (Public)
- [ ] Create bucket: `project-files` (Private)

### 3. Environment Configuration

#### Create .env File
- [ ] Copy `.env.example` to `.env`
  ```bash
  cp .env.example .env
  ```
- [ ] Open `.env` in editor

#### Fill in Required Values
- [ ] `SUPABASE_URL` = (from Supabase dashboard)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase dashboard)
- [ ] `SUPABASE_ANON_KEY` = (from Supabase dashboard)
- [ ] `JWT_SECRET` = Generate secure secret:
  ```bash
  openssl rand -base64 32
  # or
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- [ ] JWT_SECRET is at least 32 characters
- [ ] `ALLOWED_ORIGINS` = Your frontend URLs

#### Optional Configuration
- [ ] `PORT` (default: 5000)
- [ ] `NODE_ENV` (default: development)
- [ ] Email service keys (if using)
- [ ] GitHub integration keys (if using)

### 4. Start Development Server

- [ ] Run development server:
  ```bash
  npm run dev
  ```
- [ ] No errors in terminal
- [ ] See startup message:
  ```
  🚀 Zyndrx API server running on port 5000
  📝 Environment: development
  🔗 API: http://localhost:5000/api/v1
  ```
- [ ] Server is running

---

## 🧪 Testing & Verification

### Health Check
- [ ] Open new terminal
- [ ] Run:
  ```bash
  curl http://localhost:5000/health
  ```
- [ ] See success response:
  ```json
  {
    "success": true,
    "message": "Zyndrx API is running",
    ...
  }
  ```

### Register First User
- [ ] Run registration command:
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
- [ ] Receive success response with user data and token
- [ ] Copy token for next test

### Login Test
- [ ] Run login command:
  ```bash
  curl -X POST http://localhost:5000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@example.com",
      "password": "Admin123!"
    }'
  ```
- [ ] Receive success response with token

### Create First Project
- [ ] Save token from login:
  ```bash
  export TOKEN="your-token-here"
  ```
- [ ] Create project:
  ```bash
  curl -X POST http://localhost:5000/api/v1/projects \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Project",
      "description": "My first project"
    }'
  ```
- [ ] Receive success response with project data

### Verify in Supabase
- [ ] Go to Supabase Table Editor
- [ ] Open `users` table
- [ ] See your registered user
- [ ] Open `projects` table
- [ ] See your created project

---

## 🔍 Troubleshooting

### Installation Issues

**Error: Node version too old**
- [ ] Update Node.js to v20+
- [ ] Use nvm: `nvm install 20 && nvm use 20`

**Error: npm install fails**
- [ ] Delete `node_modules` and `package-lock.json`
- [ ] Run `npm install` again
- [ ] Check internet connection

### Supabase Issues

**Error: Schema execution fails**
- [ ] Check for error message details
- [ ] Ensure using PostgreSQL (not MySQL)
- [ ] Try running schema in smaller sections
- [ ] Check Supabase logs

**Error: Can't find API keys**
- [ ] Go to Settings → API in Supabase
- [ ] Keys should be visible
- [ ] If not, wait for project initialization

### Connection Issues

**Error: Database connection failed**
- [ ] Verify SUPABASE_URL is correct (includes https://)
- [ ] Verify SUPABASE_SERVICE_ROLE_KEY is correct
- [ ] Check Supabase project is not paused
- [ ] Check internet connection

**Error: JWT verification failed**
- [ ] Ensure JWT_SECRET is set
- [ ] Ensure JWT_SECRET is at least 32 characters
- [ ] Restart server after changing .env

### Server Issues

**Error: Port already in use**
- [ ] Change PORT in .env to 3001 or other
- [ ] Or kill process on port:
  ```bash
  # Mac/Linux
  lsof -ti:5000 | xargs kill -9
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

**Error: Module not found**
- [ ] Run `npm install` again
- [ ] Delete `node_modules` and reinstall
- [ ] Check TypeScript is installed

---

## 🎯 Post-Setup Tasks

### Development Tools

**VS Code Extensions (Recommended)**
- [ ] Install ESLint extension
- [ ] Install Prettier extension
- [ ] Install Thunder Client (or Postman)
- [ ] Install Docker (if using containers)

**Configure VS Code**
- [ ] Create `.vscode/settings.json`:
  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
  ```

### Testing Tools

- [ ] Install Postman or Thunder Client
- [ ] Import API collection (if available)
- [ ] Set environment variables in tool

### Version Control

- [ ] Initialize git (if not done):
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  ```
- [ ] Create GitHub repository
- [ ] Push to GitHub:
  ```bash
  git remote add origin <your-repo-url>
  git push -u origin main
  ```

---

## 📚 Documentation Review

- [ ] Read `README.md` for full documentation
- [ ] Read `QUICKSTART.md` for quick reference
- [ ] Review `API_EXAMPLES.md` for endpoint examples
- [ ] Check `DEPLOYMENT.md` for production deployment
- [ ] Review `PROJECT_SUMMARY.md` for overview

---

## 🚀 Ready for Development

When all items are checked:

✅ **Backend is fully set up and running**
✅ **Database is configured and tested**
✅ **API is responding correctly**
✅ **Development environment is ready**

### Next Steps

1. **Frontend Development**
   - Connect frontend to API
   - Use token from login for authenticated requests
   - API URL: `http://localhost:5000/api/v1`

2. **Feature Development**
   - Review module structure in `src/modules/`
   - Follow existing patterns for new features
   - Use TypeScript strict mode

3. **Testing**
   - Test all endpoints with Postman/curl
   - Verify error handling
   - Check authorization rules

4. **Deployment Preparation**
   - Review `DEPLOYMENT.md`
   - Choose hosting platform (Railway/Render)
   - Prepare production environment variables

---

## 🆘 Getting Help

**Issue:** Setup not working?
- [ ] Check all items in this checklist again
- [ ] Review error messages carefully
- [ ] Search for error in documentation
- [ ] Check Supabase dashboard for issues

**Resources:**
- Documentation: See all `.md` files in root
- Supabase Docs: https://supabase.com/docs
- Node.js Docs: https://nodejs.org/docs

---

## ✅ Final Verification

Run this complete test sequence:

```bash
# 1. Health check
curl http://localhost:5000/health

# 2. Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","fullName":"Test"}'

# 3. Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# 4. Get profile (use token from login)
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

If all pass:
- [ ] ✅ Setup is complete!
- [ ] 🎉 Ready to build!

---

**Congratulations! Your Zyndrx backend is ready for development!** 🚀
