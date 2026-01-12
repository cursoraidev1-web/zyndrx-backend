import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './documents.service';
import { ResponseHandler } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { supabaseAdmin } from '../../config/supabase';
import logger from '../../utils/logger';

const db = supabaseAdmin;

export const requestUploadToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const companyId = (req as any).user.companyId;
    const { project_id, file_name, file_size, file_type } = req.body;

    const tokenData = await DocumentService.generateUploadToken(project_id, file_name, file_size, file_type, userId, companyId);
    return ResponseHandler.success(res, tokenData);
  } catch (error) { next(error); }
};

export const saveDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const companyId = (req as any).user.companyId;
    const doc = await DocumentService.saveDocumentMetadata(req.body, userId, companyId);
    return ResponseHandler.created(res, doc);
  } catch (error) { next(error); }
};

export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = (req as any).user.companyId;
    const docs = await DocumentService.getProjectDocuments(String(project_id), companyId);
    return ResponseHandler.success(res, docs);
  } catch (error) { next(error); }
};

export const getDocumentDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;
    const docId = Array.isArray(id) ? id[0] : id;
    const downloadData = await DocumentService.generateDownloadUrl(docId, companyId);
    return ResponseHandler.success(res, downloadData);
  } catch (error) { next(error); }
};

export const updateDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const companyId = (req as any).user.companyId;
    const { title, tags } = req.body;

    const docId = Array.isArray(id) ? id[0] : id;
    const document = await DocumentService.getDocumentById(docId, companyId);
    
    const { data: membership } = await db.from('user_companies').select('role').eq('company_id', companyId).eq('user_id', userId).single();
    
    // ✅ FIX: Cast document to any to avoid Property 'uploaded_by' does not exist on type 'never'
    const isAdmin = (membership as any)?.role === 'admin';
    const isUploader = (document as any).uploaded_by === userId;

    if (!isAdmin && !isUploader) throw new AppError('Permission denied', 403);

    const { data: updatedDoc, error } = await (db.from('documents') as any)
      .update({ title, tags, updated_at: new Date().toISOString() })
      .eq('id', docId)
      .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
      .single();

    if (error) throw new AppError(error.message, 500);
    return ResponseHandler.success(res, updatedDoc);
  } catch (error) { next(error); }
};
export const getDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;
    
    const docId = Array.isArray(id) ? id[0] : id;
    const document = await DocumentService.getDocumentById(docId, companyId);
    return ResponseHandler.success(res, document, 'Document fetched successfully');
  } catch (error) {
    next(error);
  }
};


export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const companyId = (req as any).user.companyId;
    const docId = Array.isArray(id) ? id[0] : id;
    await DocumentService.deleteDocument(docId, userId, companyId);
    return ResponseHandler.success(res, null, 'Document deleted successfully');
  } catch (error) { next(error); }
};