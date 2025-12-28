import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { ProjectService } from '../projects/projects.service';

const db = supabaseAdmin as SupabaseClient<Database>;
const BUCKET_NAME = 'documents';

// Allowed file types
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
];

// Max file sizes per plan (in bytes)
const MAX_FILE_SIZES = {
  free: 10 * 1024 * 1024,      // 10MB
  pro: 100 * 1024 * 1024,      // 100MB
  enterprise: 500 * 1024 * 1024, // 500MB
};

export class DocumentService {
  
  /**
   * Generate upload token and path for file upload
   */
  static async generateUploadToken(
    projectId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    userId: string,
    companyId: string
  ) {
    try {
      // Verify project exists and user has access
      const project = await ProjectService.getProjectById(projectId, companyId);
      if (!project) {
        throw new AppError('Project not found or access denied', 404);
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        throw new AppError(
          `File type not allowed. Allowed types: PDF, Word, Text, Images, Spreadsheets, Archives`,
          400
        );
      }

      // Get subscription to check file size limits
      const subscription = await SubscriptionService.getCompanySubscription(companyId);
      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Map plan types to file size limits
      const planType = subscription.planType; // 'free' | 'pro' | 'enterprise'
      const maxFileSize = MAX_FILE_SIZES[planType as keyof typeof MAX_FILE_SIZES] || MAX_FILE_SIZES.free;

      // Check file size
      if (fileSize > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        throw new AppError(
          `File size exceeds limit. Maximum file size for ${subscription.planType} plan is ${maxSizeMB}MB`,
          413
        );
      }

      // Check storage limits
      const usage = await SubscriptionService.getCompanyUsage(companyId);
      const limits = await SubscriptionService.getPlanLimits(subscription.planType);
      
      if (limits) {
        const storageLimitBytes = limits.maxStorageGB * 1024 * 1024 * 1024;
        const currentStorageBytes = usage.storageUsedGB * 1024 * 1024 * 1024;
        
        if (limits.maxStorageGB !== -1 && currentStorageBytes + fileSize > storageLimitBytes) {
          throw new AppError(
            `Storage limit reached. You have used ${usage.storageUsedGB.toFixed(2)}GB of ${limits.maxStorageGB}GB. Please upgrade your plan or delete some files.`,
            413
          );
        }
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uploadPath = `${companyId}/${projectId}/${timestamp}-${sanitizedFileName}`;

      // Return upload path - frontend will upload directly using Supabase client
      // The upload path is validated and authorized by this endpoint
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour validity

      return {
        upload_path: uploadPath,
        expires_at: expiresAt,
        max_file_size: maxFileSize,
        allowed_types: ALLOWED_MIME_TYPES,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to generate upload token', { error, projectId, fileName });
      throw new AppError('Failed to generate upload token', 500);
    }
  }

  /**
   * Save document metadata after file upload
   */
  static async saveDocumentMetadata(data: any, userId: string, companyId: string) {
    try {
      // Verify project exists and belongs to company
      const project = await ProjectService.getProjectById(data.project_id, companyId);
      if (!project) {
        throw new AppError('Project not found or access denied', 404);
      }

      // Verify file exists in storage (optional check)
      // File should already be uploaded by frontend at this point
      try {
        const fileName = data.file_path.split('/').pop();
        const folderPath = data.file_path.split('/').slice(0, -1).join('/');
        const { data: fileData, error: fileError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .list(folderPath, {
            limit: 1000,
            search: fileName,
          });

        if (fileError) {
          logger.warn('Could not verify file in storage', { filePath: data.file_path, error: fileError });
        }
      } catch (verifyError) {
        logger.warn('File verification skipped', { filePath: data.file_path, error: verifyError });
        // Continue with metadata save - file might be uploaded but not yet indexed
      }

      // Check plan limits
      const limitCheck = await SubscriptionService.checkLimit(companyId, 'document');
      if (!limitCheck.allowed) {
        throw new AppError(limitCheck.message || 'Plan limit reached', 403);
      }

      // Construct file_url from file_path
      const { data: urlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.file_path);

      // Fallback URL construction if getPublicUrl fails
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const fallbackUrl = urlData?.publicUrl || 
        `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${data.file_path}`;

      const { data: doc, error } = await (db.from('documents') as any)
        .insert({
          project_id: data.project_id,
          prd_id: data.prd_id || null,
          title: data.title,
          file_url: fallbackUrl,
          file_type: data.file_type,
          file_size: data.file_size,
          tags: data.tags || [],
          uploaded_by: userId,
          company_id: companyId,
        })
        .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
        .single();

      if (error) {
        logger.error('Failed to save document metadata', { error, data });
        throw new AppError(`Failed to save document: ${error.message}`, 500);
      }

      return doc;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Document metadata save error', { error });
      throw new AppError('Failed to save document metadata', 500);
    }
  }

  /**
   * Get documents for a project
   */
  static async getProjectDocuments(projectId: string, companyId: string) {
    try {
      // Verify project exists and belongs to company
      const project = await ProjectService.getProjectById(projectId, companyId);
      if (!project) {
        throw new AppError('Project not found or access denied', 404);
      }

      const { data, error } = await db
        .from('documents')
        .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
        .eq('project_id', projectId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch documents', { error, projectId });
        throw new AppError(`Failed to fetch documents: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get documents error', { error, projectId });
      throw new AppError('Failed to fetch documents', 500);
    }
  }

  /**
   * Get document by ID
   */
  static async getDocumentById(documentId: string, companyId: string): Promise<any> {
    try {
      const { data, error } = await db
        .from('documents')
        .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
        .eq('id', documentId)
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        throw new AppError('Document not found or access denied', 404);
      }

      return data as any;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get document error', { error, documentId });
      throw new AppError('Failed to fetch document', 500);
    }
  }

  /**
   * Generate signed download URL for document
   */
  static async generateDownloadUrl(documentId: string, companyId: string) {
    try {
      const document = await this.getDocumentById(documentId, companyId);
      
      // Extract file path from file_url
      // file_url format: https://...supabase.co/storage/v1/object/public/documents/{path}
      // We need to extract the path after 'documents/'
      let filePath = '';
      if (document.file_url) {
        const urlParts = document.file_url.split('/documents/');
        filePath = urlParts.length > 1 ? urlParts[1] : document.file_url.split('/').slice(-3).join('/');
      } else {
        throw new AppError('Document file URL not found', 404);
      }
      
      // Generate signed URL (valid for 5 minutes)
      const expiresIn = 300; // 5 minutes
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error || !data) {
        logger.error('Failed to generate download URL', { error, filePath, documentId });
        throw new AppError('Failed to generate download URL', 500);
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      return {
        download_url: data.signedUrl,
        expires_at: expiresAt,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Generate download URL error', { error, documentId });
      throw new AppError('Failed to generate download URL', 500);
    }
  }

  /**
   * Delete document and file from storage
   */
  static async deleteDocument(documentId: string, userId: string, companyId: string) {
    try {
      const document = await this.getDocumentById(documentId, companyId);

      // Check if user is the uploader or company admin
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
        throw new AppError('You do not have permission to delete this document', 403);
      }

      // Extract file path from file_url
      let filePath = '';
      if (document.file_url) {
        const urlParts = document.file_url.split('/documents/');
        filePath = urlParts.length > 1 ? urlParts[1] : document.file_url.split('/').slice(-3).join('/');
      } else {
        throw new AppError('Document file URL not found', 404);
      }

      // Delete file from storage
      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (storageError) {
        logger.warn('Failed to delete file from storage', { error: storageError, filePath });
        // Continue with metadata deletion even if storage deletion fails
      }

      // Delete document metadata
      const { error: deleteError } = await db
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('company_id', companyId);

      if (deleteError) {
        logger.error('Failed to delete document metadata', { error: deleteError, documentId });
        throw new AppError('Failed to delete document', 500);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete document error', { error, documentId });
      throw new AppError('Failed to delete document', 500);
    }
  }
}
