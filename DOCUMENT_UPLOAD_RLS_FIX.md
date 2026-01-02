# Fix Document Upload RLS Error

## Error
```
{
    "statusCode": "403",
    "error": "Unauthorized",
    "message": "new row violates row-level security policy"
}
```

## Root Cause

The error occurs when trying to upload documents because:
1. **Service Role Key Not Configured**: The backend uses `supabaseAdmin` (service role) which should bypass RLS, but if the service role key isn't set correctly, RLS policies are still enforced.
2. **User Company Membership**: The RLS policy requires the user to be an active member of the company.

## Solution

### Step 1: Verify Service Role Key

1. **Check Environment Variable**:
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your backend environment
   - This should be the **service_role** key from Supabase (NOT the anon key)
   - Get it from: Supabase Dashboard → Settings → API → `service_role` key

2. **Verify in Backend**:
   - Check `backend/.env` or your deployment environment variables
   - The key should start with `eyJ...` and be different from the anon key

### Step 2: Run RLS Policy Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix Documents RLS Policy
DROP POLICY IF EXISTS "Company members can create documents" ON documents;

CREATE POLICY "Company members can create documents" ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = documents.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.status = 'active'
  )
  AND uploaded_by = auth.uid()
  AND documents.company_id IS NOT NULL
  AND documents.project_id IS NOT NULL
);
```

### Step 3: Verify User Company Membership

Ensure the user has an active membership in the company:

```sql
-- Check user company membership
SELECT uc.*, u.email, u.full_name
FROM user_companies uc
JOIN users u ON u.id = uc.user_id
WHERE uc.user_id = 'YOUR_USER_ID'  -- Replace with actual user ID
AND uc.company_id = 'YOUR_COMPANY_ID';  -- Replace with actual company ID

-- If missing, create membership:
INSERT INTO user_companies (user_id, company_id, role, status)
VALUES ('USER_ID', 'COMPANY_ID', 'admin', 'active')
ON CONFLICT (user_id, company_id) DO UPDATE SET status = 'active';
```

### Step 4: Verify Storage Bucket RLS

Ensure storage bucket policies allow uploads:

```sql
-- Check storage policies
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%documents%';

-- If needed, recreate upload policy:
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IS NOT NULL
);
```

### Step 5: Test Upload

After applying fixes:
1. Restart your backend server
2. Try uploading a document again
3. Check backend logs for detailed error messages

## Troubleshooting

### If service role still doesn't work:

1. **Verify Service Role Key**:
   ```bash
   # In backend directory
   echo $SUPABASE_SERVICE_ROLE_KEY
   # Should output a long JWT token
   ```

2. **Check Supabase Client Configuration**:
   - File: `backend/src/config/supabase.ts`
   - Ensure `supabaseAdmin` uses `config.supabase.serviceRoleKey`
   - NOT `config.supabase.anonKey`

3. **Test Service Role**:
   ```sql
   -- In Supabase SQL Editor, test if service role bypasses RLS
   -- This should work without RLS checks
   SET ROLE service_role;
   SELECT * FROM documents LIMIT 1;
   ```

### Common Issues:

- **Missing company_id**: Ensure the user has a `companyId` in their JWT token
- **Inactive membership**: User's `user_companies.status` must be `'active'`
- **Wrong service role key**: Using anon key instead of service role key

## Quick Fix (If Service Role Works)

If your service role is configured correctly, the backend should bypass RLS automatically. The error might be from:
1. Frontend uploading directly to storage (storage bucket RLS)
2. Missing user company membership

Check the backend logs to see exactly where the error occurs.

