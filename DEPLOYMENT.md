# Deployment Guide

Complete guide for deploying Zyndrx Backend to production.

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Railway Deployment](#railway-deployment)
- [Render Deployment](#render-deployment)
- [Vercel Deployment (Alternative)](#vercel-deployment)
- [Environment Configuration](#environment-configuration)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Pre-Deployment Checklist

### 1. Code Preparation
- [ ] All TypeScript errors resolved
- [ ] Environment variables documented
- [ ] Database schema is up to date
- [ ] All tests passing (if applicable)
- [ ] Production dependencies only
- [ ] Remove console.logs (use logger instead)

### 2. Supabase Setup
- [ ] Production Supabase project created
- [ ] Database schema executed
- [ ] Row Level Security (RLS) policies enabled
- [ ] Storage buckets created and configured
- [ ] API keys copied to deployment platform

### 3. Security
- [ ] Strong JWT_SECRET generated (32+ characters)
- [ ] CORS origins updated for production
- [ ] Rate limiting configured appropriately
- [ ] Sensitive data not committed to repository

## Railway Deployment

Railway is recommended for its simplicity and generous free tier.

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your repository
4. Select your Zyndrx backend repository

### Step 3: Configure Environment Variables
In Railway dashboard, go to Variables and add:

```env
NODE_ENV=production
PORT=5000
API_VERSION=v1

SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
SUPABASE_ANON_KEY=your-production-anon-key

JWT_SECRET=your-super-secure-production-secret-min-32-chars
JWT_EXPIRES_IN=7d

BCRYPT_ROUNDS=12

ALLOWED_ORIGINS=https://your-frontend-domain.com

# Optional but recommended
RESEND_API_KEY=re_your_production_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Step 4: Deploy
1. Railway will automatically build and deploy
2. You'll get a URL like: `https://zyndrx-backend-production.up.railway.app`
3. Test your API: `curl https://your-url.railway.app/health`

### Step 5: Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Render Deployment

Render offers a simple deployment process with automatic SSL.

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure service:
   - **Name:** zyndrx-backend
   - **Region:** Choose closest to your users
   - **Branch:** main
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### Step 3: Environment Variables
Add all variables from Railway section above.

### Step 4: Advanced Settings
- **Instance Type:** Free or Starter ($7/mo)
- **Auto-Deploy:** Yes (deploys on git push)
- **Health Check Path:** `/health`

### Step 5: Deploy
1. Click "Create Web Service"
2. Render will build and deploy (takes 2-5 minutes)
3. You'll get a URL like: `https://zyndrx-backend.onrender.com`

## Vercel Deployment

While Vercel is primarily for frontend, it can host Node.js APIs as serverless functions.

### Prerequisites
```bash
npm install -g vercel
```

### Step 1: Create vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ]
}
```

### Step 2: Deploy
```bash
vercel --prod
```

### Step 3: Set Environment Variables
```bash
vercel env add SUPABASE_URL
vercel env add JWT_SECRET
# ... add all required variables
```

**Note:** Vercel has cold start times for serverless functions. Railway or Render are better for always-on APIs.

## Environment Configuration

### Production Environment Variables

```env
# Critical - Generate Strong Values
JWT_SECRET=$(openssl rand -base64 32)  # Generate secure secret
SUPABASE_SERVICE_ROLE_KEY=             # From Supabase dashboard

# Server
NODE_ENV=production
PORT=5000

# CORS - Add your frontend domains
ALLOWED_ORIGINS=https://app.yourdomain.com,https://yourdomain.com

# Security
BCRYPT_ROUNDS=12                      # Increase for production

# Rate Limiting (adjust based on usage)
RATE_LIMIT_WINDOW_MS=900000           # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100           # 100 requests per window

# Logging
LOG_LEVEL=info                        # Use 'debug' for troubleshooting
```

### Generating Secure Secrets

```bash
# JWT Secret (minimum 32 characters)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# GitHub Webhook Secret
openssl rand -hex 20
```

## Post-Deployment Tasks

### 1. Verify Deployment
```bash
# Health check
curl https://your-api-url.com/health

# Test authentication
curl -X POST https://your-api-url.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "fullName": "Test User"
  }'
```

### 2. Update Frontend
Update your frontend `.env` to point to production API:
```env
VITE_API_URL=https://your-api-url.com/api/v1
```

### 3. Configure DNS (if using custom domain)
Add DNS records as instructed by your deployment platform:
```
Type: CNAME
Name: api
Value: cname.railway.app (or render.com)
```

### 4. Enable SSL
Most platforms provide automatic SSL. Verify at:
```
https://www.ssllabs.com/ssltest/
```

## Monitoring & Maintenance

### Logging
All platforms provide log access:

**Railway:**
```bash
# View logs
railway logs
```

**Render:**
Dashboard → Logs tab

### Performance Monitoring
Consider adding:
- **Sentry** for error tracking
- **New Relic** for APM
- **Datadog** for comprehensive monitoring

### Database Backups
Supabase automatically backs up your database:
- Free tier: Daily backups
- Pro tier: Point-in-time recovery

Download manual backup:
1. Supabase Dashboard → Database → Backups
2. Download SQL dump

### Updating the API
```bash
# Make changes locally
git add .
git commit -m "feat: add new feature"
git push origin main

# Auto-deployment will trigger
# Or manually trigger in platform dashboard
```

### Scaling

**Railway:**
- Adjust resources in Settings → Resources
- Horizontal scaling via replication

**Render:**
- Upgrade instance type
- Enable autoscaling (paid plans)

### Health Monitoring
Set up uptime monitoring:
- **UptimeRobot** (free)
- **Pingdom**
- **StatusCake**

Monitor endpoint: `https://your-api-url.com/health`

## Troubleshooting

### Build Fails
```bash
# Check build logs
# Common issues:
# - Missing dependencies
# - TypeScript errors
# - Wrong Node version

# Test build locally
npm run build
```

### Runtime Errors
```bash
# Check logs
# Common issues:
# - Missing environment variables
# - Database connection failed
# - CORS errors
```

### Database Connection Issues
1. Verify Supabase credentials
2. Check if IP is whitelisted (usually not needed)
3. Test connection from deployment platform

### CORS Errors
1. Add frontend domain to `ALLOWED_ORIGINS`
2. Ensure protocol (http/https) matches
3. Check for trailing slashes

## Rollback Procedure

### Railway
1. Dashboard → Deployments
2. Select previous deployment
3. Click "Redeploy"

### Render
1. Dashboard → Events
2. Find successful deployment
3. Click "Rollback"

### Git-based Rollback
```bash
git revert HEAD
git push origin main
```

## Cost Estimates

### Free Tier Options
- **Railway:** $5 credit/month (sufficient for MVP)
- **Render:** 750 hours/month free
- **Supabase:** 500MB database, 1GB storage

### Paid Recommendations
As you scale:
- **Railway Starter:** $5/month
- **Render Starter:** $7/month
- **Supabase Pro:** $25/month (includes better performance)

## Security Checklist

- [ ] HTTPS enabled
- [ ] Strong JWT secret in use
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Audit logs enabled
- [ ] Database backups configured
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] Monitoring and alerts set up

## Next Steps

1. Set up continuous integration (GitHub Actions)
2. Add automated testing
3. Configure staging environment
4. Set up monitoring and alerts
5. Plan scaling strategy

---

**Questions?** Check the main README or contact the team.
