import { Router } from 'express';
import { ProjectsController } from './projects.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
} from './projects.validation';

const router = Router();
const projectsController = new ProjectsController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project
 * @access  Private (Authenticated users)
 */
router.post(
  '/',
  validateBody(createProjectSchema),
  projectsController.createProject
);

/**
 * @route   GET /api/v1/projects
 * @desc    Get all projects for current user
 * @access  Private (Authenticated users)
 */
router.get('/', projectsController.getUserProjects);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get single project by ID
 * @access  Private (Project members only)
 */
router.get('/:id', projectsController.getProjectById);

/**
 * @route   PUT /api/v1/projects/:id
 * @desc    Update project
 * @access  Private (Project owner only)
 */
router.put(
  '/:id',
  validateBody(updateProjectSchema),
  projectsController.updateProject
);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Delete project
 * @access  Private (Project owner only)
 */
router.delete('/:id', projectsController.deleteProject);

/**
 * @route   POST /api/v1/projects/:id/members
 * @desc    Add member to project
 * @access  Private (Owner or admins only)
 */
router.post(
  '/:id/members',
  validateBody(addMemberSchema),
  projectsController.addMember
);

/**
 * @route   GET /api/v1/projects/:id/members
 * @desc    Get all members of a project
 * @access  Private (Project members only)
 */
router.get('/:id/members', projectsController.getProjectMembers);

/**
 * @route   DELETE /api/v1/projects/:id/members/:userId
 * @desc    Remove member from project
 * @access  Private (Owner or admins only)
 */
router.delete('/:id/members/:userId', projectsController.removeMember);

export default router;
