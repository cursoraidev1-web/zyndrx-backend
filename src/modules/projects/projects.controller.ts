import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './projects.service';
import { ResponseHandler } from '../../utils/response';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // From auth middleware
    
    const project = await ProjectService.createProject({
      ...req.body,
      owner_id: userId
    });

    return ResponseHandler.created(res, project, 'Project created successfully');
  } catch (error) {
    next(error);
  }
};

export const getMyProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const projects = await ProjectService.getUserProjects(userId);
    return ResponseHandler.success(res, projects, 'Projects fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getProjectDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await ProjectService.getProjectById(id);
    
    if (!project) return ResponseHandler.notFound(res, 'Project not found');
    
    return ResponseHandler.success(res, project);
  } catch (error) {
    next(error);
  }
};