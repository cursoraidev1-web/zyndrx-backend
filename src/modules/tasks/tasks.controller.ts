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
    const task = await TaskService.createTask(req.body, userId);
    return ResponseHandler.created(res, task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const task = await TaskService.updateTask(id, req.body);
    return ResponseHandler.success(res, task, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};