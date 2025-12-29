# Quick Start Guide

## Get Running in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and set these REQUIRED variables:
- `SUPABASE_URL` - Get from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase dashboard
- `SUPABASE_ANON_KEY` - Get from Supabase dashboard
- `JWT_SECRET` - Run: `openssl rand -base64 32`

### Step 3: Set Up Database
1. Go to your Supabase SQL Editor
2. Run `src/database/schema.sql` (if new database)
3. Run migrations from `src/database/migrations/` in order

### Step 4: Start Server
```bash
npm run dev
```

### Step 5: Test
```bash
curl http://localhost:5000/health
```

You should see:
```json
{
  "success": true,
  "message": "Zyndrx API is running"
}
```

## ✅ You're Ready!

API is now running at: `http://localhost:5000/api/v1`

### Test Registration
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User",
    "companyName": "Test Company"
  }'
```

### Next Steps
- See `API_DOCUMENTATION.md` for all endpoints
- See `FIXES_APPLIED.md` for what was fixed
- See `DEPLOYMENT_CHECKLIST.md` for production deployment

## Need Help?

Check the troubleshooting section in `DEPLOYMENT_CHECKLIST.md`
