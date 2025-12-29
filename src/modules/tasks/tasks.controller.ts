import { Request, Response, NextFunction } from 'express';
import { TaskService } from './tasks.service';
import { ResponseHandler } from '../../utils/response';

// GET /api/v1/tasks?project_id=...
export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id || typeof project_id !== 'string') {
      return ResponseHandler.error(res, 'Project ID is required', 400);
    }

    const tasks = await TaskService.getTasksByProject(project_id);
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

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const task = await TaskService.getTaskById(id, companyId);
    return ResponseHandler.success(res, task, 'Task fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const task = await TaskService.updateTask(id, companyId, req.body);
    return ResponseHandler.success(res, task, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await TaskService.deleteTask(id, companyId);
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