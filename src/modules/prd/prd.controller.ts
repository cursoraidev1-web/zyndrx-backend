import { Request, Response } from 'express';
import { PRDService } from './prd.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const prdService = new PRDService();

export class PRDController {
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId, title, content } = req.body;

    const prd = await prdService.create({
      projectId,
      title,
      content,
      createdBy: req.user.id,
    });

    logger.info('PRD created', { prdId: prd.id, userId: req.user.id });

    return ResponseHandler.created(res, prd, 'PRD created successfully');
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const prd = await prdService.getById(id, req.user.id);

    return ResponseHandler.success(res, prd);
  });

  getByProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const { status, page, limit } = req.query;

    const result = await prdService.getByProject(projectId, req.user.id, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return ResponseHandler.paginated(
      res,
      result.prds,
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
    const { title, content, changesSummary } = req.body;

    const prd = await prdService.update(id, req.user.id, {
      title,
      content,
      changesSummary,
    });

    logger.info('PRD updated', { prdId: id, userId: req.user.id });

    return ResponseHandler.success(res, prd, 'PRD updated successfully');
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const { status, feedback } = req.body;

    const prd = await prdService.updateStatus(id, req.user.id, status, feedback);

    logger.info('PRD status updated', { prdId: id, status, userId: req.user.id });

    return ResponseHandler.success(res, prd, `PRD ${status} successfully`);
  });

  submitForReview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const prd = await prdService.updateStatus(id, req.user.id, 'in_review');

    logger.info('PRD submitted for review', { prdId: id, userId: req.user.id });

    return ResponseHandler.success(res, prd, 'PRD submitted for review');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    await prdService.delete(id, req.user.id);

    logger.info('PRD deleted', { prdId: id, userId: req.user.id });

    return ResponseHandler.success(res, null, 'PRD deleted successfully');
  });

  getVersionHistory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const versions = await prdService.getVersionHistory(id, req.user.id);

    return ResponseHandler.success(res, versions);
  });
}
