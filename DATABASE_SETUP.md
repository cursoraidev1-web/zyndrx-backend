# Database Setup & Migration Guide

Complete guide for setting up and migrating the Zyndrx backend database.

## Quick Start

### 1. Set Up Supabase

**Option A: Supabase Cloud (Recommended)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to be ready (2-3 minutes)
4. Get credentials from **Settings** → **API**

**Option B: Local Supabase**
```bash
npm install -g supabase
supabase init
supabase start
```

### 2. Set Environment Variables

Create `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Migrations

**Method 1: Supabase SQL Editor (Easiest)**

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run these files **in order**:
   - Copy contents of `src/database/schema.sql` → Run
   - Copy contents of `src/database/migrations/001_add_companies.sql` → Run
   - Copy contents of `src/database/migrations/002_add_subscriptions.sql` → Run

**Method 2: Migration Script**

```bash
npm run db:migrate
```

This will guide you through the migration process.

**Method 3: Supabase CLI (Local only)**

```bash
supabase db reset
# or
supabase db push
```

## Migration Files

All migration files are in `src/database/`:

1. **schema.sql** - Base database schema (tables, indexes, triggers, RLS policies)
2. **migrations/001_add_companies.sql** - Adds companies and multi-tenancy support
3. **migrations/002_add_subscriptions.sql** - Adds subscription and billing tables

## Verification

After running migrations, verify in Supabase SQL Editor:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- `users`
- `projects`
- `companies`
- `user_companies`
- `subscriptions`
- `plan_limits`
- `tasks`
- `prds`
- `documents`
- `notifications`
- `audit_logs`
- `github_integrations`
- `github_commits`
- `deployments`

## Troubleshooting

### Error: "Database connection failed"

1. **Check environment variables:**
   ```bash
   # Verify .env file exists and has correct values
   cat .env | grep SUPABASE
   ```

2. **Test connection:**
   ```bash
   node -e "
   require('dotenv').config();
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   supabase.from('users').select('count').limit(1).then(({error}) => {
     console.log(error ? '❌ ' + error.message : '✅ Connected!');
   });
   "
   ```

3. **Verify schema is applied:**
   - Go to Supabase dashboard → Table Editor
   - You should see all tables listed

### Error: "relation does not exist"

This means migrations haven't been run yet. Follow Step 3 above.

### Error: "permission denied"

- Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Service role key bypasses RLS policies
- Check the key is correct in your .env file

## For Render Deployment

1. **Set environment variables in Render:**
   - Go to your service → Environment
   - Add: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

2. **Run migrations:**
   - Use Supabase SQL Editor (works for any environment)
   - Or use migration script if you set up database connection

3. **Verify:**
   - Check Render logs for "Database connection failed" errors
   - Test API endpoints that require database access

## Migration Script Details

The migration script (`scripts/migrate.js`) attempts to:
1. Validate environment variables
2. Test database connection
3. Execute SQL files in order
4. Provide clear feedback and instructions

Since Supabase JS client doesn't support raw SQL execution, the script will:
- Guide you to use SQL Editor for manual execution
- Provide file paths and order
- Show verification steps

## Next Steps

After migrations are complete:

1. ✅ Verify all tables exist
2. ✅ Test API endpoints
3. ✅ Create a test user via registration endpoint
4. ✅ Verify company and subscription are created automatically

## Files Reference

- `src/database/schema.sql` - Base schema
- `src/database/migrations/001_add_companies.sql` - Companies migration
- `src/database/migrations/002_add_subscriptions.sql` - Subscriptions migration
- `scripts/migrate.js` - Migration script
- `scripts/migrate-instructions.md` - Detailed migration instructions





