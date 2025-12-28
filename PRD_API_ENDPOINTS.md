# PRD API Endpoints Documentation

This document describes all available PRD (Product Requirements Document) API endpoints.

## Base URL
```
/api/v1/prds
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. List PRDs
**GET** `/api/v1/prds`

Get a list of PRDs. Can be filtered by project.

**Query Parameters:**
- `project_id` (optional, UUID): Filter PRDs by project ID

**Response:**
```json
{
  "success": true,
  "message": "PRDs fetched successfully",
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "title": "PRD Title",
      "content": { /* JSON object */ },
      "version": 1,
      "status": "draft",
      "created_by": "uuid",
      "approved_by": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "approved_at": null,
      "projects": {
        "name": "Project Name"
      },
      "users": {
        "full_name": "Creator Name"
      }
    }
  ]
}
```

**Example:**
```javascript
// Get all PRDs
const response = await fetch('/api/v1/prds', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get PRDs for a specific project
const response = await fetch('/api/v1/prds?project_id=project-uuid', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

### 2. Create PRD
**POST** `/api/v1/prds`

Create a new PRD. Accessible by all authenticated users.

**Request Body:**
```json
{
  "project_id": "uuid",
  "title": "PRD Title",
  "content": {
    "overview": "Product overview",
    "features": [
      {
        "name": "Feature Name",
        "description": "Feature description"
      }
    ],
    "requirements": []
  },
  "version": 1
}
```

**Required Fields:**
- `project_id` (UUID): The project this PRD belongs to
- `title` (string, min 3 characters): PRD title
- `content` (object): PRD content as JSON object

**Optional Fields:**
- `version` (number): PRD version (defaults to 1)

**Response:**
```json
{
  "success": true,
  "message": "PRD created successfully",
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "title": "PRD Title",
    "content": { /* JSON object */ },
    "version": 1,
    "status": "draft",
    "created_by": "uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Example:**
```javascript
const response = await fetch('/api/v1/prds', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    project_id: 'project-uuid',
    title: 'New Feature PRD',
    content: {
      overview: 'This feature will...',
      features: [
        {
          name: 'Feature 1',
          description: 'Description of feature 1'
        }
      ]
    }
  })
});
```

---

### 3. Get PRD by ID
**GET** `/api/v1/prds/:id`

Get a specific PRD by its ID.

**Path Parameters:**
- `id` (UUID): PRD ID

**Response:**
```json
{
  "success": true,
  "message": "PRD fetched successfully",
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "title": "PRD Title",
    "content": { /* JSON object */ },
    "version": 1,
    "status": "draft",
    "created_by": "uuid",
    "approved_by": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "approved_at": null,
    "projects": {
      "name": "Project Name"
    },
    "users": {
      "full_name": "Creator Name"
    }
  }
}
```

**Example:**
```javascript
const response = await fetch('/api/v1/prds/prd-uuid', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

### 4. Update PRD
**PATCH** `/api/v1/prds/:id`

Update PRD content (title and/or content). Accessible by creator or admin.

**Path Parameters:**
- `id` (UUID): PRD ID

**Request Body:**
```json
{
  "title": "Updated PRD Title",
  "content": {
    "overview": "Updated overview",
    "features": []
  }
}
```

**Fields (all optional):**
- `title` (string, min 3 characters): Updated PRD title
- `content` (object): Updated PRD content

**Response:**
```json
{
  "success": true,
  "message": "PRD updated successfully",
  "data": {
    "id": "uuid",
    "title": "Updated PRD Title",
    "content": { /* Updated JSON object */ },
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Example:**
```javascript
const response = await fetch('/api/v1/prds/prd-uuid', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Updated Title',
    content: {
      overview: 'Updated overview'
    }
  })
});
```

---

### 5. Update PRD Status
**PATCH** `/api/v1/prds/:id/status`

Update PRD status (approve/reject). **Admin only**.

**Path Parameters:**
- `id` (UUID): PRD ID

**Request Body:**
```json
{
  "status": "approved"
}
```

**Status Values:**
- `draft`: Initial status
- `in_review`: Under review
- `approved`: Approved (will auto-generate tasks from features)
- `rejected`: Rejected

**Response:**
```json
{
  "success": true,
  "message": "PRD marked as approved",
  "data": {
    "id": "uuid",
    "status": "approved",
    "approved_by": "admin-uuid",
    "approved_at": "2024-01-01T00:00:00Z"
  }
}
```

**Note:** When a PRD is approved, tasks are automatically generated from the `features` array in the PRD content.

**Example:**
```javascript
const response = await fetch('/api/v1/prds/prd-uuid/status', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    status: 'approved'
  })
});
```

---

## Error Responses

All endpoints may return the following error responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "No token provided"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Access denied. Requires role: admin"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "PRD not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed: Title must be at least 3 characters"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to create PRD: <error message>"
}
```

---

## Frontend Implementation Example

### React Hook for PRD Operations

```typescript
// hooks/usePRDs.ts
import { useState, useEffect } from 'react';

export const usePRDs = (projectId?: string) => {
  const [prds, setPrds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPRDs = async () => {
      try {
        setLoading(true);
        const url = projectId 
          ? `/api/v1/prds?project_id=${projectId}`
          : '/api/v1/prds';
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch PRDs');
        }

        const result = await response.json();
        setPrds(result.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPRDs();
  }, [projectId]);

  const createPRD = async (data: { project_id: string; title: string; content: any }) => {
    const response = await fetch('/api/v1/prds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create PRD');
    }

    const result = await response.json();
    setPrds([result.data, ...prds]);
    return result.data;
  };

  const updatePRD = async (id: string, updates: { title?: string; content?: any }) => {
    const response = await fetch(`/api/v1/prds/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update PRD');
    }

    const result = await response.json();
    setPrds(prds.map(p => p.id === id ? result.data : p));
    return result.data;
  };

  return { prds, loading, error, createPRD, updatePRD };
};
```

---

## PRD Content Structure

The `content` field is a flexible JSON object. Here's a recommended structure:

```json
{
  "overview": "Product overview and goals",
  "problem": "Problem statement",
  "solution": "Proposed solution",
  "features": [
    {
      "name": "Feature Name",
      "description": "Feature description",
      "priority": "high|medium|low",
      "acceptance_criteria": [
        "Criterion 1",
        "Criterion 2"
      ]
    }
  ],
  "requirements": [
    {
      "type": "functional|non-functional",
      "description": "Requirement description"
    }
  ],
  "timeline": {
    "start": "2024-01-01",
    "end": "2024-03-01"
  },
  "success_metrics": [
    "Metric 1",
    "Metric 2"
  ]
}
```

**Note:** When a PRD is approved, tasks are automatically generated from the `features` array. Each feature becomes a task with:
- Title: `feature.name` or `feature.title`
- Description: `feature.desc` or `feature.description`
- Status: `todo`
- Priority: `medium`

---

## Summary of Changes

### Fixed Issues:
1. ✅ **Added endpoint to list PRDs** - `GET /api/v1/prds` with optional `project_id` query param
2. ✅ **Removed role restriction for PRD creation** - All authenticated users can create PRDs
3. ✅ **Added PRD update endpoint** - `PATCH /api/v1/prds/:id` for updating title and content
4. ✅ **Improved error handling** - Better error messages and logging
5. ✅ **Added company_id support** - PRDs automatically get company_id from the project

### Available Endpoints:
- `GET /api/v1/prds` - List PRDs (with optional project_id filter)
- `POST /api/v1/prds` - Create PRD
- `GET /api/v1/prds/:id` - Get PRD by ID
- `PATCH /api/v1/prds/:id` - Update PRD content
- `PATCH /api/v1/prds/:id/status` - Update PRD status (admin only)

