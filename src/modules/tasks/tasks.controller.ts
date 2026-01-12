import { Request, Response, NextFunction } from 'express';
import { TaskService } from './tasks.service';
import { ResponseHandler } from '../../utils/response';

/**
 * GET /api/v1/tasks?project_id=...
 * Get tasks for a specific project
 * Requires company context and verifies project access
 */
export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = req.user!.companyId || req.companyId;
    const userId = req.user!.id;
    
    if (!project_id || typeof project_id !== 'string') {
      return ResponseHandler.error(res, 'Project ID is required', 400);
    }

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const tasks = await TaskService.getTasksByProject(project_id, companyId, userId);
    return ResponseHandler.success(res, tasks);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const task = await TaskService.createTask(req.body, userId, companyId);
    return ResponseHandler.created(res, task);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/:id
 * Get a single task by ID
 * Requires company context to prevent IDOR vulnerabilities
 */
export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const taskId = Array.isArray(id) ? id[0] : id;
    const task = await TaskService.getTaskById(taskId, companyId);
    return ResponseHandler.success(res, task, 'Task fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tasks/:id
 * Update a task
 * Requires company context to prevent IDOR vulnerabilities
 */
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const taskId = Array.isArray(id) ? id[0] : id;
    const task = await TaskService.updateTask(taskId, req.body, companyId);
    return ResponseHandler.success(res, task, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/tasks/:id
 * Delete a task
 * Requires company context to prevent IDOR vulnerabilities
 */
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const taskId = Array.isArray(id) ? id[0] : id;
    await TaskService.deleteTask(taskId, companyId);
    return ResponseHandler.success(res, null, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getAllTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.query.user_id as string | undefined;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const tasks = await TaskService.getAllTasks(companyId, userId);
    return ResponseHandler.success(res, tasks, 'Tasks fetched successfully');
  } catch (error) {
    next(error);
  }
};