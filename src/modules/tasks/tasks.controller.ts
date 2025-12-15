import { Request, Response } from 'express';
import { TasksService } from './tasks.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const tasksService = new TasksService();

export class TasksController {
  /**
   * Create a new task
   * POST /api/v1/tasks
   */
  createTask = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const task = await tasksService.createTask(req.user.id, req.body);

    logger.info('Task created', {
      taskId: task.id,
      projectId: req.body.projectId,
      userId: req.user.id,
    });

    return ResponseHandler.created(res, task, 'Task created successfully');
  });

  /**
   * Get tasks with filtering, sorting, and pagination
   * GET /api/v1/tasks
   */
  getTasks = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await tasksService.getTasks(req.user.id, req.query as any);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'Tasks retrieved successfully'
    );
  });

  /**
   * Get single task by ID
   * GET /api/v1/tasks/:id
   */
  getTaskById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const task = await tasksService.getTaskById(id, req.user.id);

    return ResponseHandler.success(res, task, 'Task retrieved successfully');
  });

  /**
   * Update task
   * PUT /api/v1/tasks/:id
   */
  updateTask = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const task = await tasksService.updateTask(id, req.user.id, req.body);

    logger.info('Task updated', {
      taskId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, task, 'Task updated successfully');
  });

  /**
   * Delete task
   * DELETE /api/v1/tasks/:id
   */
  deleteTask = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const result = await tasksService.deleteTask(id, req.user.id);

    logger.info('Task deleted', {
      taskId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, result, 'Task deleted successfully');
  });

  /**
   * Bulk update tasks (for reordering)
   * PATCH /api/v1/tasks/bulk
   */
  bulkUpdateTasks = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await tasksService.bulkUpdateTasks(req.user.id, req.body);

    logger.info('Bulk task update', {
      taskCount: req.body.tasks?.length || 0,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, result, 'Tasks updated successfully');
  });

  /**
   * Get task statistics for a project
   * GET /api/v1/tasks/stats/:projectId
   */
  getTaskStats = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const stats = await tasksService.getTaskStats(projectId, req.user.id);

    return ResponseHandler.success(
      res,
      stats,
      'Task statistics retrieved successfully'
    );
  });
}
