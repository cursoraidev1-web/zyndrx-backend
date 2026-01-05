import { Router } from 'express';
import { createProject, getMyProjects, getProjectDetails, updateProject, deleteProject, getProjectMembers, addProjectMember, removeProjectMember } from './projects.controller';
import { createProjectSchema, updateProjectSchema, addProjectMemberSchema } from './projects.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

// Apply Auth and rate limiting to all project routes
router.use(authenticate);
router.use(userRateLimiter);

// POST /api/v1/projects - Create
router.post('/', validate(createProjectSchema), createProject);

// GET /api/v1/projects - List My Projects
router.get('/', getMyProjects);

// GET /api/v1/projects/:id - Details
router.get('/:id', getProjectDetails);

// PATCH /api/v1/projects/:id - Update
router.patch('/:id', validate(updateProjectSchema), updateProject);

// DELETE /api/v1/projects/:id - Delete
router.delete('/:id', deleteProject);

// GET /api/v1/projects/:id/members - Get project members
router.get('/:id/members', getProjectMembers);

// POST /api/v1/projects/:id/members - Add member to project
router.post('/:id/members', validate(addProjectMemberSchema), addProjectMember);

// DELETE /api/v1/projects/:id/members/:userId - Remove member from project
router.delete('/:id/members/:userId', removeProjectMember);

export default router;