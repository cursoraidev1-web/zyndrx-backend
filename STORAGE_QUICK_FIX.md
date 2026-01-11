# Quick Fix for Storage Upload 400 Error

## The Problem
```
Status Code: 400 Bad Request
When uploading to: /storage/v1/object/documents/...
```

## Quick Fix (3 Steps)

### Step 1: Create Storage Bucket (if missing)

1. **Supabase Dashboard** → **Storage** → **New bucket**
2. **Name**: `documents`
3. **✅ Public bucket** (CHECK THIS!)
4. **Create**

### Step 2: Run Storage RLS Migration

1. **Supabase Dashboard** → **SQL Editor**
2. **Open**: `backend/src/database/migrations/028_fix_storage_bucket_rls_complete.sql`
3. **Copy all** → **Paste** → **Run**

### Step 3: Verify Bucket is Public

1. **Storage** → **Buckets** → **documents**
2. **Settings** → **✅ Public bucket** should be enabled
3. If not, **Edit** → **Enable** → **Save**

## Test

Try uploading a file again. It should work! ✅

## Still Not Working?

See `STORAGE_UPLOAD_FIX.md` for detailed troubleshooting.










