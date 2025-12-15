import { Request, Response } from 'express';
import { DocumentService } from './document.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const documentService = new DocumentService();

export class DocumentController {
  // Step 1: Get upload URL
  getUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId, fileName, fileType } = req.body;

    const result = await documentService.getUploadUrl(projectId, req.user.id, fileName, fileType);

    return ResponseHandler.success(res, result, 'Upload URL generated');
  });

  // Step 2: After file upload, create document record
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId, prdId, title, fileUrl, fileType, fileSize, tags } = req.body;

    const document = await documentService.create({
      projectId,
      prdId,
      title,
      fileUrl,
      fileType,
      fileSize,
      tags,
      uploadedBy: req.user.id,
    });

    logger.info('Document created', { documentId: document.id, userId: req.user.id });

    return ResponseHandler.created(res, document, 'Document created successfully');
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    const document = await documentService.getById(id, req.user.id);

    return ResponseHandler.success(res, document);
  });

  getByProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const { tags, prdId, page, limit } = req.query;

    const result = await documentService.getByProject(projectId, req.user.id, {
      tags: tags ? (tags as string).split(',') : undefined,
      prdId: prdId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return ResponseHandler.paginated(
      res,
      result.documents,
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
    const { title, tags } = req.body;

    const document = await documentService.update(id, req.user.id, { title, tags });

    logger.info('Document updated', { documentId: id, userId: req.user.id });

    return ResponseHandler.success(res, document, 'Document updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    await documentService.delete(id, req.user.id);

    logger.info('Document deleted', { documentId: id, userId: req.user.id });

    return ResponseHandler.success(res, null, 'Document deleted successfully');
  });
}
