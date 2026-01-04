# RLS Policy Violation Fix Summary

## Problem
Error: `{statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy"}`

This error occurs when the backend tries to insert/update/delete rows in Supabase tables with RLS enabled, but the operation is blocked by RLS policies.

## Root Cause
The service role should automatically bypass RLS, but if the `SUPABASE_SERVICE_ROLE_KEY` is not configured correctly, RLS policies are still enforced.

## Solutions Implemented

### 1. Created Migration for Service Role RLS Bypass
**File**: `backend/src/database/migrations/026_fix_service_role_rls_bypass.sql`

This migration:
- Grants explicit permissions to `service_role` on all tables with RLS enabled
- Ensures service role can perform operations without RLS restrictions
- Provides safety measure even though service role should bypass RLS automatically

**To Apply**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of the migration file
3. Run the SQL

### 2. Improved Error Handling
**Files Updated**:
- `backend/src/modules/documents/documents.service.ts`
- `backend/src/modules/tasks/tasks.service.ts`

**Improvements**:
- Added detailed diagnostic logging for RLS errors
- Better error messages for users
- Logs include service role key status, user info, and membership status

### 3. Created Troubleshooting Guide
**File**: `backend/RLS_TROUBLESHOOTING.md`

Comprehensive guide covering:
- Step-by-step troubleshooting
- Common issues and fixes
- Diagnostic information
- Quick fix checklist

## Quick Fix Steps

1. **Set Service Role Key**:
   ```bash
   # In backend/.env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   Get the key from: Supabase Dashboard → Settings → API → `service_role` key

2. **Restart Backend Server**:
   ```bash
   npm run dev
   # or
   npm start
   ```

3. **Run Migration**:
   - Open Supabase SQL Editor
   - Run `backend/src/database/migrations/026_fix_service_role_rls_bypass.sql`

4. **Verify**:
   - Check backend logs for `serviceRoleKeySet: true`
   - Try the operation that was failing
   - Check logs for detailed error information if it still fails

## Verification

After applying the fix, verify:

1. **Service Role Key is Set**:
   - Backend logs show `serviceRoleKeySet: true`
   - No errors about missing service role key

2. **Migration Applied**:
   ```sql
   SELECT * FROM information_schema.role_table_grants 
   WHERE grantee = 'service_role';
   ```

3. **Operations Work**:
   - Try creating a document/task
   - Check that no RLS errors occur
   - Verify data is inserted correctly

## Related Files

- `backend/src/config/supabase.ts` - Supabase client configuration
- `backend/src/config/index.ts` - Environment variable validation
- `backend/src/database/migrations/026_fix_service_role_rls_bypass.sql` - RLS bypass migration
- `backend/RLS_TROUBLESHOOTING.md` - Detailed troubleshooting guide

## Next Steps

If the error persists:
1. Check `backend/RLS_TROUBLESHOOTING.md` for detailed diagnostics
2. Review backend logs for specific error details
3. Verify user has active company membership
4. Ensure all migrations have been run


