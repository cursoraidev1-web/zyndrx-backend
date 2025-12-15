import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from './project.validation';

const router = Router();
const projectController = new ProjectController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post(
  '/',
  validate(createProjectSchema),
  auditLog('create', 'project'),
  projectController.create
);

/**
 * @route   GET /api/v1/projects
 * @desc    Get all projects for current user
 * @access  Private
 */
router.get('/', projectController.getAll);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
router.get('/:id', projectController.getById);

/**
 * @route   PUT /api/v1/projects/:id
 * @desc    Update a project
 * @access  Private (Owner only)
 */
router.put(
  '/:id',
  validate(updateProjectSchema),
  auditLog('update', 'project'),
  projectController.update
);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Delete a project
 * @access  Private (Owner only)
 */
router.delete('/:id', auditLog('delete', 'project'), projectController.delete);

/**
 * @route   GET /api/v1/projects/:id/members
 * @desc    Get project members
 * @access  Private
 */
router.get('/:id/members', projectController.getMembers);

/**
 * @route   POST /api/v1/projects/:id/members
 * @desc    Add member to project
 * @access  Private (Owner only)
 */
router.post(
  '/:id/members',
  validate(addMemberSchema),
  auditLog('add_member', 'project'),
  projectController.addMember
);

/**
 * @route   DELETE /api/v1/projects/:id/members/:memberId
 * @desc    Remove member from project
 * @access  Private (Owner only)
 */
router.delete(
  '/:id/members/:memberId',
  auditLog('remove_member', 'project'),
  projectController.removeMember
);

export default router;
