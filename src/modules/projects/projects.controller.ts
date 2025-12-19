import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './projects.service';
import { ResponseHandler } from '../../utils/response';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // From auth middleware
    
    // Explicitly destructure to ensure we capture the new 'team_name' from the UI
    const { name, description, start_date, end_date, team_name } = req.body;
    
    const project = await ProjectService.createProject({
      name,
      description,
      start_date,
      end_date,
      team_name: team_name || 'Engineering', // Default to Engineering if missing
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
    
    // Support filtering from the UI (e.g., ?team_name=Design&status=active)
    const filters = {
      team_name: req.query.team_name as string,
      status: req.query.status as string
    };

    const projects = await ProjectService.getUserProjects(userId, filters);
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