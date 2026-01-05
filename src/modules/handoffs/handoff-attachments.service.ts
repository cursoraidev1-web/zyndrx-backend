import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { HandoffService } from './handoffs.service';

const db = supabaseAdmin as SupabaseClient<Database>;
const BUCKET_NAME = 'documents'; // Reuse documents bucket for handoff attachments

// Allowed file types for handoff attachments
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export class HandoffAttachmentService {
  
  /**
   * Generate upload token for handoff attachment
   */
  static async generateUploadToken(
    handoffId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    userId: string,
    companyId: string
  ) {
    try {
      // Verify handoff exists and user has access
      const handoff = await HandoffService.getHandoffById(handoffId, companyId);
      const handoffData = handoff as any;

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        throw new AppError('File type not allowed', 400);
      }

      // Validate file size
      if (fileSize > MAX_FILE_SIZE) {
        throw new AppError(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uploadPath = `handoffs/${handoffId}/${timestamp}-${sanitizedFileName}`;

      return {
        upload_path: uploadPath,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        max_file_size: MAX_FILE_SIZE,
        file_type: fileType
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Generate upload token error', { error, handoffId });
      throw new AppError('Failed to generate upload token', 500);
    }
  }

  /**
   * Save handoff attachment metadata after upload
   */
  static async saveAttachment(
    handoffId: string,
    metadata: {
      file_name: string;
      file_path: string;
      file_url: string;
      file_type: string;
      file_size: number;
    },
    userId: string,
    companyId: string
  ) {
    try {
      // Verify handoff exists
      const handoff = await HandoffService.getHandoffById(handoffId, companyId);
      const handoffData = handoff as any;

      const { data: attachment, error } = await (db.from('task_attachments') as any)
        .insert({
          task_id: null, // Not a task attachment
          project_id: handoffData.project_id,
          file_name: metadata.file_name,
          file_path: metadata.file_path,
          file_url: metadata.file_url,
          file_type: metadata.file_type,
          file_size: metadata.file_size,
          uploaded_by: userId,
          company_id: companyId,
          // Store handoff_id in a metadata field or create separate table
          // For now, we'll use file_path to identify handoff attachments
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to save handoff attachment', { error: error.message, handoffId, metadata });
        throw new AppError(`Failed to save handoff attachment: ${error.message}`, 500);
      }

      return attachment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Save handoff attachment error', { error, handoffId });
      throw new AppError('Failed to save handoff attachment', 500);
    }
  }

  /**
   * Get all attachments for a handoff
   */
  static async getHandoffAttachments(handoffId: string, companyId: string) {
    try {
      // Verify handoff exists
      await HandoffService.getHandoffById(handoffId, companyId);

      // Get attachments where file_path starts with handoffs/{handoffId}/
      const { data: attachments, error } = await db
        .from('task_attachments')
        .select(`
          *,
          uploader:users!task_attachments_uploaded_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .like('file_path', `handoffs/${handoffId}/%`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch handoff attachments', { error: error.message, handoffId });
        throw new AppError(`Failed to fetch handoff attachments: ${error.message}`, 500);
      }

      return attachments || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get handoff attachments error', { error, handoffId });
      throw new AppError('Failed to fetch handoff attachments', 500);
    }
  }
}



