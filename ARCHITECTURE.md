# Zyndrx Backend Architecture

Technical architecture and design decisions for the Zyndrx platform.

## 🏛️ System Architecture

### High-Level Overview

```
┌─────────────────┐
│   Frontend      │
│  (React/Vue)    │
└────────┬────────┘
         │ HTTPS/REST
         ▼
┌─────────────────┐
│   API Gateway   │
│   (Express.js)  │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬──────────┐
    ▼         ▼         ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐
│ Auth   │ │ PRD  │ │ Tasks  │ │ GitHub │
│ Module │ │Module│ │ Module │ │ Module │
└───┬────┘ └──┬───┘ └───┬────┘ └───┬────┘
    │         │         │          │
    └─────────┴─────────┴──────────┘
                    │
                    ▼
         ┌──────────────────┐
         │    Supabase      │
         │  (PostgreSQL)    │
         └──────────────────┘
```

---

## 🔧 Technology Decisions

### Why TypeScript (Strict Mode)?
- **Type Safety:** Catch errors at compile time
- **Better IDE Support:** Autocomplete and refactoring
- **Self-Documenting:** Types serve as documentation
- **Team Scalability:** Easier onboarding for new developers

### Why Express.js?
- **Mature & Stable:** Battle-tested in production
- **Middleware Ecosystem:** Rich plugin ecosystem
- **Flexibility:** Can be customized for any use case
- **Performance:** Fast enough for most applications
- **Simple:** Easy to understand and maintain

### Why Supabase?
- **PostgreSQL:** Reliable, ACID-compliant database
- **Built-in Auth:** Reduces implementation time
- **Row-Level Security:** Database-level authorization
- **Real-time:** WebSocket support for future features
- **Storage:** Built-in file storage
- **Cost-Effective:** Free tier sufficient for MVP

### Why Zod for Validation?
- **TypeScript-First:** Infers types automatically
- **Runtime Safety:** Validates actual data at runtime
- **Error Messages:** Clear, actionable error messages
- **Composable:** Build complex schemas from simple ones

---

## 📁 Module Architecture

### Layered Architecture Pattern

Each module follows a consistent 3-layer architecture:

```
Module/
├── {module}.routes.ts      # API routes & HTTP layer
├── {module}.controller.ts  # Request/response handling
├── {module}.service.ts     # Business logic
└── {module}.validation.ts  # Input validation schemas
```

#### Layer Responsibilities

**Routes Layer** (`*.routes.ts`)
- Define HTTP endpoints
- Apply middleware (auth, validation, audit)
- Map URLs to controller methods
- **No business logic**

**Controller Layer** (`*.controller.ts`)
- Parse request data
- Call service methods
- Format responses
- Handle HTTP status codes
- **Minimal logic, mainly coordination**

**Service Layer** (`*.service.ts`)
- Business logic implementation
- Database interactions
- External service calls
- Error handling
- **Core application logic**

**Validation Layer** (`*.validation.ts`)
- Zod schemas for input validation
- Type definitions
- Validation rules
- **Data integrity**

### Benefits
- **Separation of Concerns:** Each layer has one job
- **Testability:** Easy to unit test each layer
- **Reusability:** Services can be used by multiple routes
- **Maintainability:** Clear structure for all modules

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User Login
   ↓
2. Validate Credentials (bcrypt compare)
   ↓
3. Generate JWT Token (signed with secret)
   ↓
4. Return Token to Client
   ↓
5. Client Stores Token
   ↓
6. Client Sends Token in Header (Bearer)
   ↓
7. Server Validates Token (JWT verify)
   ↓
8. Extract User from Token
   ↓
9. Attach to req.user
   ↓
10. Proceed to Route Handler
```

### Authorization Layers

**1. Authentication Middleware**
- Verifies JWT token
- Fetches user from database
- Ensures user is active
- Attaches user to request

**2. Role-Based Authorization**
- Checks user role against allowed roles
- Returns 403 if not authorized
- Applied per-route as needed

**3. Resource-Level Authorization**
- Verifies user has access to specific resource
- Checks project membership
- Checks resource ownership

**4. Database Row-Level Security (RLS)**
- Enforced at database level
- Users can only access their data
- Backup security layer

### Security Layers

```
┌──────────────────────────────────┐
│  1. Rate Limiting                │ ← Prevent abuse
├──────────────────────────────────┤
│  2. Helmet (Security Headers)    │ ← XSS, clickjacking protection
├──────────────────────────────────┤
│  3. CORS                         │ ← Cross-origin control
├──────────────────────────────────┤
│  4. JWT Authentication           │ ← Identity verification
├──────────────────────────────────┤
│  5. RBAC Authorization           │ ← Role-based access
├──────────────────────────────────┤
│  6. Input Validation (Zod)       │ ← Data integrity
├──────────────────────────────────┤
│  7. Resource Authorization       │ ← Resource-level access
├──────────────────────────────────┤
│  8. Database RLS                 │ ← Final defense layer
└──────────────────────────────────┘
```

---

## 💾 Database Architecture

### Schema Design Principles

**1. Normalization**
- Data is normalized to 3NF
- Reduces redundancy
- Ensures data consistency

**2. Foreign Keys**
- All relationships use foreign keys
- Cascade deletes where appropriate
- Maintains referential integrity

**3. Indexes**
- Indexed on foreign keys
- Indexed on frequently queried columns
- Improves query performance

**4. Timestamps**
- `created_at` and `updated_at` on all tables
- Automatic updates via triggers
- Audit trail

### Key Relationships

```
users ←──┐
    │    │
    │    │ owns
    │    │
    ↓    │
projects ←─── has many ─── project_members
    │                          │
    │ has many                 │ references
    │                          │
    ├─── prds ←─── has many ─ prd_versions
    │      │
    │      │ linked to
    │      │
    ├─── tasks ←─── linked to ─── github_commits
    │      │
    │      │ commented on
    │      │
    └─── documents
         comments
```

### Data Flow Example: Creating a Task

```
1. Client → POST /api/v1/tasks
             ↓
2. Routes → Authentication Middleware
             ↓
3. Routes → Validation Middleware (Zod)
             ↓
4. Controller → Parse Request
             ↓
5. Service → Verify Project Access
             ↓
6. Service → Verify PRD (if linked)
             ↓
7. Service → Create Task in DB
             ↓
8. Service → Create Notification
             ↓
9. Middleware → Create Audit Log
             ↓
10. Controller → Format Response
             ↓
11. Client ← 201 Created + Task Data
```

---

## 🔄 Request/Response Flow

### Complete Request Lifecycle

```
┌──────────────────────────────────────────────────┐
│  Incoming HTTP Request                           │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  Express Middleware Stack                        │
│  1. CORS                                         │
│  2. Helmet (Security Headers)                    │
│  3. Body Parser                                  │
│  4. Morgan (Logging)                             │
│  5. Rate Limiter                                 │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  Route Matching                                  │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  Route-Specific Middleware                       │
│  1. authenticate()      ← JWT verification       │
│  2. authorize(roles)    ← Role check             │
│  3. validate(schema)    ← Input validation       │
│  4. auditLog()          ← Audit logging          │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  Controller                                      │
│  - Extract data from request                     │
│  - Call service method                           │
│  - Handle response                               │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  Service                                         │
│  - Business logic                                │
│  - Database operations                           │
│  - Error handling                                │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  Supabase Client                                 │
│  - SQL query execution                           │
│  - RLS enforcement                               │
│  - Return data                                   │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  Response Formatting                             │
│  - ResponseHandler.success()                     │
│  - JSON serialization                            │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│  HTTP Response                                   │
└──────────────────────────────────────────────────┘
```

### Error Handling Flow

```
Error Occurs
    │
    ├─ AppError (Operational)
    │  ├─ Has statusCode (400, 404, etc.)
    │  ├─ Has message
    │  └─ Return to client
    │
    └─ Unknown Error (Programming)
       ├─ Log error with stack trace
       ├─ Return generic 500 error
       └─ Hide details from client (production)
```

---

## 🎯 Design Patterns Used

### 1. Repository Pattern
**Location:** Service layer
**Purpose:** Abstract database operations
**Benefit:** Easy to switch databases or add caching

### 2. Factory Pattern
**Location:** JWT token generation
**Purpose:** Standardized token creation
**Benefit:** Consistent token structure

### 3. Middleware Chain Pattern
**Location:** Express middleware
**Purpose:** Composable request processing
**Benefit:** Flexible, reusable middleware

### 4. Dependency Injection
**Location:** Service instantiation in controllers
**Purpose:** Loose coupling
**Benefit:** Easy to test and mock

### 5. Error Handling Pattern
**Location:** AsyncHandler wrapper
**Purpose:** Centralized error handling
**Benefit:** Clean code, consistent errors

---

## 📊 Performance Considerations

### Database Optimization
- **Indexed Foreign Keys:** Fast joins
- **Connection Pooling:** Supabase handles this
- **Selective Queries:** Only fetch needed columns
- **Pagination:** Prevent large result sets

### API Optimization
- **Response Compression:** (Can add with compression middleware)
- **Efficient Queries:** N+1 query prevention
- **Caching Strategy:** (Client-side for now)

### Scalability Strategy
- **Horizontal Scaling:** Stateless API (JWT)
- **Database Scaling:** Supabase handles read replicas
- **CDN:** For static assets (future)
- **Rate Limiting:** Prevent abuse

---

## 🔌 Integration Architecture

### GitHub Integration Flow

```
GitHub Event
    │
    ▼
Webhook → /github/webhook/:id
    │
    ├─ Verify Signature
    ├─ Check Integration Active
    ├─ Process Commits
    │  ├─ Extract Task ID from message
    │  ├─ Create commit record
    │  └─ Send notification
    │
    └─ Process Pull Request
       └─ Send notification to project owner
```

### Email Integration (Future)

```
Event Occurs → Notification Service
                    │
                    ├─ Create in-app notification
                    │
                    └─ Send Email (Resend)
                       ├─ Task assigned
                       ├─ PRD approved
                       └─ Deployment status
```

---

## 🧪 Testing Strategy

### Test Pyramid (Recommended)

```
        ┌────────────┐
        │   E2E      │  ← Few (API integration tests)
        ├────────────┤
        │ Integration│  ← Some (Service + DB)
        ├────────────┤
        │    Unit    │  ← Many (Service methods)
        └────────────┘
```

### Testing Approach

**Unit Tests** (To be added)
- Service methods
- Utility functions
- Validation schemas

**Integration Tests** (To be added)
- API endpoints
- Database operations
- Authentication flow

**Manual Testing**
- Use `API_EXAMPLES.md`
- Postman collections
- Frontend integration

---

## 📈 Monitoring & Observability

### Current Logging
- **Winston Logger:** Structured logging
- **Morgan:** HTTP request logging
- **Audit Logs:** Critical action tracking

### Recommended Additions
- **Application Performance Monitoring (APM)**
  - New Relic
  - Datadog
  
- **Error Tracking**
  - Sentry
  - Rollbar

- **Uptime Monitoring**
  - UptimeRobot
  - Pingdom

### Metrics to Track
- Request rate
- Response time
- Error rate
- Database query time
- Active users
- API endpoint usage

---

## 🚀 Deployment Architecture

### Current Setup (Serverless/PaaS)

```
┌─────────────────────────────────────┐
│         Railway/Render              │
│  ┌──────────────────────────────┐   │
│  │   Node.js Runtime            │   │
│  │   └── Express App            │   │
│  └──────────────────────────────┘   │
│                │                     │
│                ▼                     │
│  ┌──────────────────────────────┐   │
│  │   Environment Variables      │   │
│  └──────────────────────────────┘   │
└────────────┬────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │   Supabase   │
      │  PostgreSQL  │
      └──────────────┘
```

### Docker Deployment (Alternative)

```
┌─────────────────────────────────────┐
│         Docker Container            │
│  ┌──────────────────────────────┐   │
│  │   Node.js v20 Alpine         │   │
│  │   └── Compiled JS (dist/)    │   │
│  └──────────────────────────────┘   │
│                │                     │
│  Health Check: /health              │
│  Port: 5000                         │
└────────────┬────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │   Supabase   │
      └──────────────┘
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```
Push to GitHub
    │
    ▼
┌─────────────────┐
│  Lint & Build   │
│  - ESLint       │
│  - TypeScript   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Run Tests      │
│  (when added)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Docker Build   │
│  (PR only)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy         │
│  (main branch)  │
│  - Railway      │
│  - or Render    │
└─────────────────┘
```

---

## 🎓 Best Practices Implemented

### Code Quality
✅ TypeScript strict mode
✅ ESLint configuration
✅ Consistent code structure
✅ Comprehensive error handling
✅ Input validation on all endpoints

### Security
✅ JWT authentication
✅ Password hashing (bcrypt)
✅ Rate limiting
✅ Security headers (Helmet)
✅ CORS configuration
✅ Input sanitization

### Performance
✅ Database indexing
✅ Efficient queries
✅ Connection pooling (Supabase)
✅ Pagination support

### Maintainability
✅ Modular architecture
✅ Consistent naming conventions
✅ Comprehensive documentation
✅ Type safety throughout
✅ Separation of concerns

---

## 📚 Further Reading

- **Express.js Best Practices:** https://expressjs.com/en/advanced/best-practice-performance.html
- **Node.js Security:** https://nodejs.org/en/docs/guides/security/
- **PostgreSQL Performance:** https://wiki.postgresql.org/wiki/Performance_Optimization
- **REST API Design:** https://restfulapi.net/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/

---

**This architecture is designed for:**
- Rapid development
- Easy maintenance
- Horizontal scalability
- Security by default
- Cost-effectiveness

Built with modern best practices and industry standards.
