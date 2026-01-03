# Fix Storage Upload 400 Error

## The Error

```
Request URL: https://...supabase.co/storage/v1/object/documents/...
Status Code: 400 Bad Request
```

This error occurs when trying to upload files to Supabase Storage.

## Root Cause

The 400 error typically means:
1. **Storage bucket doesn't exist**
2. **Storage bucket RLS policies are blocking uploads**
3. **Storage bucket is not public** (required for signed URLs)
4. **User is not authenticated** properly

## Complete Fix (4 Steps)

### Step 1: Create Storage Bucket

1. **Go to Supabase Dashboard**:
   - Navigate to **Storage** in the left sidebar
   - Click **New bucket**

2. **Configure Bucket**:
   - **Name**: `documents`
   - **Public bucket**: ✅ **CHECK THIS** (required for signed URLs)
   - **File size limit**: Set to maximum (e.g., 500MB) or based on your plan
   - **Allowed MIME types**: Leave empty (backend validates)

3. **Click Create**

### Step 2: Run Storage RLS Migration

1. **Open Supabase SQL Editor**
2. **Run the migration**:
   - Open file: `backend/src/database/migrations/028_fix_storage_bucket_rls_complete.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

This migration:
- ✅ Creates policies for authenticated users to upload/read/delete
- ✅ Creates policy for service_role to bypass RLS
- ✅ Grants storage permissions to service_role

### Step 3: Verify Bucket is Public

1. **Go to Storage** → **Buckets**
2. **Click on `documents` bucket**
3. **Check Settings**:
   - ✅ **Public bucket** should be **ENABLED**
   - If not, click **Edit** and enable it

### Step 4: Verify User Authentication

The frontend needs to be authenticated to upload. Check:

1. **User is logged in** (has valid session)
2. **Frontend has Supabase credentials**:
   - `NEXT_PUBLIC_SUPABASE_URL` is set
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

## Verification

After applying the fix, test upload:

1. **Try uploading a file** through your app
2. **Check browser console** for any errors
3. **Check Supabase Storage** → **documents** bucket to see if file appears

## Troubleshooting

### Still Getting 400 Error?

1. **Check Storage Bucket Exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'documents';
   ```
   If empty, create the bucket (Step 1).

2. **Check RLS Policies**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE schemaname = 'storage' 
   AND tablename = 'objects'
   AND policyname LIKE '%documents%';
   ```
   Should show 4 policies (upload, read, delete, service_role).

3. **Check Bucket is Public**:
   ```sql
   SELECT public FROM storage.buckets WHERE name = 'documents';
   ```
   Should return `true`.

4. **Check User Authentication**:
   - Open browser DevTools → Network tab
   - Look for the upload request
   - Check if it has `Authorization: Bearer ...` header
   - If missing, user is not authenticated

5. **Check Frontend Environment Variables**:
   ```bash
   # In frontend directory
   cat .env.local | grep SUPABASE
   ```
   Should show:
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

### Common Issues

**Issue**: "Bucket not found"
- **Fix**: Create the bucket (Step 1)

**Issue**: "Permission denied"
- **Fix**: Run the RLS migration (Step 2)

**Issue**: "Bucket is private"
- **Fix**: Make bucket public (Step 3)

**Issue**: "User not authenticated"
- **Fix**: Ensure user is logged in and has valid session

## Quick Checklist

- [ ] Storage bucket `documents` exists
- [ ] Bucket is **PUBLIC** (not private)
- [ ] Migration `028_fix_storage_bucket_rls_complete.sql` has been run
- [ ] User is authenticated (has valid session)
- [ ] Frontend has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] Backend has `SUPABASE_SERVICE_ROLE_KEY` set

## Related Files

- `backend/src/database/migrations/028_fix_storage_bucket_rls_complete.sql` - Storage RLS migration
- `frontend/utils/supabase.js` - Supabase client initialization
- `frontend/utils/fileUpload.js` - File upload utility

---

**After completing all 4 steps, the storage upload should work!** 🚀

