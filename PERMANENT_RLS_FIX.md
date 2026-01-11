# PERMANENT FIX for RLS Policy Violations

## The Problem

You're getting this error:
```json
{
  "statusCode": "403",
  "error": "Unauthorized",
  "message": "new row violates row-level security policy"
}
```

## Root Cause

The service role should automatically bypass RLS, but RLS policies that check `auth.uid()` fail when using the service role because there's no user context. This migration provides **multiple layers of protection** to ensure it works.

## The Solution

I've created a **comprehensive migration** that fixes this permanently with three approaches:

1. **Explicit Grants** - Grants all permissions to service_role
2. **SECURITY DEFINER Functions** - Functions that bypass RLS completely
3. **Explicit RLS Policies** - Policies that explicitly allow service_role

## Step-by-Step Fix

### Step 1: Run the Migration

1. **Open Supabase SQL Editor**:
   - Go to your Supabase Dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration**:
   - Open file: `backend/src/database/migrations/027_permanent_fix_service_role_rls.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Verify Success**:
   - You should see messages like:
     - `✓ service_role exists`
     - `✓ service_role has table permissions`
     - `Created service_role policy for documents`
     - `Created service_role policy for tasks`
     - etc.

### Step 2: Verify Service Role Key

1. **Check Environment Variable**:
   ```bash
   # In backend directory
   cat .env | grep SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Get the Key from Supabase**:
   - Go to Supabase Dashboard
   - Navigate to **Settings** → **API**
   - Copy the **`service_role`** key (NOT the anon key)
   - It should be a long JWT token starting with `eyJ...`

3. **Set in Backend**:
   ```bash
   # In backend/.env file
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Restart Backend Server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart
   npm run dev
   # or
   npm start
   ```

### Step 3: Test the Fix

1. **Try the Operation Again**:
   - Try creating a document/task/whatever was failing
   - It should work now

2. **Check Backend Logs**:
   - Look for `serviceRoleKeySet: true`
   - No RLS errors should appear

3. **Run Verification Script** (Optional):
   ```typescript
   // In backend/src/utils/verify-service-role.ts
   import { logServiceRoleStatus } from './utils/verify-service-role';
   await logServiceRoleStatus();
   ```

## What the Migration Does

### 1. Grants Explicit Permissions
```sql
GRANT ALL ON TABLE public.documents TO service_role;
GRANT ALL ON TABLE public.tasks TO service_role;
-- ... and all other tables
```

### 2. Creates SECURITY DEFINER Functions
These functions run with postgres privileges, completely bypassing RLS:
- `insert_document()` - For inserting documents
- `insert_task()` - For inserting tasks

### 3. Creates Explicit RLS Policies
```sql
CREATE POLICY "Service role can manage documents" ON documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

This explicitly allows service_role to do everything on all tables.

## Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- 1. Check service_role permissions
SELECT * FROM information_schema.role_table_grants 
WHERE grantee = 'service_role'
LIMIT 10;

-- 2. Check RLS policies for service_role
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE roles @> ARRAY['service_role']
ORDER BY tablename, policyname;

-- 3. Test service_role bypass (should work)
SET ROLE service_role;
SELECT * FROM documents LIMIT 1;
RESET ROLE;
```

## Troubleshooting

### Still Getting RLS Errors?

1. **Verify Migration Ran Successfully**:
   - Check Supabase SQL Editor history
   - Look for any error messages

2. **Check Service Role Key**:
   ```bash
   # In backend directory
   node -e "require('dotenv').config(); console.log('Key set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY); console.log('Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);"
   ```

3. **Verify Backend is Using Service Role**:
   - Check `backend/src/config/supabase.ts`
   - Should use `config.supabase.serviceRoleKey` (not anonKey)

4. **Check Backend Logs**:
   - Look for detailed error messages
   - Check the diagnostic information

5. **Manual Test in Supabase**:
   ```sql
   -- Try inserting directly as service_role
   SET ROLE service_role;
   INSERT INTO documents (project_id, title, file_url, file_type, file_size, uploaded_by, company_id)
   VALUES (
     '00000000-0000-0000-0000-000000000000'::uuid,
     'TEST',
     'test',
     'test',
     0,
     '00000000-0000-0000-0000-000000000000'::uuid,
     '00000000-0000-0000-0000-000000000000'::uuid
   );
   RESET ROLE;
   ```

## Why This Works

1. **Multiple Layers**: Even if one approach fails, the others provide backup
2. **Explicit Policies**: Service role is explicitly allowed in RLS policies
3. **SECURITY DEFINER Functions**: These completely bypass RLS
4. **Proper Grants**: Service role has all necessary permissions

## Files Changed

- ✅ `backend/src/database/migrations/027_permanent_fix_service_role_rls.sql` - Main migration
- ✅ `backend/src/modules/documents/documents.service.ts` - Improved error handling
- ✅ `backend/src/modules/tasks/tasks.service.ts` - Improved error handling
- ✅ `backend/src/utils/verify-service-role.ts` - Verification utility

## Next Steps

After running the migration:

1. ✅ Restart your backend server
2. ✅ Test the operation that was failing
3. ✅ Check logs for any remaining issues
4. ✅ If still failing, run the verification queries above

## Support

If you're still having issues after following all steps:

1. Check `backend/RLS_TROUBLESHOOTING.md` for more detailed diagnostics
2. Review backend logs for specific error messages
3. Verify all environment variables are set correctly
4. Ensure the migration ran without errors

---

**This fix is permanent and comprehensive. It should resolve all RLS issues with the service role.**










