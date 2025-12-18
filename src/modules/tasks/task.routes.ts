import { Router } from 'express';
import { TaskController } from './task.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  getTasksByProjectSchema,
  updateTaskStatusSchema,
} from './task.validation';

const router = Router();
const taskController = new TaskController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post(
  '/',
  validate(createTaskSchema),
  auditLog('create', 'task'),
  taskController.create
);

/**
 * @route   GET /api/v1/tasks/my-tasks
 * @desc    Get current user's assigned tasks
 * @access  Private
 */
router.get('/my-tasks', taskController.getMyTasks);

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get task by ID
 * @access  Private
 */
router.get('/:id', taskController.getById);

/**
 * @route   GET /api/v1/tasks/project/:projectId
 * @desc    Get all tasks for a project
 * @access  Private
 */
router.get(
  '/project/:projectId',
  validate(getTasksByProjectSchema),
  taskController.getByProject
);

/**
 * @route   PUT /api/v1/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put(
  '/:id',
  validate(updateTaskSchema),
  auditLog('update', 'task'),
  taskController.update
);

/**
 * @route   PATCH /api/v1/tasks/:id/status
 * @desc    Update task status
 * @access  Private
 */
router.patch(
  '/:id/status',
  validate(updateTaskStatusSchema),
  auditLog('update_status', 'task'),
  taskController.updateStatus
);

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete('/:id', auditLog('delete', 'task'), taskController.delete);

export default router;
