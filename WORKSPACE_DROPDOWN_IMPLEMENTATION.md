# Workspace Dropdown Implementation

This document describes the backend implementation for the workspace dropdown feature.

## Overview

The backend now fully supports workspace/company switching with improved endpoints that return new JWT tokens and complete user/company information.

## API Endpoints

### 1. Get User's Companies
**GET** `/api/v1/auth/companies`

Returns a list of all companies/workspaces the user is a member of.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Company Name",
      "slug": "company-slug",
      "role": "admin" | "member" | "viewer",
      "status": "active",
      "joinedAt": "2025-01-01T00:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Switch Active Company/Workspace
**POST** `/api/v1/auth/switch-company`

Switches the user's active workspace and returns a new JWT token with the updated company context.

**Request Body:**
```json
{
  "company_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company switched successfully",
  "data": {
    "token": "new-jwt-token-with-updated-companyId",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "User Name",
      "role": "developer",
      "avatarUrl": "https://..."
    },
    "company": {
      "id": "uuid",
      "name": "Company Name",
      "slug": "company-slug"
    },
    "companyId": "uuid",
    "userRole": "admin" | "member" | "viewer",
    "companies": [
      {
        "id": "uuid",
        "name": "Company Name",
        "role": "admin"
      }
    ],
    "currentCompany": {
      "id": "uuid",
      "name": "Company Name"
    }
  }
}
```

**Validation:**
- `company_id` must be a valid UUID format
- User must be a member of the specified company

### 3. Get Current User (Enhanced)
**GET** `/api/v1/auth/me`

Now includes company information in the response.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "User Name",
    "role": "developer",
    "avatarUrl": "https://...",
    "is2FAEnabled": false,
    "companyId": "uuid",
    "companies": [
      {
        "id": "uuid",
        "name": "Company Name",
        "role": "admin"
      }
    ],
    "currentCompany": {
      "id": "uuid",
      "name": "Company Name"
    }
  }
}
```

## Implementation Details

### Changes Made

1. **Added Validation Schema** (`auth.validation.ts`)
   - Added `switchCompanySchema` to validate company_id as UUID

2. **Enhanced AuthService** (`auth.service.ts`)
   - Added public method `generateTokenForCompany()` to generate JWT tokens with company context
   - This method is used when switching companies

3. **Improved switchCompany Controller** (`companies.controller.ts`)
   - Now returns a new JWT token with updated companyId
   - Returns complete user and company information
   - Includes all user's companies in the response

4. **Enhanced getCurrentUser Controller** (`auth.controller.ts`)
   - Now includes company information (companies list and currentCompany)
   - Helps frontend display workspace dropdown with current selection

5. **Added Route Validation** (`auth.routes.ts`)
   - Added validation middleware to `/auth/switch-company` endpoint

## Frontend Integration Guide

### 1. Fetch User's Companies on App Load

```typescript
// On login or app initialization
const response = await fetch('/api/v1/auth/companies', {
  headers: { Authorization: `Bearer ${token}` }
});
const { data: companies } = await response.json();
```

### 2. Get Current User with Companies

```typescript
// Fetch current user (includes companies)
const response = await fetch('/api/v1/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
});
const { data: user } = await response.json();
// user.companies - list of all companies
// user.currentCompany - currently active company
```

### 3. Switch Workspace

```typescript
const switchWorkspace = async (companyId: string) => {
  const response = await fetch('/api/v1/auth/switch-company', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ company_id: companyId })
  });
  
  const { data } = await response.json();
  
  // Update token in storage
  localStorage.setItem('token', data.token);
  
  // Update user state
  setUser(data.user);
  setCurrentCompany(data.currentCompany);
  setCompanies(data.companies);
  
  // Reload page data or redirect
  window.location.reload(); // or update application state
};
```

### 4. Display Workspace Dropdown

```typescript
<Select 
  value={currentCompany?.id} 
  onChange={(companyId) => switchWorkspace(companyId)}
>
  {companies.map(company => (
    <Option key={company.id} value={company.id}>
      {company.name} ({company.role})
    </Option>
  ))}
</Select>
```

## Security Considerations

- All endpoints require authentication (JWT token)
- Company membership is verified before switching
- JWT tokens include companyId in the payload
- Token is regenerated on workspace switch to ensure security

## Error Handling

- Invalid company_id format returns 400 Bad Request
- User not a member of company returns 404 Not Found
- All errors follow the standard API response format:
  ```json
  {
    "success": false,
    "error": "Error message"
  }
  ```

