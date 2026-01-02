import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { EmailService } from '../../utils/email.service';
import logger from '../../utils/logger';

const db = supabaseAdmin;

// Type guards for Supabase responses to prevent 'never' errors
interface UserRecord { email: string; full_name: string; }
interface ResourceRecord { title: string; created_by: string; }

export class CommentService {
  
  static async createComment(data: any, userId: string, companyId: string) {
    try {
      const { data: comment, error } = await (db.from('comments') as any)
        .insert({
          content: data.content,
          task_id: data.taskId || data.task_id || null,
          prd_id: data.prdId || data.prd_id || null,
          user_id: userId,
          company_id: companyId
        })
        .select('*, user:users(full_name, avatar_url)')
        .single();

      if (error) throw new AppError('Failed to create comment', 500);

      // Trigger notification (Fire and forget)
      this.sendCommentNotification(data, userId, companyId);

      return comment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create comment error', { error });
      throw new AppError('Failed to create comment', 500);
    }
  }

  static async getComments(resourceId: string, resourceType: 'task' | 'prd') {
    const column = resourceType === 'task' ? 'task_id' : 'prd_id';
    const { data, error } = await db
      .from('comments')
      .select('*, user:users(full_name, avatar_url)')
      .eq(column, resourceId)
      .order('created_at', { ascending: true });

    if (error) throw new AppError('Failed to fetch comments', 500);
    return data;
  }

  static async updateComment(commentId: string, userId: string, content: string, companyId: string) {
    const { data, error } = await (db.from('comments') as any)
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select('*, user:users(full_name, avatar_url)')
      .single();

    if (error || !data) throw new AppError('Failed to update comment or access denied', 500);
    return data;
  }

  static async deleteComment(commentId: string, userId: string, companyId: string) {
    const { error } = await db
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId)
        .eq('company_id', companyId);

    if (error) throw new AppError('Failed to delete comment', 500);
  }

  private static async sendCommentNotification(data: any, commenterId: string, companyId: string) {
    try {
      // 1. Fetch Commenter
      const { data: commenterData } = await db.from('users').select('email, full_name').eq('id', commenterId).single();
      const commenter = commenterData as unknown as UserRecord;
      if (!commenter) return;

      let resourceOwnerId: string | null = null;
      let resourceName = '';
      let resourceType = '';

      const taskId = data.taskId || data.task_id;
      const prdId = data.prdId || data.prd_id;

      // 2. Handle Task Comment
      if (taskId) {
        const { data: taskData } = await db.from('tasks').select('title, created_by').eq('id', taskId).single();
        const task = taskData as unknown as ResourceRecord;
        if (task) {
          resourceName = task.title;
          resourceOwnerId = task.created_by;
          resourceType = 'Task';
        }
      } 
      // 3. Handle PRD Comment
      else if (prdId) {
        const { data: prdData } = await db.from('prds').select('title, created_by').eq('id', prdId).single();
        const prd = prdData as unknown as ResourceRecord;
        if (prd) {
          resourceName = prd.title;
          resourceOwnerId = prd.created_by;
          resourceType = 'PRD';
        }
      }

      // 4. Send Email if owner exists and isn't the commenter
      if (resourceOwnerId && resourceOwnerId !== commenterId) {
        const { data: ownerData } = await db.from('users').select('email, full_name').eq('id', resourceOwnerId).single();
        const owner = ownerData as unknown as UserRecord;
        
        if (owner?.email) {
          await EmailService.sendNewCommentEmail(
            owner.email,
            owner.full_name,
            commenter.full_name,
            resourceName,
            resourceType,
            data.content
          );
        }
      }
    } catch (err) {
      logger.warn('Failed to send comment notification', err);
    }
  }
}