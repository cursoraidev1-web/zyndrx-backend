import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

export class AnalyticsService {
  /**
   * Get project analytics/dashboard
   */
  async getProjectAnalytics(projectId: string, userId: string) {
    try {
      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      // Get project details
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('*, project_members(count)')
        .eq('id', projectId)
        .single();

      // Get tasks stats
      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select('status, priority, completed_at')
        .eq('project_id', projectId);

      // Get PRDs stats
      const { data: prds } = await supabaseAdmin
        .from('prds')
        .select('status')
        .eq('project_id', projectId);

      // Get documents count
      const { count: documentsCount } = await supabaseAdmin
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Calculate task statistics
      const taskStats = {
        total: tasks?.length || 0,
        byStatus: {
          todo: tasks?.filter((t) => t.status === 'todo').length || 0,
          in_progress: tasks?.filter((t) => t.status === 'in_progress').length || 0,
          in_review: tasks?.filter((t) => t.status === 'in_review').length || 0,
          completed: tasks?.filter((t) => t.status === 'completed').length || 0,
          blocked: tasks?.filter((t) => t.status === 'blocked').length || 0,
        },
        byPriority: {
          low: tasks?.filter((t) => t.priority === 'low').length || 0,
          medium: tasks?.filter((t) => t.priority === 'medium').length || 0,
          high: tasks?.filter((t) => t.priority === 'high').length || 0,
          urgent: tasks?.filter((t) => t.priority === 'urgent').length || 0,
        },
        completionRate: tasks?.length
          ? (
              (tasks.filter((t) => t.status === 'completed').length / tasks.length) *
              100
            ).toFixed(2)
          : '0.00',
      };

      // Calculate PRD statistics
      const prdStats = {
        total: prds?.length || 0,
        draft: prds?.filter((p) => p.status === 'draft').length || 0,
        in_review: prds?.filter((p) => p.status === 'in_review').length || 0,
        approved: prds?.filter((p) => p.status === 'approved').length || 0,
        rejected: prds?.filter((p) => p.status === 'rejected').length || 0,
      };

      return {
        project: {
          id: project?.id,
          name: project?.name,
          status: project?.status,
          memberCount: project?.project_members?.[0]?.count || 0,
        },
        tasks: taskStats,
        prds: prdStats,
        documents: {
          total: documentsCount || 0,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get project analytics error', { error });
      throw new AppError('Failed to fetch project analytics', 500);
    }
  }

  /**
   * Get user analytics/dashboard
   */
  async getUserAnalytics(userId: string) {
    try {
      // Get user's projects count
      const { count: projectsCount } = await supabaseAdmin
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`);

      // Get tasks assigned to user
      const { data: assignedTasks } = await supabaseAdmin
        .from('tasks')
        .select('status, priority, due_date')
        .eq('assigned_to', userId);

      // Get tasks created by user
      const { count: createdTasksCount } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);

      // Get PRDs created by user
      const { count: prdsCount } = await supabaseAdmin
        .from('prds')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);

      // Get unread notifications
      const { count: unreadNotificationsCount } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      // Calculate task statistics
      const taskStats = {
        assigned: assignedTasks?.length || 0,
        created: createdTasksCount || 0,
        byStatus: {
          todo: assignedTasks?.filter((t) => t.status === 'todo').length || 0,
          in_progress: assignedTasks?.filter((t) => t.status === 'in_progress').length || 0,
          in_review: assignedTasks?.filter((t) => t.status === 'in_review').length || 0,
          completed: assignedTasks?.filter((t) => t.status === 'completed').length || 0,
          blocked: assignedTasks?.filter((t) => t.status === 'blocked').length || 0,
        },
        overdue: assignedTasks?.filter(
          (t) =>
            t.due_date &&
            new Date(t.due_date) < new Date() &&
            t.status !== 'completed'
        ).length || 0,
      };

      return {
        projects: {
          total: projectsCount || 0,
        },
        tasks: taskStats,
        prds: {
          created: prdsCount || 0,
        },
        notifications: {
          unread: unreadNotificationsCount || 0,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get user analytics error', { error });
      throw new AppError('Failed to fetch user analytics', 500);
    }
  }

  // ============ HELPER METHODS ============

  private async checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) return false;
    if (project.owner_id === userId) return true;

    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return !!member;
  }
}
