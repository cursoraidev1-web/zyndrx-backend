import { Request, Response } from 'express';
import { ProjectsService } from './projects.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const projectsService = new ProjectsService();

export class ProjectsController {
  /**
   * Create a new project
   * POST /api/v1/projects
   */
  createProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const project = await projectsService.createProject(req.user.id, req.body);

    logger.info('Project created', {
      projectId: project.id,
      userId: req.user.id,
    });

    return ResponseHandler.created(res, project, 'Project created successfully');
  });

  /**
   * Get all projects for current user
   * GET /api/v1/projects
   */
  getUserProjects = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const projects = await projectsService.getUserProjects(req.user.id);

    return ResponseHandler.success(
      res,
      projects,
      'Projects retrieved successfully'
    );
  });

  /**
   * Get single project by ID
   * GET /api/v1/projects/:id
   */
  getProjectById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const project = await projectsService.getProjectById(id, req.user.id);

    return ResponseHandler.success(
      res,
      project,
      'Project retrieved successfully'
    );
  });

  /**
   * Update project
   * PUT /api/v1/projects/:id
   */
  updateProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const project = await projectsService.updateProject(
      id,
      req.user.id,
      req.body
    );

    logger.info('Project updated', {
      projectId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, project, 'Project updated successfully');
  });

  /**
   * Delete project
   * DELETE /api/v1/projects/:id
   */
  deleteProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const result = await projectsService.deleteProject(id, req.user.id);

    logger.info('Project deleted', {
      projectId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, result, 'Project deleted successfully');
  });

  /**
   * Add member to project
   * POST /api/v1/projects/:id/members
   */
  addMember = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const member = await projectsService.addMember(id, req.user.id, req.body);

    logger.info('Member added to project', {
      projectId: id,
      memberId: req.body.userId,
      addedBy: req.user.id,
    });

    return ResponseHandler.created(
      res,
      member,
      'Member added to project successfully'
    );
  });

  /**
   * Remove member from project
   * DELETE /api/v1/projects/:id/members/:userId
   */
  removeMember = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id, userId } = req.params;
    const result = await projectsService.removeMember(id, req.user.id, userId);

    logger.info('Member removed from project', {
      projectId: id,
      memberId: userId,
      removedBy: req.user.id,
    });

    return ResponseHandler.success(
      res,
      result,
      'Member removed from project successfully'
    );
  });

  /**
   * Get all members of a project
   * GET /api/v1/projects/:id/members
   */
  getProjectMembers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const members = await projectsService.getProjectMembers(id, req.user.id);

    return ResponseHandler.success(
      res,
      members,
      'Project members retrieved successfully'
    );
  });
}
