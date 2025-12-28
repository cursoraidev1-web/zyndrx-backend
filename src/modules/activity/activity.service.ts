import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class ActivityService {
  
  /**
   * Get activity feed
   * Combines data from multiple sources: tasks, PRDs, comments, documents, handoffs
   */
  static async getActivityFeed(filters: {
    companyId: string;
    projectId?: string;
    userId?: string;
    type?: string;
    limit?: number;
  }) {
    try {
      const limit = filters.limit || 50;
      const activities: any[] = [];

      // Get task activities
      let taskQuery = db
        .from('tasks')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          created_by,
          assigned_to,
          project_id,
          creator:users!tasks_created_by_fkey (
            id,
            full_name,
            avatar_url
          ),
          assignee:users!tasks_assigned_to_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', filters.companyId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (filters.projectId) {
        taskQuery = taskQuery.eq('project_id', filters.projectId);
      }

      const { data: tasks } = await taskQuery;
      (tasks || []).forEach((task: any) => {
        activities.push({
          id: `task-${task.id}`,
          type: 'task',
          action: task.status === 'completed' ? 'completed' : task.assigned_to ? 'assigned' : 'created',
          resource_type: 'task',
          resource_id: task.id,
          title: task.title,
          user: task.creator || task.assignee,
          project_id: task.project_id,
          timestamp: task.updated_at || task.created_at,
          metadata: {
            status: task.status,
            assigned_to: task.assignee?.full_name
          }
        });
      });

      // Get PRD activities
      let prdQuery = db
        .from('prds')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          created_by,
          project_id,
          creator:users!prds_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', filters.companyId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (filters.projectId) {
        prdQuery = prdQuery.eq('project_id', filters.projectId);
      }

      const { data: prds } = await prdQuery;
      (prds || []).forEach((prd: any) => {
        activities.push({
          id: `prd-${prd.id}`,
          type: 'prd',
          action: prd.status === 'approved' ? 'approved' : prd.status === 'rejected' ? 'rejected' : 'created',
          resource_type: 'prd',
          resource_id: prd.id,
          title: prd.title,
          user: prd.creator,
          project_id: prd.project_id,
          timestamp: prd.updated_at || prd.created_at,
          metadata: {
            status: prd.status
          }
        });
      });

      // Get comment activities
      let commentQuery = db
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          project_id,
          resource_type,
          resource_id,
          user:users!comments_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters.projectId) {
        commentQuery = commentQuery.eq('project_id', filters.projectId);
      }

      const { data: comments } = await commentQuery;
      (comments || []).forEach((comment: any) => {
        activities.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          action: 'added',
          resource_type: comment.resource_type,
          resource_id: comment.resource_id,
          title: `Commented on ${comment.resource_type}`,
          user: comment.user,
          project_id: comment.project_id,
          timestamp: comment.created_at,
          metadata: {
            content: comment.content.substring(0, 100) // Preview
          }
        });
      });

      // Get document activities
      let docQuery = db
        .from('documents')
        .select(`
          id,
          title,
          created_at,
          uploaded_by,
          project_id,
          uploader:users!documents_uploaded_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', filters.companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters.projectId) {
        docQuery = docQuery.eq('project_id', filters.projectId);
      }

      const { data: documents } = await docQuery;
      (documents || []).forEach((doc: any) => {
        activities.push({
          id: `doc-${doc.id}`,
          type: 'file',
          action: 'uploaded',
          resource_type: 'document',
          resource_id: doc.id,
          title: doc.title,
          user: doc.uploader,
          project_id: doc.project_id,
          timestamp: doc.created_at
        });
      });

      // Get handoff activities
      let handoffQuery = db
        .from('handoffs')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          from_user_id,
          to_user_id,
          project_id,
          from_user:users!handoffs_from_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          to_user:users!handoffs_to_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', filters.companyId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (filters.projectId) {
        handoffQuery = handoffQuery.eq('project_id', filters.projectId);
      }

      const { data: handoffs } = await handoffQuery;
      (handoffs || []).forEach((handoff: any) => {
        activities.push({
          id: `handoff-${handoff.id}`,
          type: 'handoff',
          action: handoff.status === 'approved' ? 'approved' : handoff.status === 'rejected' ? 'rejected' : 'created',
          resource_type: 'handoff',
          resource_id: handoff.id,
          title: handoff.title,
          user: handoff.from_user,
          project_id: handoff.project_id,
          timestamp: handoff.updated_at || handoff.created_at,
          metadata: {
            status: handoff.status,
            to_user: handoff.to_user?.full_name
          }
        });
      });

      // Filter by type if specified
      let filteredActivities = activities;
      if (filters.type) {
        filteredActivities = activities.filter(a => a.type === filters.type);
      }

      // Filter by user if specified
      if (filters.userId) {
        filteredActivities = filteredActivities.filter(a => 
          a.user?.id === filters.userId
        );
      }

      // Sort by timestamp (most recent first)
      filteredActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Limit results
      return filteredActivities.slice(0, limit);
    } catch (error) {
      logger.error('Get activity feed error', { error, filters });
      throw new AppError('Failed to fetch activity feed', 500);
    }
  }
}

