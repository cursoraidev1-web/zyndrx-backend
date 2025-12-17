import { Request, Response } from 'express';
import { ProjectService } from './project.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const projectService = new ProjectService();

export class ProjectController {
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { name, description, startDate, endDate } = req.body;

    const project = await projectService.create({
      name,
      description,
      startDate,
      endDate,
      ownerId: req.user.id,
    });

    logger.info('Project created', { projectId: project.id, userId: req.user.id });

    return ResponseHandler.created(res, project, 'Project created successfully');
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const project = await projectService.getById(id, req.user.id);

    return ResponseHandler.success(res, project);
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { page, limit } = req.query;

    const result = await projectService.getAll(
      req.user.id,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    return ResponseHandler.paginated(
      res,
      result.projects,
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
    const { name, description, status, startDate, endDate } = req.body;

    const project = await projectService.update(id, req.user.id, {
      name,
      description,
      status,
      startDate,
      endDate,
    });

    logger.info('Project updated', { projectId: id, userId: req.user.id });

    return ResponseHandler.success(res, project, 'Project updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    await projectService.delete(id, req.user.id);

    logger.info('Project deleted', { projectId: id, userId: req.user.id });

    return ResponseHandler.success(res, null, 'Project deleted successfully');
  });

  addMember = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const { userId, role } = req.body;

    const member = await projectService.addMember(id, req.user.id, userId, role);

    logger.info('Member added to project', { projectId: id, newMemberId: userId });

    return ResponseHandler.created(res, member, 'Member added successfully');
  });

  removeMember = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id, memberId } = req.params;

    await projectService.removeMember(id, req.user.id, memberId);

    logger.info('Member removed from project', { projectId: id, memberId });

    return ResponseHandler.success(res, null, 'Member removed successfully');
  });

  getMembers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const members = await projectService.getMembers(id, req.user.id);

    return ResponseHandler.success(res, members);
  });
}
