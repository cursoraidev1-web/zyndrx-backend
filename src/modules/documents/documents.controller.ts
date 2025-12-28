import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './documents.service';
import { ResponseHandler } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { supabaseAdmin } from '../../config/supabase';
import logger from '../../utils/logger';

const db = supabaseAdmin;

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

export const getDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const document = await DocumentService.getDocumentById(id, companyId);
    return ResponseHandler.success(res, document, 'Document fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    const { title, tags } = req.body;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    // Verify document exists and user has access
    const document = await DocumentService.getDocumentById(id, companyId);
    
    // Check permissions
    const { data: membership } = await db
      .from('user_companies')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    const member = membership as any;
    const isAdmin = member?.role === 'admin';
    const isUploader = document.uploaded_by === userId;

    if (!isAdmin && !isUploader) {
      return ResponseHandler.error(res, 'You do not have permission to update this document', 403);
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updatePayload.title = title;
    if (tags !== undefined) updatePayload.tags = tags;

    const { data: updatedDoc, error } = await (db.from('documents') as any)
      .update(updatePayload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
      .single();

    if (error) {
      logger.error('Failed to update document', { error: error.message, id });
      throw new AppError(`Failed to update document: ${error.message}`, 500);
    }

    return ResponseHandler.success(res, updatedDoc, 'Document updated successfully');
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
