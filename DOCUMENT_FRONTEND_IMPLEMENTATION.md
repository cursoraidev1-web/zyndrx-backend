# Document Upload & Download - Frontend Implementation Guide

This guide explains how to implement document upload and download functionality in your frontend application.

## Overview

The document system uses a **two-step upload process**:
1. **Request upload permission** from backend → Get upload path
2. **Upload file directly** to Supabase Storage
3. **Save document metadata** to backend database

Files are stored in Supabase Storage and accessed via signed URLs for downloads.

---

## Prerequisites

1. **Supabase Client** (already set up for OAuth)
   - `@supabase/supabase-js` package installed
   - Supabase client configured

2. **Backend API URL**
   - `VITE_API_URL` environment variable set

3. **Authentication**
   - User must be authenticated (JWT token)
   - User must have access to the project

---

## Architecture Flow

```
Frontend → Backend API (Request Upload Token)
    ↓
Backend validates & returns upload_path
    ↓
Frontend → Supabase Storage (Upload File)
    ↓
File stored in Supabase Storage
    ↓
Frontend → Backend API (Save Metadata)
    ↓
Document metadata saved to database
    ↓
Document ready for download/viewing
```

---

## Step 1: Create Document Service

Create `src/services/documentService.ts`:

```typescript
import { supabase } from '@/lib/supabase'; // Your Supabase client

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Types
export interface Document {
  id: string;
  project_id: string;
  prd_id?: string | null;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
  tags: string[];
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: {
    full_name: string;
  };
}

export interface UploadTokenResponse {
  upload_path: string;
  expires_at: string;
  max_file_size: number;
  allowed_types: string[];
}

export interface DocumentMetadata {
  project_id: string;
  title: string;
  file_path: string;
  file_type: string;
  file_size: number;
  tags?: string[];
  prd_id?: string;
}

export interface DownloadUrlResponse {
  download_url: string;
  expires_at: string;
}

export class DocumentService {
  /**
   * Get authorization header with JWT token
   */
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Step 1: Request upload token from backend
   * Validates file and gets upload path
   */
  static async requestUploadToken(
    projectId: string,
    file: File
  ): Promise<UploadTokenResponse> {
    const response = await fetch(`${API_URL}/documents/upload-token`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        project_id: projectId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request upload token');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Step 2: Upload file to Supabase Storage
   */
  static async uploadFileToStorage(
    uploadPath: string,
    file: File
  ): Promise<{ path: string }> {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(uploadPath, file, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return { path: data.path };
  }

  /**
   * Step 3: Save document metadata to backend
   */
  static async saveDocumentMetadata(
    metadata: DocumentMetadata
  ): Promise<Document> {
    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save document');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Complete upload flow (combines all 3 steps)
   */
  static async uploadDocument(
    projectId: string,
    file: File,
    title?: string,
    tags?: string[],
    prdId?: string
  ): Promise<Document> {
    try {
      // Step 1: Request upload token
      const tokenData = await this.requestUploadToken(projectId, file);

      // Step 2: Upload to Supabase Storage
      await this.uploadFileToStorage(tokenData.upload_path, file);

      // Step 3: Save metadata
      const document = await this.saveDocumentMetadata({
        project_id: projectId,
        title: title || file.name,
        file_path: tokenData.upload_path,
        file_type: file.type,
        file_size: file.size,
        tags: tags || [],
        prd_id: prdId,
      });

      return document;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all documents for a project
   */
  static async getProjectDocuments(projectId: string): Promise<Document[]> {
    const response = await fetch(
      `${API_URL}/documents?project_id=${projectId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch documents');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get single document by ID
   */
  static async getDocument(documentId: string): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/${documentId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch document');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get download URL (signed URL, expires in 5 minutes)
   */
  static async getDownloadUrl(documentId: string): Promise<string> {
    const response = await fetch(
      `${API_URL}/documents/${documentId}/download`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get download URL');
    }

    const result = await response.json();
    return result.data.download_url;
  }

  /**
   * Download document file
   */
  static async downloadDocument(documentId: string, fileName: string): Promise<void> {
    const downloadUrl = await this.getDownloadUrl(documentId);

    // Create temporary anchor element to trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Update document metadata (title, tags)
   */
  static async updateDocument(
    documentId: string,
    updates: { title?: string; tags?: string[] }
  ): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/${documentId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update document');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    const response = await fetch(`${API_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete document');
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file type icon/color (for UI)
   */
  static getFileTypeInfo(fileType: string): { icon: string; color: string } {
    if (fileType.includes('pdf')) {
      return { icon: '📄', color: 'red' };
    }
    if (fileType.includes('word') || fileType.includes('document')) {
      return { icon: '📝', color: 'blue' };
    }
    if (fileType.includes('image')) {
      return { icon: '🖼️', color: 'green' };
    }
    if (fileType.includes('sheet') || fileType.includes('excel')) {
      return { icon: '📊', color: 'green' };
    }
    if (fileType.includes('zip') || fileType.includes('rar')) {
      return { icon: '📦', color: 'gray' };
    }
    return { icon: '📎', color: 'gray' };
  }
}
```

---

## Step 2: Create Upload Component

Create `src/components/DocumentUpload.tsx`:

```typescript
import { useState, useRef } from 'react';
import { DocumentService } from '@/services/documentService';

interface DocumentUploadProps {
  projectId: string;
  onUploadSuccess?: (document: any) => void;
  onUploadError?: (error: Error) => void;
  prdId?: string;
}

export default function DocumentUpload({
  projectId,
  onUploadSuccess,
  onUploadError,
  prdId,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress (since Supabase doesn't provide progress events easily)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload document (all 3 steps)
      const document = await DocumentService.uploadDocument(
        projectId,
        file,
        undefined, // Use file name as title
        [], // No tags
        prdId
      );

      clearInterval(progressInterval);
      setProgress(100);

      // Success callback
      if (onUploadSuccess) {
        onUploadSuccess(document);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reset state after a delay
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      if (onUploadError) {
        onUploadError(err instanceof Error ? err : new Error('Upload failed'));
      }
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="document-upload">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.csv,.zip,.rar"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="upload-button"
      >
        {uploading ? `Uploading... ${progress}%` : 'Upload Document'}
      </button>

      {uploading && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}
```

---

## Step 3: Create Document List Component

Create `src/components/DocumentList.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { DocumentService, Document } from '@/services/documentService';

interface DocumentListProps {
  projectId: string;
}

export default function DocumentList({ projectId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await DocumentService.getProjectDocuments(projectId);
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      await DocumentService.downloadDocument(document.id, document.title);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await DocumentService.deleteDocument(documentId);
      loadDocuments(); // Reload list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading) {
    return <div>Loading documents...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="document-list">
      <h2>Documents ({documents.length})</h2>

      {documents.length === 0 ? (
        <p>No documents yet. Upload your first document!</p>
      ) : (
        <div className="document-grid">
          {documents.map((doc) => {
            const fileInfo = DocumentService.getFileTypeInfo(doc.file_type);
            return (
              <div key={doc.id} className="document-card">
                <div className="document-icon" style={{ color: fileInfo.color }}>
                  {fileInfo.icon}
                </div>
                
                <div className="document-info">
                  <h3>{doc.title}</h3>
                  <p className="document-meta">
                    {DocumentService.formatFileSize(doc.file_size)} • {doc.file_type}
                  </p>
                  <p className="document-uploader">
                    Uploaded by {doc.uploader?.full_name || 'Unknown'}
                  </p>
                  <p className="document-date">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="document-actions">
                  <button onClick={() => handleDownload(doc)}>
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>

                {doc.tags && doc.tags.length > 0 && (
                  <div className="document-tags">
                    {doc.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Step 4: Create Document Viewer/Download Component

Create `src/components/DocumentViewer.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { DocumentService, Document } from '@/services/documentService';

interface DocumentViewerProps {
  documentId: string;
  onClose?: () => void;
}

export default function DocumentViewer({ documentId, onClose }: DocumentViewerProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await DocumentService.getDocument(documentId);
      setDocument(doc);

      // Get download URL
      const url = await DocumentService.getDownloadUrl(documentId);
      setDownloadUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document && downloadUrl) {
      DocumentService.downloadDocument(document.id, document.title);
    }
  };

  const handleViewInNewTab = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  if (loading) {
    return <div>Loading document...</div>;
  }

  if (error || !document) {
    return <div className="error">Error: {error || 'Document not found'}</div>;
  }

  const fileInfo = DocumentService.getFileTypeInfo(document.file_type);
  const isImage = document.file_type.startsWith('image/');
  const isPdf = document.file_type === 'application/pdf';

  return (
    <div className="document-viewer">
      <div className="document-viewer-header">
        <h2>{document.title}</h2>
        <div className="document-actions">
          <button onClick={handleViewInNewTab}>Open in New Tab</button>
          <button onClick={handleDownload}>Download</button>
          {onClose && <button onClick={onClose}>Close</button>}
        </div>
      </div>

      <div className="document-viewer-content">
        {isImage ? (
          <img src={downloadUrl || ''} alt={document.title} />
        ) : isPdf ? (
          <iframe
            src={downloadUrl || ''}
            title={document.title}
            width="100%"
            height="600px"
          />
        ) : (
          <div className="document-preview">
            <div className="document-icon-large" style={{ color: fileInfo.color }}>
              {fileInfo.icon}
            </div>
            <p>Preview not available for this file type</p>
            <p>Click "Download" or "Open in New Tab" to view</p>
          </div>
        )}
      </div>

      <div className="document-viewer-footer">
        <div className="document-meta">
          <span>Size: {DocumentService.formatFileSize(document.file_size)}</span>
          <span>Type: {document.file_type}</span>
          <span>Uploaded: {new Date(document.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 5: Usage Example (Complete Page)

Create `src/pages/ProjectDocuments.tsx`:

```typescript
import { useState } from 'react';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import DocumentViewer from '@/components/DocumentViewer';

interface ProjectDocumentsProps {
  projectId: string;
}

export default function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    // Refresh document list
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="project-documents-page">
      <div className="page-header">
        <h1>Project Documents</h1>
        <DocumentUpload
          projectId={projectId}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>

      <DocumentList key={refreshKey} projectId={projectId} />

      {selectedDocumentId && (
        <DocumentViewer
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
        />
      )}
    </div>
  );
}
```

---

## API Endpoints Reference

### 1. Request Upload Token
```
POST /api/v1/documents/upload-token
Headers: Authorization: Bearer {token}
Body: {
  project_id: string (UUID),
  file_name: string,
  file_size: number,
  file_type: string
}

Response: {
  success: true,
  data: {
    upload_path: string,
    expires_at: string,
    max_file_size: number,
    allowed_types: string[]
  }
}
```

### 2. Save Document Metadata
```
POST /api/v1/documents
Headers: Authorization: Bearer {token}
Body: {
  project_id: string (UUID),
  title: string,
  file_path: string,
  file_type: string,
  file_size: number,
  tags?: string[],
  prd_id?: string (UUID)
}

Response: {
  success: true,
  data: Document
}
```

### 3. Get Project Documents
```
GET /api/v1/documents?project_id={uuid}
Headers: Authorization: Bearer {token}

Response: {
  success: true,
  data: Document[]
}
```

### 4. Get Single Document
```
GET /api/v1/documents/{id}
Headers: Authorization: Bearer {token}

Response: {
  success: true,
  data: Document
}
```

### 5. Get Download URL
```
GET /api/v1/documents/{id}/download
Headers: Authorization: Bearer {token}

Response: {
  success: true,
  data: {
    download_url: string,
    expires_at: string
  }
}
```

### 6. Update Document
```
PATCH /api/v1/documents/{id}
Headers: Authorization: Bearer {token}
Body: {
  title?: string,
  tags?: string[]
}

Response: {
  success: true,
  data: Document
}
```

### 7. Delete Document
```
DELETE /api/v1/documents/{id}
Headers: Authorization: Bearer {token}

Response: {
  success: true,
  message: "Document deleted successfully"
}
```

---

## Allowed File Types

```typescript
✅ Documents: PDF, Word (.doc, .docx), Text, Markdown
✅ Images: JPEG, PNG, GIF, WebP
✅ Spreadsheets: Excel (.xls, .xlsx), CSV
✅ Archives: ZIP, RAR
```

---

## File Size Limits

| Plan | Max File Size | Total Storage |
|------|--------------|---------------|
| Free | 10 MB | 1 GB |
| Pro | 100 MB | 5 GB |
| Enterprise | 500 MB | 100 GB |

---

## Error Handling

Common errors and how to handle them:

```typescript
// File too large
if (error.message.includes('exceeds limit')) {
  alert('File is too large for your plan');
}

// Invalid file type
if (error.message.includes('not allowed')) {
  alert('File type not supported');
}

// Storage limit reached
if (error.message.includes('Storage limit')) {
  alert('Storage limit reached. Please upgrade your plan or delete files.');
}

// Permission denied
if (error.message.includes('permission') || error.message.includes('403')) {
  alert('You do not have permission to perform this action');
}

// Network error
if (error.message.includes('network') || error.message.includes('fetch')) {
  alert('Network error. Please check your connection and try again.');
}
```

---

## Best Practices

1. **Validate files before upload**
   ```typescript
   const MAX_SIZE = 10 * 1024 * 1024; // 10MB
   if (file.size > MAX_SIZE) {
     alert('File is too large');
     return;
   }
   ```

2. **Show upload progress**
   - Use progress indicators
   - Disable form during upload
   - Show success/error messages

3. **Handle errors gracefully**
   - Show user-friendly error messages
   - Log errors for debugging
   - Allow retry on failure

4. **Optimize for large files**
   - Consider chunked uploads for very large files
   - Show file size warnings
   - Validate file size before requesting token

5. **Security**
   - Never expose service role keys
   - Always validate file types on frontend (backend also validates)
   - Use signed URLs for downloads

---

## Styling Examples (CSS)

```css
.document-upload {
  margin: 20px 0;
}

.upload-button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.upload-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  margin-top: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s;
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.document-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.document-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 12px;
}

.document-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.document-meta {
  font-size: 12px;
  color: #666;
  margin: 4px 0;
}

.document-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.document-actions button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.delete-button {
  color: #dc3545;
  border-color: #dc3545;
}
```

---

## Testing Checklist

- [ ] Upload a document (all file types)
- [ ] View document list
- [ ] Download document
- [ ] Delete document
- [ ] Update document metadata
- [ ] Handle file size errors
- [ ] Handle invalid file type errors
- [ ] Handle storage limit errors
- [ ] Handle network errors
- [ ] Test with different user permissions

---

## Next Steps

1. Copy the `DocumentService` class to your project
2. Create upload component using the example
3. Create document list component
4. Integrate into your project pages
5. Add styling to match your design system
6. Test all functionality
7. Add error handling and loading states
8. Optimize for your use case

That's it! You now have everything needed to implement document upload and download in your frontend.

