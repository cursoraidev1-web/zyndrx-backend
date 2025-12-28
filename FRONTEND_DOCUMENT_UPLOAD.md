# Frontend Document Upload Implementation Guide

This guide explains how to implement document uploads in the frontend using the Zyndrx backend API.

## Overview

The document upload process uses a **presigned URL** approach:
1. Request upload permission from backend
2. Upload file directly to Supabase Storage
3. Save document metadata to backend

This approach provides security, validation, and storage tracking while maintaining fast upload speeds.

---

## Prerequisites

1. **Supabase Client Setup**
   - Install `@supabase/supabase-js`: `npm install @supabase/supabase-js`
   - Configure Supabase client with your project URL and anon key:
     ```typescript
     import { createClient } from '@supabase/supabase-js';
     
     const supabaseClient = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     );
     ```
   - Ensure Storage bucket `documents` is set up (see `SUPABASE_STORAGE_SETUP.md`)
   - **Important:** The Supabase client must be initialized with the user's JWT token for authenticated uploads

2. **Backend API Base URL**
   - Development: `http://localhost:5000/api/v1`
   - Production: `https://your-backend-url.com/api/v1`

3. **Authentication**
   - All requests require JWT token in `Authorization` header
   - Format: `Authorization: Bearer <token>`

---

## API Endpoints

### 1. Request Upload Token

**Endpoint:** `POST /api/v1/documents/upload-token`

**Request Body:**
```json
{
  "project_id": "uuid-string",
  "file_name": "document.pdf",
  "file_size": 1048576,
  "file_type": "application/pdf"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "upload_path": "documents/{company_id}/{project_id}/{timestamp}-{filename}",
    "expires_at": "2024-01-01T12:00:00Z",
    "max_file_size": 10485760,
    "allowed_types": ["application/pdf", "image/jpeg", "text/plain", ...]
  }
}
```

**Note:** The backend returns `upload_path` only. You'll upload directly to Supabase Storage using the Supabase client with this path.

**Error Responses:**
- `400 Bad Request`: Invalid request body or missing fields
- `403 Forbidden`: User doesn't have permission to upload to this project
- `413 Payload Too Large`: File size exceeds plan limit
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Example:**
```typescript
const requestUploadToken = async (
  projectId: string,
  file: File
): Promise<UploadTokenResponse> => {
  const response = await fetch(`${API_BASE_URL}/documents/upload-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      project_id: projectId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to request upload token');
  }

  return response.json();
};
```

---

### 2. Upload File to Supabase Storage

**After receiving upload token, upload directly to Supabase Storage:**

```typescript
const uploadFileToStorage = async (
  file: File,
  uploadPath: string,
  supabaseClient: any // Your Supabase client instance (must be authenticated)
): Promise<void> => {
  // Upload directly to Supabase Storage using the upload path from backend
  // The upload path is pre-authorized by the backend endpoint
  const { data, error } = await supabaseClient.storage
    .from('documents')
    .upload(uploadPath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Note: Supabase Storage SDK doesn't support onUploadProgress in the current version
  // For progress tracking, you may need to implement chunked uploads or use XMLHttpRequest
};
```

---

### 3. Save Document Metadata

**Endpoint:** `POST /api/v1/documents`

**Request Body:**
```json
{
  "project_id": "uuid-string",
  "title": "Project Requirements Document",
  "file_path": "documents/{company_id}/{project_id}/{timestamp}-document.pdf",
  "file_type": "application/pdf",
  "file_size": 1048576,
  "tags": ["requirements", "planning"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "title": "Project Requirements Document",
    "file_url": "https://storage-url/...",
    "file_type": "application/pdf",
    "file_size": 1048576,
    "tags": ["requirements", "planning"],
    "uploaded_by": "uuid",
    "created_at": "2024-01-01T12:00:00Z",
    "uploader": {
      "full_name": "John Doe"
    }
  }
}
```

**Example:**
```typescript
const saveDocumentMetadata = async (
  projectId: string,
  title: string,
  filePath: string,
  fileType: string,
  fileSize: number,
  tags?: string[]
): Promise<Document> => {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      project_id: projectId,
      title,
      file_path: filePath,
      file_type: fileType,
      file_size: fileSize,
      tags: tags || []
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save document');
  }

  return response.json();
};
```

---

### 4. Get Project Documents

**Endpoint:** `GET /api/v1/documents?project_id={project_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "title": "Document Title",
      "file_url": "https://storage-url/...",
      "file_type": "application/pdf",
      "file_size": 1048576,
      "tags": ["tag1"],
      "uploaded_by": "uuid",
      "created_at": "2024-01-01T12:00:00Z",
      "uploader": {
        "full_name": "John Doe"
      }
    }
  ]
}
```

---

### 5. Download Document

**Endpoint:** `GET /api/v1/documents/{document_id}/download`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "download_url": "https://supabase-storage-url/...",
    "expires_at": "2024-01-01T12:05:00Z"
  }
}
```

**Note:** The download URL is a signed URL that expires after 5 minutes. Use it immediately to download the file.

---

### 6. Delete Document

**Endpoint:** `DELETE /api/v1/documents/{document_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## Complete Upload Flow Example

```typescript
interface UploadDocumentParams {
  projectId: string;
  file: File;
  title: string;
  tags?: string[];
}

const uploadDocument = async ({
  projectId,
  file,
  title,
  tags
}: UploadDocumentParams): Promise<Document> => {
  try {
    // Step 1: Request upload token
    const tokenResponse = await requestUploadToken(projectId, file);
    const { upload_path } = tokenResponse.data;

    // Step 2: Upload file to Supabase Storage using Supabase client
    await uploadFileToStorage(file, upload_path, supabaseClient);

    // Step 3: Save document metadata
    const document = await saveDocumentMetadata(
      projectId,
      title,
      upload_path,
      file.type,
      file.size,
      tags
    );

    return document;
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
};
```

---

## React Component Example

```typescript
import { useState } from 'react';

const DocumentUploader = ({ projectId }: { projectId: string }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Request upload token
      setProgress(10);
      const tokenResponse = await requestUploadToken(projectId, file);
      const { upload_path } = tokenResponse.data;

      // Step 2: Upload to storage
      setProgress(30);
      await uploadFileToStorage(file, upload_path);

      // Step 3: Save metadata
      setProgress(80);
      await saveDocumentMetadata(
        projectId,
        file.name,
        upload_path,
        file.type,
        file.size
      );

      setProgress(100);
      alert('Document uploaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileUpload}
        disabled={uploading}
        accept=".pdf,.doc,.docx,.txt,.jpg,.png"
      />
      {uploading && (
        <div>
          <progress value={progress} max={100} />
          <span>{progress}%</span>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

---

## File Type Restrictions

The backend validates file types. Allowed types include:

- **Documents:** `.pdf`, `.doc`, `.docx`, `.txt`, `.md`
- **Images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **Spreadsheets:** `.xls`, `.xlsx`, `.csv`
- **Archives:** `.zip`, `.rar` (max 50MB)

**Maximum file sizes:**
- Free plan: 10MB per file
- Pro plan: 100MB per file
- Enterprise: 500MB per file

---

## Error Handling

Always handle these error scenarios:

1. **Network errors:** Retry with exponential backoff
2. **401 Unauthorized:** Refresh token and retry
3. **403 Forbidden:** Show permission error to user
4. **413 Payload Too Large:** Show file size limit error
5. **429 Too Many Requests:** Implement rate limiting on frontend
6. **500 Internal Server Error:** Log error and show generic message

---

## Best Practices

1. **Validate file before upload:**
   ```typescript
   const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
   const ALLOWED_TYPES = ['application/pdf', 'image/jpeg'];

   if (file.size > MAX_FILE_SIZE) {
     throw new Error('File too large');
   }
   if (!ALLOWED_TYPES.includes(file.type)) {
     throw new Error('File type not allowed');
   }
   ```

2. **Show upload progress:**
   - Use Supabase Storage upload progress callbacks
   - Update UI with percentage complete

3. **Handle upload cancellation:**
   - Allow users to cancel uploads
   - Clean up partial uploads if possible

4. **Optimize for large files:**
   - Consider chunked uploads for files > 50MB
   - Show estimated time remaining

5. **Cache document lists:**
   - Cache GET requests to reduce API calls
   - Invalidate cache after upload/delete

---

## TypeScript Types

```typescript
interface UploadTokenResponse {
  success: boolean;
  data: {
    upload_path: string;
    expires_at: string;
    max_file_size: number;
    allowed_types: string[];
  };
}

interface Document {
  id: string;
  project_id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
  tags: string[];
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name: string;
  };
}

interface DocumentListResponse {
  success: boolean;
  data: Document[];
}

interface DownloadResponse {
  success: boolean;
  data: {
    download_url: string;
    expires_at: string;
  };
}
```

---

## Testing

Test your implementation with:

1. **Valid uploads:** Small PDF, image, text file
2. **Invalid file types:** `.exe`, `.bat`, etc.
3. **Oversized files:** Files exceeding plan limits
4. **Network failures:** Simulate offline/network errors
5. **Concurrent uploads:** Multiple files at once
6. **Permission errors:** Upload to project user doesn't have access to

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify Supabase Storage bucket is configured (see `SUPABASE_STORAGE_SETUP.md`)
3. Ensure authentication token is valid
4. Check backend logs for server-side errors
5. Verify file size and type restrictions

---

## Next Steps

After implementing uploads:

1. Add drag-and-drop file upload UI
2. Implement file preview (PDF viewer, image viewer)
3. Add file versioning support
4. Implement file sharing/permissions
5. Add file search and filtering

