import { Request, Response } from 'express';
import { TaskService } from './task.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const taskService = new TaskService();

export class TaskController {
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId, prdId, title, description, priority, assignedTo, dueDate } = req.body;

    const task = await taskService.create({
      projectId,
      prdId,
      title,
      description,
      priority: priority || 'medium',
      assignedTo,
      dueDate,
      createdBy: req.user.id,
    });

    logger.info('Task created', { taskId: task.id, userId: req.user.id });

    return ResponseHandler.created(res, task, 'Task created successfully');
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const task = await taskService.getById(id, req.user.id);

    return ResponseHandler.success(res, task);
  });

  getByProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const { status, priority, assignedTo, prdId, page, limit } = req.query;

    const result = await taskService.getByProject(projectId, req.user.id, {
      status: status as any,
      priority: priority as any,
      assignedTo: assignedTo as string,
      prdId: prdId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return ResponseHandler.paginated(
      res,
      result.tasks,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total
    );
  });

  getMyTasks = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { status, page, limit } = req.query;

    const result = await taskService.getMyTasks(req.user.id, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return ResponseHandler.paginated(
      res,
      result.tasks,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } = req.body;

    const task = await taskService.update(id, req.user.id, {
      title,
      description,
      status,
      priority,
      assignedTo,
      dueDate,
    });

    logger.info('Task updated', { taskId: id, userId: req.user.id });

    return ResponseHandler.success(res, task, 'Task updated successfully');
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const { status } = req.body;

    const task = await taskService.update(id, req.user.id, { status });

    logger.info('Task status updated', { taskId: id, status, userId: req.user.id });

    return ResponseHandler.success(res, task, 'Task status updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    await taskService.delete(id, req.user.id);

    logger.info('Task deleted', { taskId: id, userId: req.user.id });

    return ResponseHandler.success(res, null, 'Task deleted successfully');
  });
}
