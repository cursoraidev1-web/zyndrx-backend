# Supabase Storage Bucket Setup Guide

This guide explains how to set up the Supabase Storage bucket for document uploads.

---

## Prerequisites

1. **Supabase Project**
   - Access to your Supabase project dashboard
   - Admin access to configure Storage

2. **Storage Bucket Name**
   - Default bucket name: `documents`
   - Can be customized in backend configuration

---

## Step 1: Create Storage Bucket

1. **Navigate to Storage**
   - Go to your Supabase project dashboard
   - Click on **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **New bucket** button
   - Enter bucket name: `documents`
   - **Important:** Make bucket **Public** (uncheck "Private bucket")
     - This allows signed URLs to work properly
     - Access is still controlled via RLS policies

3. **Configure Bucket Settings**
   - **File size limit:** Set to maximum (e.g., 500MB) or based on your plan
   - **Allowed MIME types:** Leaxve empty to allow all types (backend validates)
   - **Public bucket:** ✅ Enabled (for signed URLs)

4. **Click Create**

---

## Step 2: Configure Row Level Security (RLS) Policies

RLS policies control who can upload, read, and delete files.

### 2.1 Enable RLS

1. Go to **Storage** → **Policies** tab
2. Select the `documents` bucket
3. Ensure **RLS is enabled** (should be enabled by default)

### 2.2 Create Upload Policy

**Policy Name:** `Allow authenticated users to upload documents`

**Policy Definition:**
```sql
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Supabase Dashboard Method:**
1. Click **New Policy**
2. Policy name: `Allow authenticated users to upload documents`
3. Allowed operation: `INSERT`
4. Target roles: `authenticated`
5. Policy definition:
   ```sql
   bucket_id = 'documents'
   ```
6. Click **Review** → **Save policy**

### 2.3 Create Read Policy

**Policy Name:** `Allow company members to read documents`

**Policy Definition:**
```sql
CREATE POLICY "Allow company members to read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
);
```

**Supabase Dashboard Method:**
1. Click **New Policy**
2. Policy name: `Allow company members to read documents`
3. Allowed operation: `SELECT`
4. Target roles: `authenticated`
5. Policy definition:
   ```sql
   bucket_id = 'documents'
   ```
6. Click **Review** → **Save policy**

### 2.4 Create Delete Policy

**Policy Name:** `Allow document owners to delete`

**Policy Definition:**
```sql
CREATE POLICY "Allow document owners to delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Supabase Dashboard Method:**
1. Click **New Policy**
2. Policy name: `Allow document owners to delete`
3. Allowed operation: `DELETE`
4. Target roles: `authenticated`
5. Policy definition:
   ```sql
   bucket_id = 'documents'
   ```
6. Click **Review** → **Save policy**

---

## Step 3: Alternative - Use SQL Editor (Recommended)

For more control, use the SQL Editor to create policies:

1. Go to **SQL Editor** in Supabase dashboard
2. Create a new query
3. Paste the following SQL:

```sql
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow company members to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow document owners to delete" ON storage.objects;

-- Upload Policy: Users can upload to their company's folder
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Read Policy: Company members can read documents
CREATE POLICY "Allow company members to read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
);

-- Delete Policy: Users can delete documents they uploaded
CREATE POLICY "Allow document owners to delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
);
```

4. Click **Run** to execute

---

## Step 4: Verify Bucket Configuration

### 4.1 Test Upload (via Supabase Dashboard)

1. Go to **Storage** → **documents** bucket
2. Click **Upload file**
3. Select a test file
4. Upload should succeed

### 4.2 Test via API

Use the backend API to test:

```bash
# Request upload token
curl -X POST http://localhost:5000/api/v1/documents/upload-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "file_name": "test.pdf",
    "file_size": 1024,
    "file_type": "application/pdf"
  }'
```

---

## Step 5: Configure CORS (If Needed)

If uploading from a web browser, ensure CORS is configured:

1. Go to **Storage** → **Settings**
2. Add CORS origins:
   - `http://localhost:3000` (development)
   - `https://your-production-domain.com` (production)
3. Allowed methods: `GET`, `POST`, `PUT`, `DELETE`
4. Allowed headers: `*`
5. Max age: `3600`

---

## Step 6: Environment Variables

Ensure your backend has these environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these:**
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
   - **anon public key** → `SUPABASE_ANON_KEY`

---

## Storage Structure

Files are stored with this structure:

```
documents/
  {company_id}/
    {project_id}/
      {timestamp}-{filename}
```

**Example:**
```
documents/
  abc123-company-id/
    xyz789-project-id/
      1704067200000-project-requirements.pdf
```

This structure:
- Organizes files by company and project
- Prevents filename conflicts
- Makes cleanup easier

---

## File Size Limits

Configure limits based on your plan:

| Plan | Max File Size | Total Storage |
|------|---------------|---------------|
| Free | 10 MB | 1 GB |
| Pro | 100 MB | 5 GB |
| Enterprise | 500 MB | 100 GB |

**To set bucket file size limit:**
1. Go to **Storage** → **documents** bucket
2. Click **Settings**
3. Set **File size limit** (in bytes)
4. Save

**Note:** Backend also validates file sizes, so set bucket limit higher than backend limit.

---

## Security Best Practices

1. **Never expose service_role key in frontend**
   - Only use in backend
   - Use anon key in frontend

2. **Use signed URLs for downloads**
   - URLs expire after 5 minutes
   - Prevents unauthorized access

3. **Validate file types server-side**
   - Don't rely on client-side validation
   - Backend checks MIME types

4. **Monitor storage usage**
   - Set up alerts for storage limits
   - Track usage per company

5. **Regular cleanup**
   - Delete orphaned files
   - Archive old documents

---

## Troubleshooting

### Issue: "Bucket not found"

**Solution:**
- Verify bucket name is exactly `documents`
- Check bucket exists in Storage dashboard
- Ensure bucket is not deleted

### Issue: "Permission denied" on upload

**Solution:**
- Check RLS policies are created
- Verify user is authenticated
- Check policy conditions match your file path structure

### Issue: "File too large"

**Solution:**
- Check bucket file size limit
- Verify backend file size validation
- Check user's plan limits

### Issue: "CORS error" in browser

**Solution:**
- Add frontend origin to CORS settings
- Verify CORS configuration in Storage settings
- Check browser console for specific CORS error

### Issue: "Signed URL expired"

**Solution:**
- Signed URLs expire after 5 minutes
- Request new download URL if expired
- Implement URL refresh logic in frontend

---

## Advanced Configuration

### Custom Bucket Name

If you want to use a different bucket name:

1. Create bucket with your custom name
2. Update backend configuration:
   ```typescript
   // In documents.service.ts
   const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'documents';
   ```

3. Update RLS policies to use new bucket name

### Folder Structure Customization

To change folder structure, update backend upload path generation:

```typescript
// Current: documents/{company_id}/{project_id}/{timestamp}-{filename}
// Custom: documents/{project_id}/{year}/{month}/{filename}
```

Update in `documents.service.ts` → `generateUploadToken` method.

---

## Monitoring and Maintenance

### Check Storage Usage

1. Go to **Storage** → **documents** bucket
2. View total size and file count
3. Use backend API: `GET /api/v1/subscriptions/usage`

### Clean Up Orphaned Files

Files may become orphaned if:
- Document metadata is deleted but file remains
- Upload fails after file is uploaded

**Manual cleanup:**
1. List all files in bucket
2. Check against database `documents` table
3. Delete files not in database

**Automated cleanup:**
- Backend can implement cleanup job
- Run periodically to remove orphaned files

---

## Support

If you need help:

1. Check Supabase Storage documentation: https://supabase.com/docs/guides/storage
2. Review backend logs for errors
3. Check RLS policy conditions
4. Verify environment variables are correct

---

## Next Steps

After setup:

1. Test upload via frontend
2. Verify files appear in Storage dashboard
3. Test download functionality
4. Monitor storage usage
5. Set up alerts for storage limits




