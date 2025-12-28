import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './documents.service';
import { ResponseHandler } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';

export const requestUploadToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const { project_id, file_name, file_size, file_type } = req.body;

    const tokenData = await DocumentService.generateUploadToken(
      project_id,
      file_name,
      file_size,
      file_type,
      userId,
      companyId
    );

    return ResponseHandler.success(res, tokenData);
  } catch (error) {
    next(error);
  }
};

export const saveDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const doc = await DocumentService.saveDocumentMetadata(req.body, userId, companyId);
    return ResponseHandler.created(res, doc);
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!project_id) {
      return ResponseHandler.error(res, 'Project ID required', 400);
    }

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }
    
    const docs = await DocumentService.getProjectDocuments(String(project_id), companyId);
    return ResponseHandler.success(res, docs);
  } catch (error) {
    next(error);
  }
};

export const getDocumentDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const downloadData = await DocumentService.generateDownloadUrl(id, companyId);
    return ResponseHandler.success(res, downloadData);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await DocumentService.deleteDocument(id, userId, companyId);
    return ResponseHandler.success(res, null, 'Document deleted successfully');
  } catch (error) {
    next(error);
  }
};
