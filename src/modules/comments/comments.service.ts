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
    parent_id?: string;
  }) {
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

    // Send comment creation email to resource owner
    try {
      const commentWithUser = comment as any;
      const commenter = commentWithUser.users;
      
      // Get resource owner based on resource type
      let resourceOwnerEmail: string | null = null;
      let resourceOwnerName: string | null = null;
      let resourceName: string = '';
      
      if (data.resource_type === 'task') {
        const { data: taskData } = await db.from('tasks').select('title, created_by').eq('id', data.resource_id).single();
        if (taskData && 'title' in taskData && 'created_by' in taskData) {
          resourceName = taskData.title as string;
          const { data: ownerData } = await db.from('users').select('email, full_name').eq('id', taskData.created_by as string).single();
          if (ownerData && 'email' in ownerData && 'full_name' in ownerData && ownerData.email !== commenter.email) {
            resourceOwnerEmail = ownerData.email as string;
            resourceOwnerName = ownerData.full_name as string;
          }
        }
      } else if (data.resource_type === 'prd') {
        const { data: prdData } = await db.from('prds').select('title, created_by').eq('id', data.resource_id).single();
        if (prdData && 'title' in prdData && 'created_by' in prdData) {
          resourceName = prdData.title as string;
          const { data: ownerData } = await db.from('users').select('email, full_name').eq('id', prdData.created_by as string).single();
          if (ownerData && 'email' in ownerData && 'full_name' in ownerData && ownerData.email !== commenter.email) {
            resourceOwnerEmail = ownerData.email as string;
            resourceOwnerName = ownerData.full_name as string;
          }
        }
      }

      if (resourceOwnerEmail && resourceOwnerName && commenter) {
        const { EmailService } = await import('../../utils/email.service');
        await EmailService.sendCommentCreatedEmail(
          resourceOwnerEmail,
          resourceOwnerName,
          commenter.full_name,
          data.resource_type,
          resourceName,
          data.resource_id
        );
      }
    } catch (emailError) {
      logger.error('Failed to send comment creation email', { error: emailError, commentId: comment.id });
      // Don't fail comment creation if email fails
    }

    return comment;
  }

  // Get comments for a resource
  static async getComments(resourceType: string, resourceId: string) {
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
  }

  // Update comment
  static async updateComment(commentId: string, userId: string, content: string) {
    // Verify comment belongs to user
    const { data: existing, error: fetchError } = await db
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !existing) {
      throw new AppError('Comment not found', 404);
    }

    if ((existing as any).user_id !== userId) {
      throw new AppError('Unauthorized to update this comment', 403);
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
  }

  // Delete comment
  static async deleteComment(commentId: string, userId: string) {
    // Verify comment belongs to user
    const { data: existing, error: fetchError } = await db
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !existing) {
      throw new AppError('Comment not found', 404);
    }

    if ((existing as any).user_id !== userId) {
      throw new AppError('Unauthorized to delete this comment', 403);
    }

    const { error } = await (db.from('comments') as any)
      .delete()
      .eq('id', commentId);

    if (error) {
      logger.error('Failed to delete comment', { error: error.message, commentId });
      throw new AppError(`Failed to delete comment: ${error.message}`, 500);
    }
  }
}

