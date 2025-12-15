# API Examples

Comprehensive examples for testing Zyndrx API endpoints.

## Table of Contents
- [Authentication](#authentication)
- [Projects](#projects)
- [PRDs](#prds)
- [Tasks](#tasks)
- [Notifications](#notifications)

---

## Base Configuration

```bash
# Set your API URL
export API_URL="http://localhost:5000/api/v1"
# or for production
export API_URL="https://your-api-domain.com/api/v1"

# After login, store your token
export TOKEN="your-jwt-token-here"
```

---

## Authentication

### 1. Register New User

```bash
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "fullName": "John Doe",
    "role": "developer"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "fullName": "John Doe",
      "role": "developer",
      "avatarUrl": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

### 2. Login

```bash
curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Get Current User Profile

```bash
curl -X GET $API_URL/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update Profile

```bash
curl -X PUT $API_URL/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Smith",
    "avatarUrl": "https://example.com/avatar.jpg"
  }'
```

---

## Projects

### 1. Create Project

```bash
curl -X POST $API_URL/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-Commerce Platform",
    "description": "Building a modern e-commerce solution",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-06-30T00:00:00Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid",
    "name": "E-Commerce Platform",
    "description": "Building a modern e-commerce solution",
    "ownerId": "user-uuid",
    "status": "active",
    "startDate": "2024-01-15",
    "endDate": "2024-06-30",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

### 2. Get All Projects

```bash
curl -X GET "$API_URL/projects?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Project by ID

```bash
curl -X GET $API_URL/projects/{project-id} \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update Project

```bash
curl -X PUT $API_URL/projects/{project-id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-Commerce Platform v2",
    "status": "in_progress"
  }'
```

### 5. Add Member to Project

```bash
curl -X POST $API_URL/projects/{project-id}/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "member-user-uuid",
    "role": "developer"
  }'
```

### 6. Get Project Members

```bash
curl -X GET $API_URL/projects/{project-id}/members \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Remove Member

```bash
curl -X DELETE $API_URL/projects/{project-id}/members/{member-id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## PRDs (Product Requirements Documents)

### 1. Create PRD

```bash
curl -X POST $API_URL/prds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "title": "Shopping Cart Feature",
    "content": {
      "overview": "Implement a full-featured shopping cart",
      "objectives": [
        "Allow users to add/remove products",
        "Calculate totals with discounts",
        "Support multiple payment methods"
      ],
      "features": [
        {
          "id": "f1",
          "title": "Add to Cart",
          "description": "Users can add products to cart with quantity",
          "priority": "high",
          "acceptanceCriteria": [
            "Product is added to cart",
            "Quantity can be adjusted",
            "Stock validation is performed"
          ]
        },
        {
          "id": "f2",
          "title": "Cart Persistence",
          "description": "Cart persists across sessions",
          "priority": "medium",
          "acceptanceCriteria": [
            "Cart saved to database",
            "Cart restored on login"
          ]
        }
      ],
      "technicalRequirements": "Use Redis for session storage, PostgreSQL for persistent cart",
      "timeline": {
        "startDate": "2024-02-01",
        "endDate": "2024-02-28",
        "milestones": [
          {
            "title": "Backend API Complete",
            "date": "2024-02-14",
            "description": "All cart endpoints functional"
          },
          {
            "title": "Frontend Integration",
            "date": "2024-02-21"
          }
        ]
      }
    }
  }'
```

### 2. Get PRD by ID

```bash
curl -X GET $API_URL/prds/{prd-id} \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get PRDs by Project

```bash
curl -X GET "$API_URL/prds/project/{project-id}?status=approved&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update PRD

```bash
curl -X PUT $API_URL/prds/{prd-id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Shopping Cart Feature - Updated",
    "content": {
      "overview": "Enhanced shopping cart with wishlist integration"
    },
    "changesSummary": "Added wishlist integration requirement"
  }'
```

### 5. Submit PRD for Review

```bash
curl -X POST $API_URL/prds/{prd-id}/submit \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Approve/Reject PRD

```bash
# Approve
curl -X POST $API_URL/prds/{prd-id}/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "feedback": "Looks good, approved for development"
  }'

# Reject
curl -X POST $API_URL/prds/{prd-id}/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "feedback": "Please add more technical details"
  }'
```

### 7. Get PRD Version History

```bash
curl -X GET $API_URL/prds/{prd-id}/versions \
  -H "Authorization: Bearer $TOKEN"
```

---

## Tasks

### 1. Create Task

```bash
curl -X POST $API_URL/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "prdId": "prd-uuid",
    "title": "Implement Add to Cart API",
    "description": "Create POST /api/cart/add endpoint with validation",
    "priority": "high",
    "assignedTo": "developer-user-uuid",
    "dueDate": "2024-02-10T17:00:00Z"
  }'
```

### 2. Get Task by ID

```bash
curl -X GET $API_URL/tasks/{task-id} \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Tasks by Project

```bash
# All tasks
curl -X GET $API_URL/tasks/project/{project-id} \
  -H "Authorization: Bearer $TOKEN"

# Filtered tasks
curl -X GET "$API_URL/tasks/project/{project-id}?status=in_progress&priority=high&assignedTo=user-uuid" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get My Tasks

```bash
curl -X GET "$API_URL/tasks/my-tasks?status=todo&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Update Task

```bash
curl -X PUT $API_URL/tasks/{task-id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement Add to Cart API with Redis Cache",
    "status": "in_progress",
    "priority": "urgent"
  }'
```

### 6. Update Task Status Only

```bash
curl -X PATCH $API_URL/tasks/{task-id}/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

### 7. Delete Task

```bash
curl -X DELETE $API_URL/tasks/{task-id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notifications

### 1. Get All Notifications

```bash
curl -X GET "$API_URL/notifications?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Get Unread Notifications

```bash
curl -X GET "$API_URL/notifications?unreadOnly=true" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Unread Count

```bash
curl -X GET $API_URL/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### 4. Mark Notification as Read

```bash
curl -X PATCH $API_URL/notifications/{notification-id}/read \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Mark All as Read

```bash
curl -X POST $API_URL/notifications/mark-all-read \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Delete Notification

```bash
curl -X DELETE $API_URL/notifications/{notification-id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complete Workflow Example

Here's a complete workflow from user registration to task completion:

```bash
# 1. Register two users (PM and Developer)
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"pm@company.com","password":"PM123456!","fullName":"Alice PM","role":"product_manager"}'

curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@company.com","password":"Dev123456!","fullName":"Bob Developer","role":"developer"}'

# 2. PM logs in
TOKEN_PM=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pm@company.com","password":"PM123456!"}' | jq -r '.data.token')

# 3. PM creates project
PROJECT_ID=$(curl -s -X POST $API_URL/projects \
  -H "Authorization: Bearer $TOKEN_PM" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mobile App","description":"iOS and Android app"}' | jq -r '.data.id')

# 4. PM adds developer to project
curl -X POST $API_URL/projects/$PROJECT_ID/members \
  -H "Authorization: Bearer $TOKEN_PM" \
  -H "Content-Type: application/json" \
  -d '{"userId":"dev-user-uuid","role":"developer"}'

# 5. PM creates PRD
PRD_ID=$(curl -s -X POST $API_URL/prds \
  -H "Authorization: Bearer $TOKEN_PM" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"'$PROJECT_ID'","title":"User Authentication","content":{"overview":"Implement user auth"}}' | jq -r '.data.id')

# 6. PM approves PRD
curl -X POST $API_URL/prds/$PRD_ID/status \
  -H "Authorization: Bearer $TOKEN_PM" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

# 7. PM creates task for developer
TASK_ID=$(curl -s -X POST $API_URL/tasks \
  -H "Authorization: Bearer $TOKEN_PM" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"'$PROJECT_ID'","prdId":"'$PRD_ID'","title":"Build Login API","assignedTo":"dev-user-uuid","priority":"high"}' | jq -r '.data.id')

# 8. Developer logs in
TOKEN_DEV=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@company.com","password":"Dev123456!"}' | jq -r '.data.token')

# 9. Developer gets their tasks
curl -X GET $API_URL/tasks/my-tasks \
  -H "Authorization: Bearer $TOKEN_DEV"

# 10. Developer updates task status
curl -X PATCH $API_URL/tasks/$TASK_ID/status \
  -H "Authorization: Bearer $TOKEN_DEV" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'

# 11. Developer completes task
curl -X PATCH $API_URL/tasks/$TASK_ID/status \
  -H "Authorization: Bearer $TOKEN_DEV" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# 12. PM checks notifications
curl -X GET $API_URL/notifications \
  -H "Authorization: Bearer $TOKEN_PM"
```

---

## Testing with Postman

Import this collection URL:
```
[Will be generated after Postman collection is created]
```

Or create a new collection with these endpoints and environment variables:
- `api_url`: Your API URL
- `token`: JWT token from login

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

**Pro Tip:** Use `jq` to parse JSON responses:
```bash
curl ... | jq '.data.id'
```
