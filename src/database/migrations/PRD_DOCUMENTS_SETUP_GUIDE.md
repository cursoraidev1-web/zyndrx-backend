# PRD and Documents Setup Guide

This guide explains how to set up PRD (Product Requirements Documents) and Documents functionality.

## Prerequisites

- Supabase project set up
- Database migrations already run (including `001_add_companies.sql`)
- Tables `prds` and `documents` exist with `company_id` column

## Step-by-Step Execution

### Step 1: Create Storage Bucket (Manual - Supabase Dashboard)

1. Go to **Storage** in your Supabase project dashboard
2. Click **New bucket**
3. Bucket name: `documents`
4. **Important:** Make it **Public** (uncheck "Private bucket") - required for signed URLs
5. File size limit: Set based on your plan (e.g., 500MB for enterprise)
6. Allowed MIME types: Leave empty (backend validates)
7. Click **Create**

### Step 2: Run SQL Migrations (Supabase SQL Editor)

Run these migrations in order in the Supabase SQL Editor:

1. **017_add_documents_bucket_rls.sql** - Storage bucket RLS policies
2. **018_add_prds_rls_policies.sql** - PRDs table RLS policies
3. **019_add_documents_rls_policies.sql** - Documents table RLS policies
4. **020_add_prd_versions_rls_policies.sql** - PRD versions table RLS policies
5. **022_add_prd_documents_indexes.sql** - Create indexes (if missing)

### Step 3: Verify Setup

Run **021_verify_prd_documents_setup.sql** to verify everything is set up correctly.

## Migration Files

- `017_add_documents_bucket_rls.sql` - Storage bucket RLS policies
- `018_add_prds_rls_policies.sql` - PRDs table RLS policies
- `019_add_documents_rls_policies.sql` - Documents table RLS policies
- `020_add_prd_versions_rls_policies.sql` - PRD versions table RLS policies
- `021_verify_prd_documents_setup.sql` - Verification queries
- `022_add_prd_documents_indexes.sql` - Indexes

## Important Notes

1. **Storage bucket must be PUBLIC** - Required for signed URLs. Access is still controlled via RLS policies.
2. **RLS policies use company_id** - All policies check that users belong to the company through the `user_companies` table.
3. **Application layer security** - Backend services also validate company_id for defense in depth.
4. **Path structure** - Documents stored as: `{company_id}/{project_id}/{timestamp}-{filename}`

## Testing

After setup, test:
- Creating a PRD
- Uploading a document
- Viewing PRDs/documents across different companies (should be isolated)
- Deleting PRDs/documents (only by creators/admins)


