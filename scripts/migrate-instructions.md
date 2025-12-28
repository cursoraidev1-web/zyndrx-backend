# Database Migration Instructions

Since Supabase doesn't support direct SQL execution via the JavaScript client, you have two options:

## Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of each file **in order**:
   - `src/database/schema.sql`
   - `src/database/migrations/001_add_companies.sql`
   - `src/database/migrations/002_add_subscriptions.sql`
5. Click **Run** for each file

## Option 2: Supabase CLI (For Local Development)

If you're using Supabase locally:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize (if not already done)
supabase init

# Link to your project (if using cloud)
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Or apply specific file
supabase db execute -f src/database/schema.sql
```

## Option 3: PostgreSQL Client (Direct Connection)

If you have direct database access:

```bash
# Set connection string
export DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

# Run migrations
psql $DATABASE_URL -f src/database/schema.sql
psql $DATABASE_URL -f src/database/migrations/001_add_companies.sql
psql $DATABASE_URL -f src/database/migrations/002_add_subscriptions.sql
```

## Verification

After running migrations, verify in Supabase SQL Editor:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should see: users, projects, companies, user_companies, subscriptions, plan_limits, etc.
```




