import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const documentsService = new DocumentsService();

export class DocumentsController {
  /**
   * Create a document record
   * POST /api/v1/documents
   */
  createDocument = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const document = await documentsService.createDocument(req.user.id, req.body);

    logger.info('Document created', {
      documentId: document.id,
      projectId: req.body.projectId,
      userId: req.user.id,
    });

    return ResponseHandler.created(res, document, 'Document created successfully');
  });

  /**
   * Get documents with filtering and pagination
   * GET /api/v1/documents
   */
  getDocuments = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await documentsService.getDocuments(req.user.id, req.query as any);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'Documents retrieved successfully'
    );
  });

  /**
   * Get single document by ID
   * GET /api/v1/documents/:id
   */
  getDocumentById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const document = await documentsService.getDocumentById(id, req.user.id);

    return ResponseHandler.success(res, document, 'Document retrieved successfully');
  });

  /**
   * Update document metadata
   * PUT /api/v1/documents/:id
   */
  updateDocument = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const document = await documentsService.updateDocument(id, req.user.id, req.body);

    logger.info('Document updated', {
      documentId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, document, 'Document updated successfully');
  });

  /**
   * Delete document
   * DELETE /api/v1/documents/:id
   */
  deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const result = await documentsService.deleteDocument(id, req.user.id);

    logger.info('Document deleted', {
      documentId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, result, 'Document deleted successfully');
  });
}
