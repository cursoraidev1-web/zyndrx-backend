import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './projects.service';
import { ResponseHandler } from '../../utils/response';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // From auth middleware
    const companyId = req.user!.companyId || req.body.company_id;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company ID is required', 400);
    }
    
    // Explicitly destructure to ensure we capture the new 'team_name' from the UI
    const { name, description, start_date, end_date, team_name } = req.body;
    
    const project = await ProjectService.createProject({
      name,
      description,
      start_date,
      end_date,
      team_name: team_name || 'Engineering', // Default to Engineering if missing
      owner_id: userId,
      company_id: companyId
    });

    return ResponseHandler.created(res, project, 'Project created successfully');
  } catch (error) {
    next(error);
  }
};

export const getMyProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }
    
    // Support filtering from the UI (e.g., ?team_name=Design&status=active)
    const filters = {
      team_name: req.query.team_name as string,
      status: req.query.status as string
    };

    const projects = await ProjectService.getUserProjects(userId, companyId, filters);
    return ResponseHandler.success(res, projects, 'Projects fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getProjectDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }
    
    const project = await ProjectService.getProjectById(id, companyId);
    
    if (!project) return ResponseHandler.notFound(res, 'Project not found');
    
    return ResponseHandler.success(res, project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const { name, description, start_date, end_date, status, team_name } = req.body;
    
    const project = await ProjectService.updateProject(id, companyId, {
      name,
      description,
      start_date,
      end_date,
      status,
      team_name
    });

    return ResponseHandler.success(res, project, 'Project updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await ProjectService.deleteProject(id, companyId);
    return ResponseHandler.success(res, null, 'Project deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getProjectMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const members = await ProjectService.getProjectMembers(id, companyId);
    return ResponseHandler.success(res, members, 'Project members fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const addProjectMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // Project ID
    const companyId = req.user!.companyId;
    const inviterId = req.user!.id; // Person doing the inviting
    const { user_id, role } = req.body; // Person being invited
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const member = await ProjectService.addProjectMember(
      id, 
      companyId, 
      user_id, 
      role, 
      inviterId
    );

    return ResponseHandler.created(res, member, 'Member added to project successfully');
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params;
    const companyId = req.user!.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await ProjectService.removeProjectMember(id, companyId, userId);
    return ResponseHandler.success(res, null, 'Member removed from project successfully');
  } catch (error) {
    next(error);
  }
};