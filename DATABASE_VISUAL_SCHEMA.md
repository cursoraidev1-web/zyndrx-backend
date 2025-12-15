# 🎨 Zyndrx Database - Visual Schema

Visual representations of the database structure for easy understanding.

---

## 📊 Complete Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         ZYNDRX DATABASE SCHEMA                          │
└────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│       USERS         │
├─────────────────────┤
│ PK id (UUID)        │
│    email            │
│    full_name        │
│    role             │◄────────────┐
│    avatar_url       │             │
│    created_at       │             │
│    updated_at       │             │
│    last_login       │             │
│    is_active        │             │
└──────┬──────────────┘             │
       │ owns                       │
       │                            │
       ▼                            │
┌─────────────────────┐             │
│     PROJECTS        │             │
├─────────────────────┤             │
│ PK id               │             │
│    name             │             │
│    description      │             │
│ FK owner_id         ├─────────────┘
│    status           │
│    start_date       │
│    end_date         │
└──────┬──────────────┘
       │ has many
       │
   ┌───┴───┬────────────────┬─────────────┬──────────────┐
   │       │                │             │              │
   ▼       ▼                ▼             ▼              ▼
┌──────┐ ┌──────┐      ┌──────┐     ┌───────────┐  ┌────────┐
│ PRDs │ │TASKS │      │ DOCS │     │  MEMBERS  │  │GITHUB  │
└──────┘ └──────┘      └──────┘     └───────────┘  └────────┘


════════════════════════════════════════════════════════════════════════


                    DETAILED TABLE RELATIONSHIPS


┌─────────────────────────────────────────────────────────────────────┐
│  USERS                                                               │
├─────────────────────────────────────────────────────────────────────┤
│  • id (PK)                                                          │
│  • email, full_name, role, avatar_url                               │
│  • created_at, updated_at, last_login, is_active                    │
└────┬──────────────┬──────────────┬──────────────┬──────────────────┘
     │              │              │              │
     │ owns         │ creates      │ member of    │ assigned
     │              │              │              │
     ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ PROJECTS │  │   PRDS   │  │ PROJECT  │  │  TASKS   │
│          │  │          │  │ MEMBERS  │  │          │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │
     │ has         │ has         │ links       │ links
     │             │             │             │
     ▼             ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  TASKS   │  │   PRD    │  │ PROJECTS │  │ GITHUB   │
│          │  │ VERSIONS │  │          │  │ COMMITS  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘


════════════════════════════════════════════════════════════════════════


                        CORE TABLES DETAIL


┌──────────────────────────────────────────────────────────────────────┐
│                            PROJECTS TABLE                             │
├──────────────────────────────────────────────────────────────────────┤
│  id               UUID PK                                             │
│  name             TEXT NOT NULL                                       │
│  description      TEXT                                                │
│  owner_id         UUID FK → users.id                                 │
│  status           TEXT (active, completed, archived)                  │
│  start_date       DATE                                                │
│  end_date         DATE                                                │
│  created_at       TIMESTAMPTZ                                         │
│  updated_at       TIMESTAMPTZ                                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
┌───────────────────────┐ ┌────────────────────┐ ┌──────────────────┐
│  PROJECT_MEMBERS      │ │      PRDS          │ │     TASKS        │
├───────────────────────┤ ├────────────────────┤ ├──────────────────┤
│ id        UUID PK     │ │ id      UUID PK    │ │ id    UUID PK    │
│ project_id UUID FK    │ │ project_id UUID FK │ │ project_id FK    │
│ user_id    UUID FK    │ │ title   TEXT       │ │ prd_id    FK     │
│ role       user_role  │ │ content JSONB      │ │ title     TEXT   │
│ joined_at  TIMESTAMP  │ │ version INTEGER    │ │ description TEXT │
└───────────────────────┘ │ status  prd_status │ │ status task_stat │
                          │ created_by UUID FK │ │ priority         │
                          │ approved_by UUID FK│ │ assigned_to FK   │
                          │ approved_at TIMESTAMP│ │ created_by FK   │
                          └────────────────────┘ │ due_date         │
                                                 │ completed_at     │
                                                 │ order_index INT  │
                                                 └──────────────────┘


════════════════════════════════════════════════════════════════════════


                        PRD WORKFLOW DIAGRAM


┌──────────────────────────────────────────────────────────────────────┐
│                      PRD LIFECYCLE STATES                             │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  DRAFT  │ ◄── Initial creation
    └────┬────┘
         │ Submit for review
         ▼
    ┌──────────┐
    │IN_REVIEW │ ◄── Awaiting PM approval
    └────┬─────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│APPROVED │ │ REJECTED │ ◄── Send back for revision
└────┬────┘ └────┬─────┘
     │           │
     │           └──────► Back to DRAFT
     │
     └──────► Ready for Tasks


════════════════════════════════════════════════════════════════════════


                        TASK WORKFLOW DIAGRAM


┌──────────────────────────────────────────────────────────────────────┐
│                   KANBAN BOARD TASK FLOW                              │
└──────────────────────────────────────────────────────────────────────┘

  ┌────────┐      ┌─────────────┐      ┌───────────┐      ┌───────────┐
  │  TODO  │ ───► │ IN_PROGRESS │ ───► │ IN_REVIEW │ ───► │ COMPLETED │
  └────────┘      └─────────────┘      └───────────┘      └───────────┘
       │                 │                    │                   │
       │                 ▼                    │                   │
       │            ┌─────────┐               │                   │
       └───────────►│ BLOCKED │◄──────────────┘                   │
                    └─────────┘                                   │
                         │                                        │
                         └────────────────────────────────────────┘
                              Can return to any state


════════════════════════════════════════════════════════════════════════


                      NOTIFICATION FLOW DIAGRAM


┌──────────────────────────────────────────────────────────────────────┐
│                       EVENT → NOTIFICATION                            │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  EVENT OCCURS   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬─────────────┐
    │         │          │          │             │
    ▼         ▼          ▼          ▼             ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌──────────┐
│ Task   │ │ PRD  │ │Comment │ │GitHub │ │Deployment│
│Assigned│ │Status│ │ Added  │ │Commit │ │ Status   │
└───┬────┘ └──┬───┘ └───┬────┘ └───┬───┘ └────┬─────┘
    │         │         │          │          │
    └─────────┴─────────┴──────────┴──────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ CREATE NOTIFICATION│
            ├────────────────────┤
            │ • user_id          │
            │ • type             │
            │ • title            │
            │ • message          │
            │ • link             │
            │ • is_read = false  │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ USER RECEIVES      │
            │ IN-APP & EMAIL     │
            └────────────────────┘


════════════════════════════════════════════════════════════════════════


                    DOCUMENT STORAGE FLOW


┌──────────────────────────────────────────────────────────────────────┐
│                    FILE UPLOAD PROCESS                                │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ 1. Request  │
│ Upload URL  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. Generate │
│ Signed URL  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. Upload   │
│ to Storage  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ 4. Create Document  │
│    Record in DB     │
├─────────────────────┤
│ • title             │
│ • file_url          │
│ • file_type         │
│ • file_size         │
│ • tags[]            │
│ • project_id        │
│ • prd_id (optional) │
└─────────────────────┘


════════════════════════════════════════════════════════════════════════


                    GITHUB INTEGRATION FLOW


┌──────────────────────────────────────────────────────────────────────┐
│                    GITHUB WEBHOOK FLOW                                │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ GitHub Event │ (Push, PR, etc.)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Webhook    │
│  POST /api   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Verify Signature│
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Extract Commits  │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Parse Commit Message │
│ Look for #task-id    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Create github_commit │
│ Link to task         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Notify Task Owner    │
└──────────────────────┘


════════════════════════════════════════════════════════════════════════


                    USER ROLES & PERMISSIONS


┌──────────────────────────────────────────────────────────────────────┐
│                         USER ROLE MATRIX                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ROLE               │ PERMISSIONS                                    │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                       │
│  ADMIN              │ • Full system access                           │
│                     │ • Manage all projects                          │
│                     │ • Manage all users                             │
│                     │                                                │
│  PRODUCT_MANAGER    │ • Create/approve PRDs                          │
│                     │ • Create projects                              │
│                     │ • Manage team                                  │
│                     │                                                │
│  DEVELOPER          │ • Work on tasks                                │
│                     │ • Comment on PRDs                              │
│                     │ • View project info                            │
│                     │                                                │
│  QA                 │ • Test tasks                                   │
│                     │ • Report bugs                                  │
│                     │ • Comment on tasks                             │
│                     │                                                │
│  DEVOPS             │ • Manage deployments                           │
│                     │ • GitHub integration                           │
│                     │ • Monitor systems                              │
│                     │                                                │
│  DESIGNER           │ • Upload designs                               │
│                     │ • Comment on PRDs                              │
│                     │ • View tasks                                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════


                    DATA RELATIONSHIPS MAP


┌──────────────────────────────────────────────────────────────────────┐
│                    PRIMARY RELATIONSHIPS                              │
└──────────────────────────────────────────────────────────────────────┘

    USERS (1) ─────owns────────► (N) PROJECTS
    USERS (N) ────member────────► (N) PROJECTS (via project_members)
    USERS (1) ────creates───────► (N) PRDS
    USERS (1) ────creates───────► (N) TASKS
    USERS (1) ────assigned──────► (N) TASKS
    USERS (1) ────receives──────► (N) NOTIFICATIONS
    
    PROJECTS (1) ──has──────────► (N) PRDS
    PROJECTS (1) ──has──────────► (N) TASKS
    PROJECTS (1) ──has──────────► (N) DOCUMENTS
    PROJECTS (1) ──has──────────► (N) GITHUB_INTEGRATIONS
    
    PRDS (1) ────links──────────► (N) TASKS
    PRDS (1) ────has────────────► (N) PRD_VERSIONS
    PRDS (1) ────links──────────► (N) DOCUMENTS
    
    TASKS (1) ───has────────────► (N) COMMENTS
    TASKS (1) ───links──────────► (N) GITHUB_COMMITS
    
    GITHUB_INTEGRATIONS (1) ─has─► (N) GITHUB_COMMITS


════════════════════════════════════════════════════════════════════════


                    TABLE SIZE ESTIMATES


┌──────────────────────────────────────────────────────────────────────┐
│  TABLE             │ GROWTH RATE │ ESTIMATED SIZE (1 year)           │
├──────────────────────────────────────────────────────────────────────┤
│  users             │ Slow        │ ~1,000 rows                       │
│  projects          │ Medium      │ ~500 rows                         │
│  project_members   │ Medium      │ ~5,000 rows                       │
│  prds              │ Medium      │ ~2,000 rows                       │
│  prd_versions      │ Medium      │ ~10,000 rows                      │
│  tasks             │ Fast        │ ~50,000 rows                      │
│  comments          │ Fast        │ ~20,000 rows                      │
│  documents         │ Medium      │ ~5,000 rows                       │
│  notifications     │ Very Fast   │ ~100,000 rows                     │
│  audit_logs        │ Very Fast   │ ~200,000 rows                     │
│  github_commits    │ Fast        │ ~50,000 rows                      │
│  deployments       │ Medium      │ ~2,000 rows                       │
└──────────────────────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════


                    QUERY PATTERNS


┌──────────────────────────────────────────────────────────────────────┐
│                    COMMON QUERY PATTERNS                              │
└──────────────────────────────────────────────────────────────────────┘

1. GET USER'S PROJECTS
   ───────────────────
   SELECT p.* FROM projects p
   LEFT JOIN project_members pm ON p.id = pm.project_id
   WHERE p.owner_id = $user_id OR pm.user_id = $user_id;

2. GET PROJECT TASKS (KANBAN)
   ──────────────────────────
   SELECT * FROM tasks
   WHERE project_id = $project_id
   ORDER BY order_index, created_at;

3. GET USER'S ASSIGNED TASKS
   ─────────────────────────
   SELECT t.*, p.name as project_name
   FROM tasks t
   JOIN projects p ON t.project_id = p.id
   WHERE t.assigned_to = $user_id
   ORDER BY t.priority DESC, t.due_date ASC;

4. GET PRD WITH VERSIONS
   ─────────────────────
   SELECT 
     p.*,
     json_agg(pv.*) as versions
   FROM prds p
   LEFT JOIN prd_versions pv ON p.id = pv.prd_id
   WHERE p.id = $prd_id
   GROUP BY p.id;

5. GET UNREAD NOTIFICATIONS
   ────────────────────────
   SELECT * FROM notifications
   WHERE user_id = $user_id AND is_read = false
   ORDER BY created_at DESC;


════════════════════════════════════════════════════════════════════════


                    INDEX USAGE MAP


┌──────────────────────────────────────────────────────────────────────┐
│                        INDEX STRATEGY                                 │
└──────────────────────────────────────────────────────────────────────┘

    MOST QUERIED COLUMNS → Index These
    ────────────────────────────────────
    
    users.email              ✓ Indexed (unique + login)
    users.role               ✓ Indexed (filtering)
    
    projects.owner_id        ✓ Indexed (FK + filtering)
    
    project_members.user_id  ✓ Indexed (user lookup)
    project_members.project_id ✓ Indexed (project lookup)
    
    tasks.project_id         ✓ Indexed (FK + filtering)
    tasks.assigned_to        ✓ Indexed (user dashboard)
    tasks.status             ✓ Indexed (kanban filtering)
    
    prds.project_id          ✓ Indexed (FK + filtering)
    prds.status              ✓ Indexed (filtering)
    
    notifications.user_id    ✓ Indexed (user lookup)
    notifications.is_read    ✓ Composite with user_id
    
    audit_logs.user_id       ✓ Indexed (user activity)
    audit_logs.resource_type ✓ Composite with resource_id


════════════════════════════════════════════════════════════════════════


                    CASCADE DELETE BEHAVIOR


┌──────────────────────────────────────────────────────────────────────┐
│                    ON DELETE CASCADE RULES                            │
└──────────────────────────────────────────────────────────────────────┘

    DELETE USER
    ├── CASCADE DELETE user's projects
    │   ├── CASCADE DELETE project's PRDs
    │   │   ├── CASCADE DELETE PRD versions
    │   │   └── SET NULL on linked tasks
    │   ├── CASCADE DELETE project's tasks
    │   │   ├── CASCADE DELETE task comments
    │   │   └── SET NULL on github_commits
    │   ├── CASCADE DELETE project members
    │   ├── CASCADE DELETE documents
    │   └── CASCADE DELETE github_integrations
    │       └── CASCADE DELETE commits
    ├── CASCADE DELETE notifications
    ├── CASCADE DELETE audit_logs
    └── SET NULL on assigned_to in tasks

    DELETE PROJECT
    ├── CASCADE DELETE all PRDs
    │   └── CASCADE DELETE PRD versions
    ├── CASCADE DELETE all tasks
    │   └── CASCADE DELETE comments
    ├── CASCADE DELETE all documents
    ├── CASCADE DELETE all members
    └── CASCADE DELETE github_integrations
        └── CASCADE DELETE commits


════════════════════════════════════════════════════════════════════════


                    JSONB STRUCTURE EXAMPLES


┌──────────────────────────────────────────────────────────────────────┐
│                     PRD CONTENT STRUCTURE                             │
└──────────────────────────────────────────────────────────────────────┘

{
  "overview": "Build a shopping cart feature",
  "objectives": [
    "Allow users to add products",
    "Persist cart across sessions",
    "Calculate totals with discounts"
  ],
  "features": [
    {
      "id": "f1",
      "title": "Add to Cart",
      "description": "Users can add products with quantity",
      "priority": "high",
      "acceptanceCriteria": [
        "Product added to cart",
        "Quantity adjustable",
        "Stock validation"
      ]
    }
  ],
  "technicalRequirements": "React, Node.js, PostgreSQL",
  "timeline": {
    "startDate": "2024-02-01",
    "endDate": "2024-02-28",
    "milestones": [
      {
        "title": "Backend API Complete",
        "date": "2024-02-14",
        "description": "All endpoints functional"
      }
    ]
  }
}


════════════════════════════════════════════════════════════════════════


                    QUICK REFERENCE


┌──────────────────────────────────────────────────────────────────────┐
│                        CHEAT SHEET                                    │
└──────────────────────────────────────────────────────────────────────┘

CORE TABLES:    11
ENUM TYPES:     5
INDEXES:        20+
TRIGGERS:       8
RLS POLICIES:   10+

KEY FOREIGN KEYS:
  users.id          → projects.owner_id
  users.id          → tasks.assigned_to
  projects.id       → prds.project_id
  projects.id       → tasks.project_id
  prds.id           → prd_versions.prd_id
  prds.id           → tasks.prd_id

POLYMORPHIC:
  comments          → resource_type + resource_id

SOFT DELETE:
  None (hard deletes with cascade)

TIMESTAMPS:
  All tables have created_at
  Most have updated_at (auto-trigger)

SECURITY:
  RLS enabled on all user-facing tables
  JWT auth required
  Row-level policies enforce access


════════════════════════════════════════════════════════════════════════

