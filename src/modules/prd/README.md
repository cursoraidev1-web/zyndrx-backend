# PRD Module - Product Requirements Documents

Complete module for managing Product Requirements Documents with versioning, approval workflow, and collaboration features.

---

## 📁 Module Structure

```
src/modules/prd/
├── prd.controller.ts   # HTTP request/response handling
├── prd.service.ts      # Business logic & database operations
├── prd.routes.ts       # API route definitions
├── prd.validation.ts   # Zod validation schemas
└── README.md          # This file
```

---

## 🎯 Features

### Core Functionality
- ✅ **CRUD Operations** - Create, Read, Update, Delete PRDs
- ✅ **Version Control** - Automatic version tracking on every update
- ✅ **Approval Workflow** - Draft → Review → Approved/Rejected
- ✅ **Rich Content** - JSONB structure for flexible PRD content
- ✅ **Collaboration** - Multiple team members can work on PRDs
- ✅ **History Tracking** - Complete version history with changes summary
- ✅ **Export** - Export PRDs to JSON or Markdown formats
- ✅ **Statistics** - Project-level PRD analytics
- ✅ **Notifications** - Auto-notifications on status changes
- ✅ **Permissions** - Role-based access control

### Security Features
- ✅ **Authentication** - JWT required on all endpoints
- ✅ **Authorization** - Role-based permissions (PM, admin, owner)
- ✅ **RLS** - Database row-level security policies
- ✅ **Audit Logging** - All critical actions logged
- ✅ **Input Validation** - Zod schemas on all inputs
- ✅ **Project Scoping** - Users can only access their project PRDs

---

## 📊 PRD Content Structure

The PRD content is stored as JSONB, allowing flexible structure. Here's the recommended schema:

```typescript
{
  // Core sections
  overview?: string;
  objectives?: string[];
  targetAudience?: string;
  
  // Requirements
  functionalRequirements?: [
    {
      id: string;
      title: string;
      description: string;
      priority: 'must-have' | 'should-have' | 'nice-to-have';
    }
  ];
  nonFunctionalRequirements?: [
    {
      type: string;
      description: string;
    }
  ];
  
  // Technical specs
  technicalSpecs?: {
    architecture?: string;
    technologies?: string[];
    integrations?: string[];
  };
  
  // User stories
  userStories?: [
    {
      id: string;
      role: string;
      goal: string;
      benefit: string;
      acceptanceCriteria: string[];
    }
  ];
  
  // Timeline
  timeline?: {
    estimatedStartDate?: string;
    estimatedEndDate?: string;
    milestones?: [
      {
        name: string;
        date: string;
        description: string;
      }
    ];
  };
  
  // Design & mockups
  designs?: [
    {
      name: string;
      url: string;
      description?: string;
    }
  ];
  
  // Success metrics
  successMetrics?: [
    {
      metric: string;
      target: string;
      measurement: string;
    }
  ];
  
  // Risks & assumptions
  risks?: [
    {
      risk: string;
      impact: 'low' | 'medium' | 'high';
      mitigation: string;
    }
  ];
  assumptions?: string[];
  
  // Dependencies
  dependencies?: [
    {
      type: 'internal' | 'external' | 'technical';
      description: string;
      status: string;
    }
  ];
  
  // Additional notes
  notes?: string;
}
```

---

## 🔄 Status Workflow

```
┌─────────┐
│  DRAFT  │  ← Initial state
└────┬────┘
     │ (submit for review)
     ▼
┌──────────┐
│IN_REVIEW │
└────┬─────┘
     │
     ├─ (approve) ──► ┌──────────┐
     │                │ APPROVED │ (final state)
     │                └──────────┘
     │
     └─ (reject) ───► ┌──────────┐
                      │ REJECTED │
                      └────┬─────┘
                           │ (edit)
                           ▼
                      ┌─────────┐
                      │  DRAFT  │ (new version)
                      └─────────┘
```

### Status Transitions

- **draft → in_review**: Any creator can submit
- **in_review → approved**: Only PM, admin, or project owner
- **in_review → rejected**: Only PM, admin, or project owner
- **in_review → draft**: Roll back to draft
- **rejected → draft**: Edit and resubmit (creates new version)
- **rejected → in_review**: Resubmit without editing
- **approved → (none)**: Cannot change approved PRDs

---

## 🔌 API Endpoints

### Base URL
```
/api/v1/prds
```

### 1. Create PRD
```http
POST /api/v1/prds
Authorization: Bearer {token}
Content-Type: application/json

{
  "projectId": "uuid",
  "title": "User Authentication System",
  "content": {
    "overview": "Implement secure user authentication...",
    "objectives": [
      "Support email/password login",
      "Implement JWT tokens",
      "Add password reset flow"
    ],
    "functionalRequirements": [
      {
        "id": "FR-001",
        "title": "User Registration",
        "description": "Users should be able to register...",
        "priority": "must-have"
      }
    ]
  }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "title": "User Authentication System",
    "content": {...},
    "version": 1,
    "status": "draft",
    "createdBy": "uuid",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  "message": "PRD created successfully"
}
```

### 2. Get PRDs (with filtering)
```http
GET /api/v1/prds?projectId={uuid}&status=draft&page=1&limit=20
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "prds": [...],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### 3. Get PRD by ID
```http
GET /api/v1/prds/{id}?includeVersions=true
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "title": "...",
    "content": {...},
    "version": 3,
    "status": "approved",
    "creator": {...},
    "approver": {...},
    "versions": [
      {
        "version": 3,
        "title": "...",
        "changesSummary": "Updated requirements",
        "createdAt": "..."
      },
      ...
    ]
  }
}
```

### 4. Update PRD
```http
PUT /api/v1/prds/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "content": {...},
  "changesSummary": "Added new functional requirements"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "version": 2,  // Incremented
    "status": "draft",  // Reset to draft
    ...
  },
  "message": "PRD updated successfully"
}
```

### 5. Update PRD Status
```http
PATCH /api/v1/prds/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

// Submit for review
{
  "status": "in_review"
}

// Approve
{
  "status": "approved",
  "approvalNotes": "Looks good, approved!"
}

// Reject
{
  "status": "rejected",
  "rejectionReason": "Needs more detail on security requirements"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approvedBy": "uuid",
    "approvedAt": "2025-01-01T00:00:00Z",
    ...
  },
  "message": "PRD status updated to approved"
}
```

### 6. Delete PRD
```http
DELETE /api/v1/prds/{id}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "PRD deleted successfully"
  }
}
```

### 7. Get Version History
```http
GET /api/v1/prds/{id}/versions
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "uuid",
        "version": 3,
        "title": "...",
        "content": {...},
        "changesSummary": "Updated requirements",
        "createdAt": "2025-01-03T00:00:00Z",
        "created_by_user": {
          "id": "uuid",
          "full_name": "John Doe"
        }
      },
      ...
    ]
  }
}
```

### 8. Export PRD
```http
GET /api/v1/prds/{id}/export?format=markdown
Authorization: Bearer {token}

Response: 200 OK
Content-Type: text/markdown
Content-Disposition: attachment; filename="prd-title.md"

# PRD Title
**Version:** 3
**Status:** approved
...
```

### 9. Get Project PRD Statistics
```http
GET /api/v1/prds/project/{projectId}/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "total": 15,
    "byStatus": {
      "draft": 5,
      "in_review": 3,
      "approved": 6,
      "rejected": 1
    },
    "recentlyCreated": [...],
    "approvalRate": "40.00"
  }
}
```

---

## 🔐 Permissions

### Who Can Do What

| Action | Creator | Project Owner | Admin | Product Manager | Developer/QA/DevOps/Designer |
|--------|---------|---------------|-------|-----------------|------------------------------|
| Create PRD | ✅ | ✅ | ✅ | ✅ | ❌ |
| View PRD | ✅ | ✅ | ✅ | ✅ | ✅ (project members) |
| Edit PRD | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit for Review | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve/Reject | ❌ | ✅ | ✅ | ✅ | ❌ |
| Delete PRD (draft/rejected) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete PRD (approved) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export PRD | ✅ | ✅ | ✅ | ✅ | ✅ (project members) |

---

## 🎯 Usage Examples

### Example 1: Create and Approve a PRD

```typescript
// 1. Product Manager creates PRD
const createResponse = await fetch('/api/v1/prds', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: 'project-uuid',
    title: 'Payment Integration',
    content: {
      overview: 'Integrate Stripe payment processing',
      objectives: [
        'Support credit card payments',
        'Handle subscriptions',
        'Implement webhooks'
      ],
      functionalRequirements: [
        {
          id: 'FR-001',
          title: 'Payment Processing',
          description: 'Process credit card payments securely',
          priority: 'must-have'
        }
      ]
    }
  })
});

const prd = await createResponse.json();
console.log('PRD created:', prd.data.id);

// 2. Submit for review
await fetch(`/api/v1/prds/${prd.data.id}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'in_review'
  })
});

// 3. Project Owner approves
await fetch(`/api/v1/prds/${prd.data.id}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${ownerToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'approved',
    approvalNotes: 'Great work! Approved for implementation.'
  })
});
```

### Example 2: Edit Rejected PRD

```typescript
// 1. PRD was rejected, now edit it
const updateResponse = await fetch(`/api/v1/prds/${prdId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: {
      ...existingContent,
      functionalRequirements: [
        ...existingContent.functionalRequirements,
        {
          id: 'FR-002',
          title: 'Error Handling',
          description: 'Added comprehensive error handling',
          priority: 'must-have'
        }
      ]
    },
    changesSummary: 'Added error handling requirements based on feedback'
  })
});

// 2. Resubmit for review
await fetch(`/api/v1/prds/${prdId}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'in_review'
  })
});
```

### Example 3: Get Project PRD Dashboard

```typescript
// Get all PRDs for a project with statistics
const [prdsResponse, statsResponse] = await Promise.all([
  fetch(`/api/v1/prds?projectId=${projectId}&page=1&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  fetch(`/api/v1/prds/project/${projectId}/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
]);

const prds = await prdsResponse.json();
const stats = await statsResponse.json();

console.log('Total PRDs:', stats.data.total);
console.log('Approval Rate:', stats.data.approvalRate + '%');
console.log('In Review:', stats.data.byStatus.in_review);
```

---

## 🧪 Testing

### Test Scenarios

1. **Create PRD**
   - ✅ PM/admin/owner can create
   - ❌ Developer cannot create
   - ✅ Creates version 1 automatically
   - ✅ Status is 'draft' initially

2. **Update PRD**
   - ✅ Creator can update
   - ✅ Version increments
   - ✅ Status resets to 'draft'
   - ❌ Cannot update approved PRD
   - ✅ Creates version snapshot

3. **Status Transitions**
   - ✅ draft → in_review (any creator)
   - ✅ in_review → approved (PM/admin/owner only)
   - ✅ in_review → rejected (PM/admin/owner only)
   - ❌ approved → any (locked)

4. **Delete PRD**
   - ✅ Creator/owner can delete draft
   - ✅ Creator/owner can delete rejected
   - ❌ Cannot delete approved
   - ❌ Non-creator/owner cannot delete

5. **Permissions**
   - ✅ Users only see PRDs from their projects
   - ✅ RLS enforced at database level
   - ✅ Notifications sent on status change

---

## 📝 Database Schema

### prds table
```sql
CREATE TABLE prds (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  status prd_status DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);
```

### prd_versions table
```sql
CREATE TABLE prd_versions (
  id UUID PRIMARY KEY,
  prd_id UUID REFERENCES prds(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  changes_summary TEXT
);
```

---

## 🔍 Troubleshooting

### Common Issues

**Issue**: "Cannot edit approved PRD"
- **Solution**: Approved PRDs are locked. Create a new PRD for changes.

**Issue**: "Only project owners and product managers can approve PRDs"
- **Solution**: Check user role. Only PM, admin, or project owner can approve.

**Issue**: "Invalid status transition"
- **Solution**: Follow the status workflow. Can't skip states.

**Issue**: "PRD not found or access denied"
- **Solution**: User must be a member of the project to access PRDs.

**Issue**: "Cannot delete approved PRD"
- **Solution**: Approved PRDs cannot be deleted for audit trail.

---

## 🚀 Future Enhancements

- [ ] PDF export with custom templates
- [ ] Collaborative editing (real-time)
- [ ] Comments and discussions on PRD sections
- [ ] PRD templates for common scenarios
- [ ] AI-powered PRD suggestions
- [ ] Integration with task creation (auto-create tasks from requirements)
- [ ] Email notifications on status changes
- [ ] Slack integration for approvals
- [ ] Version comparison (diff view)
- [ ] PRD metrics dashboard

---

## 📚 Related Documentation

- **Database Schema**: `/workspace/DATABASE_SCHEMA_GUIDE.md`
- **API Examples**: `/workspace/API_EXAMPLES.md`
- **Project Architecture**: `/workspace/ARCHITECTURE.md`
- **Setup Guide**: `/workspace/QUICKSTART.md`

---

*Last Updated: December 17, 2025*
