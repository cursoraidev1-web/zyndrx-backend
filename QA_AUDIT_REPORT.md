# Pre-Client Release QA Audit Report
## Zyndrx Backend API

**Date:** 2025-12-30  
**Auditor:** Senior QA Automation & Manual Tester  
**Scope:** Comprehensive security, logic, UX, and edge case analysis

---

## Executive Summary

This audit identified **25 issues** across 5 categories:
- **Critical (High):** 8 issues
- **Medium:** 11 issues  
- **Low:** 6 issues

**Recommendation:** Address all High severity issues before client release. Medium issues should be prioritized based on client requirements.

---

## 1. Critical Edge Cases

### Bug Report Table: Edge Cases

| Severity | Issue Description | Steps to Reproduce | Recommended Fix |
|----------|------------------|-------------------|-----------------|
| **High** | **Task access bypass via ID enumeration** | 1. User A from Company 1 creates task with ID `abc-123`<br>2. User B from Company 2 calls `GET /api/v1/tasks/abc-123`<br>3. If task exists, returns 200 with task data (even if cross-company) | **Fix:** `TaskService.getTaskById()` must verify `company_id`. Add company context check:<br>```typescript<br>static async getTaskById(taskId: string, companyId: string) {<br>  const { data: task } = await db<br>    .from('tasks')<br>    .eq('id', taskId)<br>    .eq('company_id', companyId) // ADD THIS<br>    .single();<br>}<br>```<br>Update controller to pass `req.companyId` |
| **High** | **Null/undefined companyId causes silent failures** | 1. User logs in but JWT has no `companyId`<br>2. User calls any endpoint requiring company context<br>3. Some endpoints return 400, others may fail silently or expose data | **Fix:** Enforce company context middleware on all protected routes. Add early validation:<br>```typescript<br>if (!companyId) {<br>  throw new AppError('Company context required. Please select a workspace.', 400);<br>}<br>```<br>Consider making `verifyCompanyAccess` middleware mandatory |
| **High** | **Race condition: Multiple rapid task updates can corrupt data** | 1. User opens task edit form<br>2. User A changes status to "in_progress"<br>3. User B simultaneously changes priority to "urgent"<br>4. Second update may overwrite first (no optimistic locking) | **Fix:** Implement optimistic locking with `updated_at` timestamp or use database transactions with row-level locking:<br>```typescript<br>const { data: task } = await db<br>  .from('tasks')<br>  .select('updated_at')<br>  .eq('id', taskId)<br>  .single();<br><br>const { data: updated } = await db<br>  .from('tasks')<br>  .update({ ...updates, updated_at: new Date() })<br>  .eq('id', taskId)<br>  .eq('updated_at', task.updated_at); // Fail if changed<br><br>if (!updated) throw new AppError('Task was modified. Please refresh.', 409);<br>``` |
| **Medium** | **Extremely long strings can cause DoS or storage issues** | 1. User sends `POST /api/v1/tasks` with `title: "A".repeat(100000)`<br>2. No max length validation in Zod schema<br>3. Database may accept, causing storage bloat | **Fix:** Add string length limits to validation schemas:<br>```typescript<br>title: z.string().min(3).max(200), // Task title<br>description: z.string().max(10000).optional(), // Task description<br>```<br>Apply to all text fields (projects, PRDs, comments) |
| **Medium** | **Empty project member list causes confusing errors** | 1. User creates project<br>2. Project has no members (only owner)<br>3. User tries to fetch tasks: `GET /api/v1/tasks?project_id=...`<br>4. May return empty array without context | **Fix:** Service should verify user is project member before fetching tasks. Add validation in `getTasksByProject()`:<br>```typescript<br>const { data: member } = await db<br>  .from('project_members')<br>  .select('id')<br>  .eq('project_id', projectId)<br>  .eq('user_id', userId)<br>  .single();<br><br>if (!member && project.owner_id !== userId) {<br>  throw new AppError('You do not have access to this project', 403);<br>}<br>``` |

---

## 2. Input & Form Validation

### Bug Report Table: Input Validation

| Severity | Issue Description | Steps to Reproduce | Recommended Fix |
|----------|------------------|-------------------|-----------------|
| **High** | **SQL Injection risk in dynamic queries (though mitigated by Supabase)** | 1. Attacker sends `POST /api/v1/tasks` with `project_id: "'; DROP TABLE tasks; --"`<br>2. If not properly parameterized, could execute SQL<br>3. **Note:** Supabase client uses parameterized queries, but code review needed | **Fix:** Ensure all queries use Supabase query builder (already done). Add input sanitization layer for UUID fields:<br>```typescript<br>const isValidUUID = (str: string): boolean => {<br>  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);<br>};<br><br>if (!isValidUUID(project_id)) {<br>  throw new AppError('Invalid project ID format', 400);<br>}<br>```<br>Zod already validates UUIDs, but add explicit check in controllers |
| **High** | **Missing validation: User can bypass UI and send invalid enum values** | 1. User sends `PATCH /api/v1/tasks/123` with `status: "invalid_status"`<br>2. Zod schema validates, but what if validation is bypassed?<br>3. Database may reject or accept invalid value | **Fix:** Validation middleware is in place, but ensure all enum fields have strict validation. Add database-level constraints:<br>```sql<br>ALTER TABLE tasks ADD CONSTRAINT check_status<br>  CHECK (status IN ('todo', 'in_progress', 'in_review', 'completed', 'blocked'));<br>```<br>Current Zod schemas are correct, but verify middleware is applied to ALL routes |
| **Medium** | **File upload validation can be bypassed if frontend is compromised** | 1. Attacker modifies frontend code<br>2. Sends file with malicious MIME type or oversized file<br>3. Backend validates in `generateUploadToken`, but file upload happens in frontend | **Fix:** Add server-side file validation in `saveDocumentMetadata` after upload completes. Verify file size matches request:<br>```typescript<br>// In saveDocumentMetadata, verify file exists and size matches<br>const { data: files } = await supabaseAdmin.storage<br>  .from('documents')<br>  .list(uploadPath.split('/').slice(0, -1).join('/'));<br><br>const uploadedFile = files?.find(f => f.name === fileName);<br>if (!uploadedFile || uploadedFile.metadata?.size !== file_size) {<br>  throw new AppError('File verification failed', 400);<br>}<br>``` |
| **Medium** | **No validation for array fields (tags) length or content** | 1. User sends `tags: Array(10000).fill("spam")`<br>2. No limit on array size<br>3. Could cause performance issues | **Fix:** Add array length and content validation:<br>```typescript<br>tags: z.array(z.string().max(50)).max(20).optional(), // Max 20 tags, each max 50 chars<br>``` |
| **Low** | **Email validation in registration may accept invalid formats** | 1. User sends `email: "not-an-email"`<br>2. Supabase may reject, but error message unclear | **Fix:** Add explicit email validation in Zod schema (if not already present). Verify `auth.validation.ts` uses `z.string().email()` |

---

## 3. UX & Consistency

### Bug Report Table: UX Issues

| Severity | Issue Description | Steps to Reproduce | Recommended Fix |
|----------|------------------|-------------------|-----------------|
| **Medium** | **Inconsistent error messages: Some return generic 500, others are specific** | 1. Task creation fails due to RLS policy<br>2. Error: "Failed to create task: new row violates row-level security policy"<br>3. User doesn't understand what to do | **Fix:** Normalize error messages. Map database errors to user-friendly messages:<br>```typescript<br>if (error.code === '42501') { // Permission denied<br>  throw new AppError(<br>    'You do not have permission to perform this action. Please contact your administrator.',<br>    403<br>  );<br>}<br>```<br>Create error message mapping utility |
| **Medium** | **Missing loading states in API responses (frontend concern, but affects UX)** | 1. User clicks "Create Task"<br>2. No immediate feedback<br>3. User clicks multiple times (race condition) | **Fix:** (Frontend) Add request debouncing. (Backend) Return 202 Accepted for long-running operations. Add idempotency keys for critical operations |
| **Medium** | **No pagination for list endpoints - could return thousands of records** | 1. Company has 10,000 tasks<br>2. User calls `GET /api/v1/tasks`<br>3. API returns all 10,000, causing slow response | **Fix:** Implement pagination:<br>```typescript<br>const page = parseInt(req.query.page as string) || 1;<br>const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);<br>const offset = (page - 1) * limit;<br><br>const { data, count } = await db<br>  .from('tasks')<br>  .select('*', { count: 'exact' })<br>  .eq('company_id', companyId)<br>  .range(offset, offset + limit - 1);<br><br>return { data, pagination: { page, limit, total: count } };<br>``` |
| **Low** | **Inconsistent date format in responses** | 1. Some endpoints return ISO strings, others may use different formats<br>2. Frontend must handle multiple formats | **Fix:** Standardize all date fields to ISO 8601 strings. Use a response transformer middleware |
| **Low** | **Missing rate limit headers in responses** | 1. User hits rate limit<br>2. Response doesn't include `X-RateLimit-Remaining` header<br>3. Frontend can't show remaining requests | **Fix:** Add rate limit headers:<br>```typescript<br>res.setHeader('X-RateLimit-Limit', config.rateLimit.maxRequests);<br>res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);<br>res.setHeader('X-RateLimit-Reset', record.resetTime);<br>``` |

---

## 4. Happy Path vs Broken Path

### Bug Report Table: User Journey Issues

| Severity | Issue Description | Steps to Reproduce | Recommended Fix |
|----------|------------------|-------------------|-----------------|
| **High** | **User can't complete signup if email verification fails** | 1. User registers with email<br>2. Email verification email is sent<br>3. User clicks link, but link expires or is invalid<br>4. No way to resend verification email | **Fix:** Add `POST /api/v1/auth/resend-verification` endpoint:<br>```typescript<br>async resendVerification(email: string) {<br>  const { error } = await supabaseAdmin.auth.admin.generateLink({<br>    type: 'signup',<br>    email,<br>  });<br>  // Send email...<br>}<br>``` |
| **High** | **User gets stuck if OAuth user has no companies after signup** | 1. User signs up via Google OAuth<br>2. `handle_new_user()` trigger creates user profile<br>3. If company creation fails, user has no companies<br>4. User can't access any features | **Fix:** Already partially addressed in `oauth.service.ts` with safeguard, but add explicit error handling and retry logic. Add endpoint to create default company if missing:<br>```typescript<br>// In getCurrentUser, if user has no companies:<br>if (companies.length === 0) {<br>  await CompanyService.createCompany({<br>    name: `${user.full_name}'s Workspace`,<br>    userId: user.id,<br>  });<br>  companies = await CompanyService.getUserCompanies(user.id);<br>}<br>``` |
| **Medium** | **User can't create task if project has no members (only owner)** | 1. User creates project (becomes owner)<br>2. User tries to create task<br>3. `getTasksByProject` may work, but task creation may fail RLS check | **Fix:** Ensure project owner is automatically added to project_members, OR update RLS policies to check `owner_id` OR `project_members`:<br>```sql<br>CREATE POLICY "Project members or owners can create tasks" ON tasks FOR INSERT<br>  WITH CHECK (<br>    EXISTS (SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid())<br>    OR EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())<br>  );<br>``` |
| **Medium** | **User can't delete their own task if they're not project member anymore** | 1. User creates task in project<br>2. User is removed from project<br>3. User tries to delete their task<br>4. Fails due to RLS policy | **Fix:** Allow task creator to delete their own tasks regardless of membership, OR add explicit check in service:<br>```typescript<br>const task = await this.getTaskById(taskId, companyId);<br>if (task.created_by !== userId) {<br>  // Check project membership...<br>}<br>``` |
| **Low** | **No clear error when user tries to access deleted resource** | 1. User A deletes task<br>2. User B has task page open, tries to refresh<br>3. Gets 404, but error message unclear | **Fix:** Return specific error message:<br>```typescript<br>if (error.code === 'PGRST116') {<br>  throw new AppError('This task has been deleted or you do not have access', 404);<br>}<br>``` |

---

## 5. Security & Permissions

### Bug Report Table: Security Vulnerabilities

| Severity | Issue Description | Steps to Reproduce | Recommended Fix |
|----------|------------------|-------------------|-----------------|
| **CRITICAL** | **IDOR: User can access tasks from other companies** | 1. User A (Company 1) logs in, gets task ID `task-123`<br>2. User B (Company 2) calls `GET /api/v1/tasks/task-123`<br>3. `TaskService.getTaskById()` doesn't check `company_id`<br>4. Returns task data if it exists | **Fix:** **URGENT - FIX BEFORE RELEASE**<br>Update `TaskService.getTaskById()`:<br>```typescript<br>static async getTaskById(taskId: string, companyId: string) {<br>  const { data: task, error } = await db<br>    .from('tasks')<br>    .select('*')<br>    .eq('id', taskId)<br>    .eq('company_id', companyId) // CRITICAL: Add this<br>    .single();<br><br>  if (error || !task) {<br>    throw new AppError('Task not found or access denied', 404);<br>  }<br>  // ... rest of method<br>}<br>```<br>Update controller:<br>```typescript<br>export const getTask = async (req: Request, res: Response, next: NextFunction) => {<br>  const { id } = req.params;<br>  const companyId = req.user!.companyId || req.companyId;<br>  if (!companyId) {<br>    return ResponseHandler.error(res, 'Company context required', 400);<br>  }<br>  const task = await TaskService.getTaskById(id, companyId); // Pass companyId<br>  return ResponseHandler.success(res, task);<br>};<br>``` |
| **CRITICAL** | **IDOR: User can update/delete tasks from other companies** | 1. User A (Company 1) has task `task-123`<br>2. User B (Company 2) calls `PATCH /api/v1/tasks/task-123` with `status: "completed"`<br>3. `TaskService.updateTask()` doesn't verify `company_id`<br>4. Update succeeds if task exists | **Fix:** **URGENT - FIX BEFORE RELEASE**<br>Update `TaskService.updateTask()`:<br>```typescript<br>static async updateTask(taskId: string, updates: any, companyId: string) {<br>  // Verify task belongs to company first<br>  const existing = await this.getTaskById(taskId, companyId);<br><br>  const { data: task, error } = await db<br>    .from('tasks')<br>    .update(updates)<br>    .eq('id', taskId)<br>    .eq('company_id', companyId) // CRITICAL<br>    .select('*')<br>    .single();<br>  // ... rest<br>}<br>```<br>Update `deleteTask()` similarly |
| **High** | **Missing company context check in task list endpoint** | 1. User calls `GET /api/v1/tasks?project_id=abc`<br>2. `getTasksByProject()` doesn't verify project belongs to user's company<br>3. If user knows project ID from another company, may leak data | **Fix:** Add company context verification:<br>```typescript<br>static async getTasksByProject(projectId: string, companyId: string) {<br>  // Verify project belongs to company<br>  const { data: project } = await db<br>    .from('projects')<br>    .select('id, company_id')<br>    .eq('id', projectId)<br>    .eq('company_id', companyId) // Verify company<br>    .single();<br><br>  if (!project) {<br>    throw new AppError('Project not found or access denied', 404);<br>  }<br><br>  // Then fetch tasks...<br>}<br>``` |
| **High** | **PRD access doesn't verify company context** | 1. User calls `GET /api/v1/prds/:id`<br>2. `PrdService.getPRDById()` doesn't check `company_id`<br>3. User can access PRDs from other companies | **Fix:** Add company_id column check in PRD service (if PRDs have company_id). Verify project belongs to company:<br>```typescript<br>static async getPRDById(id: string, companyId: string) {<br>  const { data: prd } = await db<br>    .from('prds')<br>    .select('*, projects!inner(company_id)')<br>    .eq('id', id)<br>    .eq('projects.company_id', companyId)<br>    .single();<br>  // ...<br>}<br>``` |
| **High** | **Comments don't verify resource ownership/company context** | 1. User creates comment on task from Company 1<br>2. User from Company 2 calls `GET /api/v1/comments?resource_type=task&resource_id=...`<br>3. May return comments if resource ID is known | **Fix:** Verify user has access to the resource before fetching comments:<br>```typescript<br>static async getComments(resourceType: string, resourceId: string, userId: string, companyId: string) {<br>  // Verify user has access to resource<br>  if (resourceType === 'task') {<br>    const task = await TaskService.getTaskById(resourceId, companyId);<br>    if (!task) throw new AppError('Resource not found', 404);<br>  }<br>  // Then fetch comments...<br>}<br>``` |
| **Medium** | **Rate limiting uses in-memory store (doesn't work in multi-instance deployment)** | 1. Deploy app to multiple servers/containers<br>2. Rate limit is per-instance, not global<br>3. Attacker can send requests to different instances to bypass limit | **Fix:** Use Redis or database-backed rate limiting for production:<br>```typescript<br>import { Redis } from 'ioredis';<br>const redis = new Redis(process.env.REDIS_URL);<br><br>export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {<br>  const key = `ratelimit:${req.ip}`;<br>  const count = await redis.incr(key);<br>  if (count === 1) await redis.expire(key, windowSeconds);<br>  // Check limit...<br>};<br>``` |
| **Medium** | **JWT token doesn't expire (or expiration not enforced)** | 1. User logs in, gets JWT token<br>2. Token is valid indefinitely (or very long expiration)<br>3. If token is stolen, attacker has long-term access | **Fix:** Set reasonable JWT expiration (15 minutes - 1 hour). Implement refresh token mechanism:<br>```typescript<br>// In auth.service.ts<br>const token = jwt.sign(payload, config.jwt.secret, {<br>  expiresIn: '15m' // Short-lived access token<br>});<br><br>const refreshToken = jwt.sign(<br>  { sub: userId, type: 'refresh' },<br>  config.jwt.refreshSecret,<br>  { expiresIn: '7d' }<br>);<br>``` |
| **Medium** | **Missing CSRF protection for state-changing operations** | 1. Attacker creates malicious site<br>2. User visits site while logged into Zyndrx<br>3. Site sends POST request to Zyndrx API<br>4. Browser includes cookies/auth headers, request succeeds | **Fix:** Implement CSRF tokens for cookie-based auth, OR use SameSite cookie attribute. For API tokens, CSRF is less critical but consider for web frontend |
| **Low** | **Error messages may leak sensitive information in development mode** | 1. Error occurs in development<br>2. Stack trace includes file paths, internal structure<br>3. If logs are exposed, attacker gains information | **Fix:** Already handled in `error.middleware.ts` (stack only in dev), but ensure production mode is set correctly. Sanitize error messages:<br>```typescript<br>if (!config.server.isDevelopment) {<br>  message = 'An error occurred. Please try again later.';<br>}<br>``` |

---

## Summary of Critical Issues Requiring Immediate Fix

### Must Fix Before Release (High Priority):

1. **IDOR in TaskService.getTaskById()** - Users can access tasks from other companies
2. **IDOR in TaskService.updateTask()** - Users can modify tasks from other companies  
3. **IDOR in TaskService.deleteTask()** - Users can delete tasks from other companies
4. **Missing company context validation** - Multiple endpoints don't verify company_id
5. **Task list endpoint doesn't verify project ownership** - Data leakage risk
6. **PRD access doesn't verify company context** - IDOR vulnerability
7. **Comments endpoint doesn't verify resource access** - Information disclosure
8. **Race conditions in concurrent updates** - Data corruption risk

### Should Fix Soon (Medium Priority):

- Add pagination to list endpoints
- Implement optimistic locking for updates
- Add string length validation
- Improve error message consistency
- Fix rate limiting for multi-instance deployments
- Add JWT expiration and refresh tokens

---

## Recommendations

1. **Security First:** Address all IDOR vulnerabilities immediately. These are critical security flaws.

2. **Add Integration Tests:** Create test suite covering:
   - Cross-company access attempts (should fail)
   - Concurrent updates (should handle gracefully)
   - Invalid input (should validate properly)

3. **Code Review Checklist:** Before merging any PR, verify:
   - ✅ Company context is verified
   - ✅ User permissions are checked
   - ✅ Input is validated and sanitized
   - ✅ Error messages don't leak sensitive info
   - ✅ Pagination is implemented for list endpoints

4. **Monitoring:** Set up alerts for:
   - 403 Forbidden responses (potential attack)
   - 429 Rate limit exceeded (potential DoS)
   - 500 errors (potential bugs)

---

## Testing Recommendations

1. **Manual Testing:**
   - Create two companies with different users
   - Attempt to access resources from Company A using Company B's user token
   - Verify all requests are properly rejected

2. **Automated Testing:**
   - Add unit tests for all service methods with company context
   - Add integration tests for IDOR scenarios
   - Add load tests for concurrent updates

3. **Penetration Testing:**
   - Engage security team to test for IDOR, SQL injection, XSS
   - Test rate limiting effectiveness
   - Test JWT token security

---

**Report Generated:** 2025-12-30  
**Next Review:** After critical fixes are implemented

