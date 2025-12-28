import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { TaskService } from './tasks.service';

const db = supabaseAdmin as SupabaseClient<Database>;
const BUCKET_NAME = 'task-attachments';

// Allowed file types for task attachments
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
];

// Max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export class TaskAttachmentService {
  
  /**
   * Generate upload token for task attachment
   */
  static async generateUploadToken(
    taskId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    userId: string,
    companyId: string
  ) {
    try {
      // Verify task exists and user has access
      const task = await TaskService.getTaskById(taskId);
      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        throw new AppError('File type not allowed', 400);
      }

      // Check file size
      if (fileSize > MAX_FILE_SIZE) {
        throw new AppError('File size exceeds 25MB limit', 413);
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uploadPath = `${companyId}/${taskId}/${timestamp}-${sanitizedFileName}`;

      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour

      return {
        upload_path: uploadPath,
        expires_at: expiresAt,
        max_file_size: MAX_FILE_SIZE,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to generate upload token', { error, taskId, fileName });
      throw new AppError('Failed to generate upload token', 500);
    }
  }

  /**
   * Save task attachment metadata
   */
  static async saveAttachment(data: {
    task_id: string;
    project_id: string;
    file_name: string;
    file_path: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_by: string;
    company_id: string;
  }) {
    try {
      const { data: attachment, error } = await (db.from('task_attachments') as any)
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          uploader:users!task_attachments_uploaded_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        logger.error('Failed to save attachment', { error: error.message, data });
        throw new AppError(`Failed to save attachment: ${error.message}`, 500);
      }

      return attachment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Save attachment error', { error, data });
      throw new AppError('Failed to save attachment', 500);
    }
  }

  /**
   * Get attachments for a task
   */
  static async getTaskAttachments(taskId: string) {
    try {
      const { data, error } = await db
        .from('task_attachments')
        .select(`
          *,
          uploader:users!task_attachments_uploaded_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch attachments', { error: error.message, taskId });
        throw new AppError(`Failed to fetch attachments: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get attachments error', { error, taskId });
      throw new AppError('Failed to fetch attachments', 500);
    }
  }

  /**
   * Generate download URL for attachment
   */
  static async generateDownloadUrl(attachmentId: string, companyId: string) {
    try {
      const { data: attachment, error } = await db
        .from('task_attachments')
        .select('*')
        .eq('id', attachmentId)
        .eq('company_id', companyId)
        .single();

      if (error || !attachment) {
        throw new AppError('Attachment not found', 404);
      }

      // Extract file path
      const attachmentData = attachment as any;
      let filePath = '';
      if (attachmentData.file_path) {
        filePath = attachmentData.file_path;
      } else {
        throw new AppError('File path not found', 404);
      }

      // Generate signed URL (5 minutes)
      const expiresIn = 300;
      const { data, error: urlError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (urlError || !data) {
        logger.error('Failed to generate download URL', { error: urlError, filePath, attachmentId });
        throw new AppError('Failed to generate download URL', 500);
      }

      return {
        download_url: data.signedUrl,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Generate download URL error', { error, attachmentId });
      throw new AppError('Failed to generate download URL', 500);
    }
  }

  /**
   * Delete task attachment
   */
  static async deleteAttachment(attachmentId: string, userId: string, companyId: string) {
    try {
      const { data: attachment, error: fetchError } = await db
        .from('task_attachments')
        .select('*')
        .eq('id', attachmentId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !attachment) {
        throw new AppError('Attachment not found', 404);
      }

      // Check permissions
      const attachmentData = attachment as any;
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();

      const member = membership as any;
      const isAdmin = member?.role === 'admin';
      const isUploader = attachmentData.uploaded_by === userId;

      if (!isAdmin && !isUploader) {
        throw new AppError('You do not have permission to delete this attachment', 403);
      }

      // Delete file from storage
      const filePath = attachmentData.file_path;
      if (filePath) {
        const { error: storageError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .remove([filePath]);

        if (storageError) {
          logger.warn('Failed to delete file from storage', { error: storageError, filePath });
        }
      }

      // Delete attachment metadata
      const { error: deleteError } = await (db.from('task_attachments') as any)
        .delete()
        .eq('id', attachmentId);

      if (deleteError) {
        logger.error('Failed to delete attachment', { error: deleteError.message, attachmentId });
        throw new AppError('Failed to delete attachment', 500);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete attachment error', { error, attachmentId });
      throw new AppError('Failed to delete attachment', 500);
    }
  }
}

