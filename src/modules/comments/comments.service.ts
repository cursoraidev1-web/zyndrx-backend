import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class CommentService {
  
  // Create comment
  static async createComment(data: {
    user_id: string;
    project_id: string;
    resource_type: string;
    resource_id: string;
    content: string;
    company_id: string;
    parent_id?: string;
  }) {
    try {
      // Verify project belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', data.project_id)
        .single();

      if (projectError || !project) {
        logger.error('Project not found', { projectId: data.project_id, error: projectError });
        throw new AppError('Project not found', 404);
      }

      const projectCompanyId = (project as any).company_id;
      if (projectCompanyId !== data.company_id) {
        throw new AppError('Project does not belong to your company', 403);
      }

      const { data: comment, error } = await (db.from('comments') as any)
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          users!comments_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .single();

      if (error) {
        logger.error('Failed to create comment', { error: error.message, data });
        throw new AppError(`Failed to create comment: ${error.message}`, 500);
      }

      return comment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create comment error', { error, data });
      throw new AppError('Failed to create comment', 500);
    }
  }

  // Get comments for a resource
  static async getComments(resourceType: string, resourceId: string, projectId: string, companyId: string) {
    try {
      // Verify project belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        logger.error('Project not found', { projectId, error: projectError });
        throw new AppError('Project not found', 404);
      }

      const projectCompanyId = (project as any).company_id;
      if (projectCompanyId !== companyId) {
        throw new AppError('Project does not belong to your company', 403);
      }

      const { data: comments, error } = await db
        .from('comments')
        .select(`
          *,
          users!comments_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch comments', { error: error.message, resourceType, resourceId });
        throw new AppError(`Failed to fetch comments: ${error.message}`, 500);
      }

      // Organize comments into threads (parent-child relationships)
      const commentsMap = new Map();
      const rootComments: any[] = [];

      (comments || []).forEach((comment: any) => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      (comments || []).forEach((comment: any) => {
        if (comment.parent_id) {
          const parent = commentsMap.get(comment.parent_id);
          if (parent) {
            parent.replies.push(commentsMap.get(comment.id));
          }
        } else {
          rootComments.push(commentsMap.get(comment.id));
        }
      });

      return rootComments;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get comments error', { error, resourceType, resourceId });
      throw new AppError('Failed to fetch comments', 500);
    }
  }

  // Update comment
  static async updateComment(commentId: string, userId: string, companyId: string, content: string) {
    try {
      // Verify comment belongs to user and company
      const { data: existing, error: fetchError } = await db
        .from('comments')
        .select('user_id, project_id')
        .eq('id', commentId)
        .single();

      if (fetchError || !existing) {
        throw new AppError('Comment not found', 404);
      }

      if ((existing as any).user_id !== userId) {
        throw new AppError('Unauthorized to update this comment', 403);
      }

      // Verify project belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', (existing as any).project_id)
        .single();

      if (projectError || !project || (project as any).company_id !== companyId) {
        throw new AppError('Comment not found or access denied', 404);
      }

      const { data: comment, error } = await (db.from('comments') as any)
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select(`
          *,
          users!comments_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .single();

      if (error) {
        logger.error('Failed to update comment', { error: error.message, commentId });
        throw new AppError(`Failed to update comment: ${error.message}`, 500);
      }

      return comment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update comment error', { error, commentId, userId });
      throw new AppError('Failed to update comment', 500);
    }
  }

  // Delete comment
  static async deleteComment(commentId: string, userId: string, companyId: string) {
    try {
      // Verify comment belongs to user and company
      const { data: existing, error: fetchError } = await db
        .from('comments')
        .select('user_id, project_id')
        .eq('id', commentId)
        .single();

      if (fetchError || !existing) {
        throw new AppError('Comment not found', 404);
      }

      if ((existing as any).user_id !== userId) {
        throw new AppError('Unauthorized to delete this comment', 403);
      }

      // Verify project belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', (existing as any).project_id)
        .single();

      if (projectError || !project || (project as any).company_id !== companyId) {
        throw new AppError('Comment not found or access denied', 404);
      }

      const { error } = await (db.from('comments') as any)
        .delete()
        .eq('id', commentId);

      if (error) {
        logger.error('Failed to delete comment', { error: error.message, commentId });
        throw new AppError(`Failed to delete comment: ${error.message}`, 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete comment error', { error, commentId, userId });
      throw new AppError('Failed to delete comment', 500);
    }
  }
}

