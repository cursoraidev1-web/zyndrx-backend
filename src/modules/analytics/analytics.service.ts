import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

export interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  completionRate: number;
  totalPRDs: number;
  approvedPRDs: number;
  pendingPRDs: number;
  totalMembers: number;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  recentActivity: any[];
}

export interface UserAnalytics {
  totalTasksAssigned: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number | null;
  tasksByProject: any[];
}

export class AnalyticsService {
  async getProjectAnalytics(projectId: string, userId: string) {
    // Verify access
    await this.verifyProjectAccess(projectId, userId);

    try {
      // Get task statistics
      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select('status, priority, created_at, completed_at')
        .eq('project_id', projectId);

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0;
      const inProgressTasks = tasks?.filter((t) => t.status === 'in_progress').length || 0;
      const blockedTasks = tasks?.filter((t) => t.status === 'blocked').length || 0;

      // Calculate completion rate
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Task distribution by priority
      const tasksByPriority = tasks?.reduce((acc: any, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {}) || {};

      // Task distribution by status
      const tasksByStatus = tasks?.reduce((acc: any, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get PRD statistics
      const { data: prds } = await supabaseAdmin
        .from('prds')
        .select('status')
        .eq('project_id', projectId);

      const totalPRDs = prds?.length || 0;
      const approvedPRDs = prds?.filter((p) => p.status === 'approved').length || 0;
      const pendingPRDs = prds?.filter((p) => p.status === 'in_review').length || 0;

      // Get member count
      const { count: totalMembers } = await supabaseAdmin
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get recent activity (last 10 audit logs)
      const { data: recentActivity } = await supabaseAdmin
        .from('audit_logs')
        .select(
          `
          *,
          user:users(full_name, avatar_url)
        `
        )
        .eq('resource_type', 'task')
        .or(`resource_type.eq.prd,resource_type.eq.project`)
        .order('created_at', { ascending: false })
        .limit(10);

      const analytics: ProjectAnalytics = {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        completionRate: Math.round(completionRate * 10) / 10,
        totalPRDs,
        approvedPRDs,
        pendingPRDs,
        totalMembers: totalMembers || 0,
        tasksByPriority,
        tasksByStatus,
        recentActivity: recentActivity || [],
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get project analytics', { error });
      throw new AppError('Failed to get project analytics', 500);
    }
  }

  async getUserAnalytics(userId: string) {
    try {
      // Get user's tasks
      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select(
          `
          *,
          project:projects(id, name)
        `
        )
        .eq('assigned_to', userId);

      const totalTasksAssigned = tasks?.length || 0;
      const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0;
      const inProgressTasks = tasks?.filter((t) => t.status === 'in_progress').length || 0;

      // Calculate overdue tasks
      const now = new Date();
      const overdueTasks =
        tasks?.filter((t) => {
          if (!t.due_date || t.status === 'completed') return false;
          return new Date(t.due_date) < now;
        }).length || 0;

      // Calculate completion rate
      const completionRate = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;

      // Calculate average completion time (in days)
      const completedTasksWithTime = tasks?.filter(
        (t) => t.status === 'completed' && t.completed_at && t.created_at
      );
      let averageCompletionTime = null;
      if (completedTasksWithTime && completedTasksWithTime.length > 0) {
        const totalTime = completedTasksWithTime.reduce((sum, task) => {
          const created = new Date(task.created_at).getTime();
          const completed = new Date(task.completed_at).getTime();
          return sum + (completed - created);
        }, 0);
        averageCompletionTime = totalTime / completedTasksWithTime.length / (1000 * 60 * 60 * 24); // Convert to days
      }

      // Tasks grouped by project
      const tasksByProject = tasks?.reduce((acc: any[], task) => {
        const existing = acc.find((p) => p.projectId === task.project.id);
        if (existing) {
          existing.total++;
          if (task.status === 'completed') existing.completed++;
        } else {
          acc.push({
            projectId: task.project.id,
            projectName: task.project.name,
            total: 1,
            completed: task.status === 'completed' ? 1 : 0,
          });
        }
        return acc;
      }, []) || [];

      const analytics: UserAnalytics = {
        totalTasksAssigned,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: Math.round(completionRate * 10) / 10,
        averageCompletionTime: averageCompletionTime ? Math.round(averageCompletionTime * 10) / 10 : null,
        tasksByProject,
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get user analytics', { error });
      throw new AppError('Failed to get user analytics', 500);
    }
  }

  async getTaskVelocity(projectId: string, userId: string, days = 30) {
    await this.verifyProjectAccess(projectId, userId);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select('completed_at, created_at')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString());

      // Group by week
      const velocity: Record<string, number> = {};
      tasks?.forEach((task) => {
        if (!task.completed_at) return;
        const date = new Date(task.completed_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        velocity[weekKey] = (velocity[weekKey] || 0) + 1;
      });

      return {
        period: `${days} days`,
        totalCompleted: tasks?.length || 0,
        velocityByWeek: velocity,
        averagePerWeek: tasks ? Math.round((tasks.length / days) * 7 * 10) / 10 : 0,
      };
    } catch (error) {
      logger.error('Failed to get task velocity', { error });
      throw new AppError('Failed to get task velocity', 500);
    }
  }

  async getTeamPerformance(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    try {
      const { data: members } = await supabaseAdmin
        .from('project_members')
        .select(
          `
          user_id,
          user:users(id, full_name, avatar_url, role)
        `
        )
        .eq('project_id', projectId);

      if (!members) return [];

      const performance = await Promise.all(
        members.map(async (member: any) => {
          const { data: tasks } = await supabaseAdmin
            .from('tasks')
            .select('status, completed_at, created_at')
            .eq('project_id', projectId)
            .eq('assigned_to', member.user_id);

          const total = tasks?.length || 0;
          const completed = tasks?.filter((t) => t.status === 'completed').length || 0;
          const inProgress = tasks?.filter((t) => t.status === 'in_progress').length || 0;

          return {
            userId: member.user_id,
            fullName: member.user.full_name,
            avatarUrl: member.user.avatar_url,
            role: member.user.role,
            totalTasks: total,
            completedTasks: completed,
            inProgressTasks: inProgress,
            completionRate: total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0,
          };
        })
      );

      return performance.sort((a, b) => b.completedTasks - a.completedTasks);
    } catch (error) {
      logger.error('Failed to get team performance', { error });
      throw new AppError('Failed to get team performance', 500);
    }
  }

  private async verifyProjectAccess(projectId: string, userId: string) {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();

      if (!project || project.owner_id !== userId) {
        throw new AppError('Access denied to this project', 403);
      }
    }
  }
}
