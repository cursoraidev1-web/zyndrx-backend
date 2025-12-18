import { Router } from 'express';
import { TasksController } from './tasks.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  bulkUpdateTasksSchema,
} from './tasks.validation';

const router = Router();
const tasksController = new TasksController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private (Project members)
 */
router.post('/', validateBody(createTaskSchema), tasksController.createTask);

/**
 * @route   GET /api/v1/tasks
 * @desc    Get tasks with filtering, sorting, and pagination
 * @query   projectId, prdId, status, priority, assignedTo, search, sortBy, sortOrder, page, limit
 * @access  Private (Project members)
 */
router.get('/', tasksController.getTasks);

/**
 * @route   GET /api/v1/tasks/stats/:projectId
 * @desc    Get task statistics for a project
 * @access  Private (Project members)
 */
router.get('/stats/:projectId', tasksController.getTaskStats);

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get single task by ID
 * @access  Private (Project members)
 */
router.get('/:id', tasksController.getTaskById);

/**
 * @route   PUT /api/v1/tasks/:id
 * @desc    Update task
 * @access  Private (Project members)
 */
router.put('/:id', validateBody(updateTaskSchema), tasksController.updateTask);

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete task
 * @access  Private (Creator or project owner)
 */
router.delete('/:id', tasksController.deleteTask);

/**
 * @route   PATCH /api/v1/tasks/bulk
 * @desc    Bulk update tasks (primarily for reordering)
 * @access  Private (Project members)
 */
router.patch('/bulk', validateBody(bulkUpdateTasksSchema), tasksController.bulkUpdateTasks);

export default router;
