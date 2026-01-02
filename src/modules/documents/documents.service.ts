import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { ProjectService } from '../projects/projects.service';
import { EmailService } from '../../utils/email.service';

const db = supabaseAdmin as SupabaseClient<Database>;
const BUCKET_NAME = 'documents';

interface UserRecord { email: string; full_name: string; }
interface ProjectRecord { name: string; company_id: string; }

export class DocumentService {
  
  static async generateUploadToken(projectId: string, fileName: string, fileSize: number, fileType: string, userId: string, companyId: string) {
    const project = await ProjectService.getProjectById(projectId, companyId);
    if (!project) throw new AppError('Project not found', 404);

    const uploadPath = `${companyId}/${projectId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    return {
      upload_path: uploadPath,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  static async saveDocumentMetadata(data: any, userId: string, companyId: string) {
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.file_path);
    
    const { data: doc, error } = await (db.from('documents') as any)
      .insert({
        project_id: data.project_id,
        title: data.title,
        file_url: urlData?.publicUrl,
        file_type: data.file_type,
        file_size: data.file_size,
        uploaded_by: userId,
        company_id: companyId,
      })
      .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
      .single();

    if (error) throw new AppError(error.message, 500);

    // Non-blocking notification
    this.sendDocumentNotification(doc, userId, data.project_id);
    return doc;
  }

  private static async sendDocumentNotification(doc: any, userId: string, projectId: string) {
    try {
      const [uFetch, pFetch] = await Promise.all([
        db.from('users').select('email, full_name').eq('id', userId).single(),
        db.from('projects').select('name').eq('id', projectId).single()
      ]);
      const uploader = uFetch.data as unknown as UserRecord;
      const project = pFetch.data as unknown as ProjectRecord;
      if (uploader?.email) {
        await EmailService.sendDocumentCreatedEmail(uploader.email, uploader.full_name, doc.title, project.name, projectId);
      }
    } catch (e) { logger.warn('Email failed', e); }
  }

  static async getProjectDocuments(projectId: string, companyId: string) {
    const { data, error } = await db.from('documents').select('*, uploader:users!documents_uploaded_by_fkey(full_name)').eq('project_id', projectId).eq('company_id', companyId);
    if (error) throw new AppError(error.message, 500);
    return data || [];
  }

  static async getDocumentById(documentId: string, companyId: string) {
    const { data, error } = await db.from('documents').select('*').eq('id', documentId).eq('company_id', companyId).single();
    if (error || !data) throw new AppError('Document not found', 404);
    return data;
  }

  // ✅ FIX: Added missing method
  static async generateDownloadUrl(documentId: string, companyId: string) {
    const document = (await this.getDocumentById(documentId, companyId)) as any;
    const filePath = document.file_url.split(`/${BUCKET_NAME}/`)[1];
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).createSignedUrl(filePath, 3600);
    if (error) throw new AppError('Failed to generate signed URL', 500);
    return { download_url: data.signedUrl, expires_at: new Date(Date.now() + 3600000).toISOString() };
  }

  // ✅ FIX: Cleaned up delete logic and cast to 'any' for 'never' error
  static async deleteDocument(documentId: string, userId: string, companyId: string) {
    const document = (await this.getDocumentById(documentId, companyId)) as any;
    const filePath = document.file_url.split(`/${BUCKET_NAME}/`)[1];
    if (filePath) await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);
    const { error } = await db.from('documents').delete().eq('id', documentId);
    if (error) throw new AppError('Delete failed', 500);
  }
}