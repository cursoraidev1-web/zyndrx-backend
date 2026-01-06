# RLS (Row-Level Security) Troubleshooting Guide

## Error: "new row violates row-level security policy"

This error occurs when trying to insert, update, or delete rows in a Supabase table that has Row-Level Security (RLS) enabled, but the operation is being blocked by RLS policies.

## Root Cause

The backend uses Supabase's **service role key** which should automatically bypass RLS policies. If you're seeing this error, it means:

1. **Service role key is not configured correctly** - The `SUPABASE_SERVICE_ROLE_KEY` environment variable is missing or incorrect
2. **Service role permissions are insufficient** - The service role needs explicit grants on tables
3. **RLS policies are too restrictive** - Even though service role should bypass RLS, policies might need adjustment

## Solution Steps

### Step 1: Verify Service Role Key Configuration

1. **Check Environment Variable**:
   ```bash
   # In backend directory
   echo $SUPABASE_SERVICE_ROLE_KEY
   # Should output a long JWT token starting with 'eyJ...'
   ```

2. **Get Service Role Key from Supabase**:
   - Go to Supabase Dashboard
   - Navigate to Settings → API
   - Copy the `service_role` key (NOT the `anon` key)
   - It should be a long JWT token

3. **Set in Backend Environment**:
   ```bash
   # In backend/.env file
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Restart Backend Server**:
   ```bash
   # After setting the environment variable, restart the server
   npm run dev
   # or
   npm start
   ```

### Step 2: Run RLS Bypass Migration

Run the migration to grant explicit permissions to the service role:

1. **Open Supabase SQL Editor**:
   - Go to Supabase Dashboard
   - Navigate to SQL Editor

2. **Run Migration**:
   ```sql
   -- Copy and paste the contents of:
   -- backend/src/database/migrations/026_fix_service_role_rls_bypass.sql
   ```

   Or run it directly:
   ```bash
   # If you have Supabase CLI configured
   supabase db push
   ```

### Step 3: Verify Service Role Client Configuration

Check that the backend is using the service role key:

**File**: `backend/src/config/supabase.ts`

```typescript
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  config.supabase.url,
  config.supabase.serviceRoleKey,  // ← Should use serviceRoleKey, NOT anonKey
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### Step 4: Test Service Role Bypass

Test if the service role can bypass RLS:

1. **Check Backend Logs**:
   - Look for error messages with "RLS" or "row-level security"
   - Check the diagnostic information in the logs

2. **Verify in Supabase**:
   ```sql
   -- In Supabase SQL Editor
   -- This should work without RLS checks when using service role
   SET ROLE service_role;
   SELECT * FROM documents LIMIT 1;
   ```

## Common Issues

### Issue 1: Service Role Key Not Set

**Symptoms**:
- Error: "new row violates row-level security policy"
- Backend logs show: `serviceRoleKeySet: false`

**Fix**:
1. Set `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`
2. Restart backend server

### Issue 2: Wrong Key Used

**Symptoms**:
- Error persists after setting environment variable
- Service role key length is different from expected

**Fix**:
1. Verify the key matches Supabase Dashboard → Settings → API → `service_role` key
2. Ensure you're using `service_role` key, NOT `anon` key
3. Restart backend server

### Issue 3: Migration Not Run

**Symptoms**:
- Service role key is set correctly
- Error still occurs

**Fix**:
1. Run migration `026_fix_service_role_rls_bypass.sql` in Supabase SQL Editor
2. Verify grants were applied:
   ```sql
   SELECT * FROM information_schema.role_table_grants 
   WHERE grantee = 'service_role';
   ```

### Issue 4: User Membership Issues

**Symptoms**:
- Error occurs for specific users
- User doesn't have active company membership

**Fix**:
1. Check user company membership:
   ```sql
   SELECT * FROM user_companies 
   WHERE user_id = 'USER_ID' AND company_id = 'COMPANY_ID';
   ```

2. Ensure membership status is 'active':
   ```sql
   UPDATE user_companies 
   SET status = 'active' 
   WHERE user_id = 'USER_ID' AND company_id = 'COMPANY_ID';
   ```

## Diagnostic Information

When an RLS error occurs, the backend logs will include:

- `serviceRoleKeySet`: Whether the service role key is configured
- `serviceRoleKeyLength`: Length of the service role key
- `serviceRoleKeyPrefix`: First 20 characters of the key (for verification)
- `userId`: The user ID attempting the operation
- `companyId`: The company ID
- `membership`: User's company membership status

## Tables Affected

The following tables have RLS enabled and may be affected:

- `users`
- `companies`
- `user_companies`
- `projects`
- `project_members`
- `tasks`
- `comments`
- `documents`
- `prds`
- `prd_versions`
- `notifications`
- `audit_logs`
- `subscriptions`
- `teams`
- `handoffs`
- `task_attachments`
- `company_invites`
- `feedback`
- `push_subscriptions`

## Quick Fix Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in `backend/.env`
- [ ] Service role key matches Supabase Dashboard → Settings → API → `service_role` key
- [ ] Backend server has been restarted after setting environment variable
- [ ] Migration `026_fix_service_role_rls_bypass.sql` has been run
- [ ] User has active membership in the company (`user_companies.status = 'active'`)
- [ ] Backend logs show `serviceRoleKeySet: true`

## Still Having Issues?

If the error persists after following all steps:

1. **Check Backend Logs**: Look for detailed error messages and diagnostic information
2. **Verify Supabase Configuration**: Ensure RLS is enabled and policies are correct
3. **Test with Direct SQL**: Try inserting a row directly in Supabase SQL Editor with service role
4. **Contact Support**: Provide backend logs and error details

## Related Files

- `backend/src/config/supabase.ts` - Supabase client configuration
- `backend/src/config/index.ts` - Environment variable configuration
- `backend/src/database/migrations/026_fix_service_role_rls_bypass.sql` - RLS bypass migration
- `backend/src/modules/documents/documents.service.ts` - Example service with RLS error handling








