import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { config } from '../../config';
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
    // Verify user has access to the company before inserting
    const { data: membership, error: membershipError } = await (db.from('user_companies') as any)
      .select('id, status, role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      logger.error('User company membership check failed', { membershipError, userId, companyId });
      throw new AppError('You do not have access to this company', 403);
    }

    if ((membership as any).status !== 'active') {
      throw new AppError('Your company membership is not active', 403);
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.file_path);
    
    // Ensure all required fields are present
    const insertData: any = {
      project_id: data.project_id,
      title: data.title || 'Untitled Document',
      file_url: urlData?.publicUrl || '',
      file_type: data.file_type || 'application/octet-stream',
      file_size: data.file_size || 0,
      uploaded_by: userId,
      company_id: companyId,
      tags: data.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Validate required fields
    if (!insertData.project_id) {
      throw new AppError('Project ID is required', 400);
    }
    if (!insertData.company_id) {
      throw new AppError('Company ID is required', 400);
    }
    if (!insertData.uploaded_by) {
      throw new AppError('User ID is required', 400);
    }

    // Use service role client which should bypass RLS
    // Verify we're using service role (should have service_role key, not anon key)
    logger.debug('Inserting document with service role', { 
      userId, 
      companyId, 
      projectId: insertData.project_id,
      hasServiceRoleKey: !!config.supabase.serviceRoleKey,
      serviceRoleKeyPrefix: config.supabase.serviceRoleKey?.substring(0, 20) || 'NOT SET'
    });

    // Use direct insert with service role (should bypass RLS)
    // The migration 027_permanent_fix_service_role_rls.sql ensures service_role can bypass RLS
    const { data: doc, error } = await (db.from('documents') as any)
      .insert(insertData)
      .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
      .single();

    if (error) {
      logger.error('Document insert error', { 
        error: error.message, 
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        insertData, 
        userId, 
        companyId,
        membership,
        serviceRoleKeySet: !!config.supabase.serviceRoleKey,
        serviceRoleKeyLength: config.supabase.serviceRoleKey?.length || 0,
        serviceRoleKeyPrefix: config.supabase.serviceRoleKey?.substring(0, 20) || 'NOT SET'
      });
      
      // Provide more specific error messages
      if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('violates row-level security')) {
        const diagnosticMessage = `
RLS Policy Violation Detected.

This error indicates that Row-Level Security (RLS) is blocking the operation even though the service role should bypass RLS.

Diagnostics:
- Service Role Key Set: ${!!config.supabase.serviceRoleKey ? 'YES' : 'NO'}
- Service Role Key Length: ${config.supabase.serviceRoleKey?.length || 0}
- User ID: ${userId}
- Company ID: ${companyId}
- Project ID: ${insertData.project_id}
- User Membership Status: ${membership ? (membership as any).status : 'NOT FOUND'}

Possible Causes:
1. SUPABASE_SERVICE_ROLE_KEY environment variable is not set or incorrect
2. The service role key does not match the one in Supabase Dashboard
3. The backend server needs to be restarted after setting the environment variable
4. RLS policies need to be updated (run migration 027_permanent_fix_service_role_rls.sql)

Action Required:
1. Verify SUPABASE_SERVICE_ROLE_KEY in backend/.env matches Supabase Dashboard > Settings > API > service_role key
2. Restart the backend server
3. Run migration 027_permanent_fix_service_role_rls.sql in Supabase SQL Editor
4. Check backend logs for more details
        `.trim();
        
        logger.error('RLS Policy Violation', {
          error: error.message,
          diagnosticMessage,
          insertData,
          userId,
          companyId
        });
        
        throw new AppError(
          `Permission denied: Unable to create document. Please contact your administrator. Error: ${error.message}`,
          403
        );
      }
      if (error.code === '23503') {
        throw new AppError('Invalid project or company reference', 400);
      }
      if (error.code === '23505') {
        throw new AppError('A document with this information already exists', 409);
      }
      throw new AppError(error.message || 'Failed to save document metadata', 500);
    }

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