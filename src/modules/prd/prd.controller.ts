import { Request, Response } from 'express';
import { PRDService } from './prd.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const prdService = new PRDService();

export class PRDController {
  /**
   * Create a new PRD
   * POST /api/v1/prds
   */
  createPRD = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const prd = await prdService.createPRD(req.user.id, req.body);

    logger.info('PRD created', {
      prdId: prd.id,
      projectId: req.body.projectId,
      userId: req.user.id,
    });

    return ResponseHandler.created(res, prd, 'PRD created successfully');
  });

  /**
   * Get PRDs with filtering and pagination
   * GET /api/v1/prds
   */
  getPRDs = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await prdService.getPRDs(req.user.id, req.query as any);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'PRDs retrieved successfully'
    );
  });

  /**
   * Get single PRD by ID with version history
   * GET /api/v1/prds/:id
   */
  getPRDById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const prd = await prdService.getPRDById(id, req.user.id);

    return ResponseHandler.success(res, prd, 'PRD retrieved successfully');
  });

  /**
   * Update PRD content
   * PUT /api/v1/prds/:id
   */
  updatePRD = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const prd = await prdService.updatePRD(id, req.user.id, req.body);

    logger.info('PRD updated', {
      prdId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, prd, 'PRD updated successfully');
  });

  /**
   * Update PRD status (submit, approve, reject)
   * PATCH /api/v1/prds/:id/status
   */
  updatePRDStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const prd = await prdService.updatePRDStatus(id, req.user.id, req.body);

    logger.info('PRD status updated', {
      prdId: id,
      status: req.body.status,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, prd, 'PRD status updated successfully');
  });

  /**
   * Delete PRD
   * DELETE /api/v1/prds/:id
   */
  deletePRD = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const result = await prdService.deletePRD(id, req.user.id);

    logger.info('PRD deleted', {
      prdId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, result, 'PRD deleted successfully');
  });

  /**
   * Get PRD version history
   * GET /api/v1/prds/:id/versions
   */
  getPRDVersions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const versions = await prdService.getPRDVersions(id, req.user.id);

    return ResponseHandler.success(
      res,
      versions,
      'PRD versions retrieved successfully'
    );
  });
}
