import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './documents.service';
import { ResponseHandler } from '../../utils/response';

export const saveDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const doc = await DocumentService.saveDocumentMetadata(req.body, userId, companyId);
    return ResponseHandler.created(res, doc);
  } catch (error) { next(error); }
};

export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return ResponseHandler.error(res, 'Project ID required', 400);
    
    const docs = await DocumentService.getProjectDocuments(String(project_id));
    return ResponseHandler.success(res, docs);
  } catch (error) { next(error); }
};