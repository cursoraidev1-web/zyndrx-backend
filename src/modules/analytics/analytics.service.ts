import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class AnalyticsService {
  
  static async getProjectStats(projectId: string, companyId: string) {
    try {
      // Task statistics
      const { data: tasks } = await db
        .from('tasks')
        .select('status, priority, created_at, completed_at')
        .eq('project_id', projectId)
        .eq('company_id', companyId);

      const tasksArray = (tasks || []) as any[];
      const taskStats = {
        todo: tasksArray.filter((t: any) => t.status === 'todo').length || 0,
        in_progress: tasksArray.filter((t: any) => t.status === 'in_progress').length || 0,
        in_review: tasksArray.filter((t: any) => t.status === 'in_review').length || 0,
        completed: tasksArray.filter((t: any) => t.status === 'completed').length || 0,
        blocked: tasksArray.filter((t: any) => t.status === 'blocked').length || 0,
        total: tasksArray.length || 0
      };

      // PRD Count
      const { count: prdCount } = await db
        .from('prds')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Document Count
      const { count: docCount } = await db
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // KPI Cards
      const kpiCards = [
        {
          title: 'Total Tasks',
          value: taskStats.total,
          change: '+12%',
          trend: 'up'
        },
        {
          title: 'Completed',
          value: taskStats.completed,
          change: '+5%',
          trend: 'up'
        },
        {
          title: 'In Progress',
          value: taskStats.in_progress,
          change: '-2%',
          trend: 'down'
        },
        {
          title: 'PRDs',
          value: prdCount || 0,
          change: '+1',
          trend: 'up'
        }
      ];

      // Project Progress (completion percentage)
      const completionPercentage = taskStats.total > 0 
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : 0;

      const projectProgress = {
        completion: completionPercentage,
        tasksCompleted: taskStats.completed,
        tasksTotal: taskStats.total,
        milestones: [] // Can be enhanced later
      };

      // Team Performance (simplified)
      const { data: members } = await db
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      const teamPerformance = {
        totalMembers: (members || []).length,
        activeMembers: (members || []).length, // Can be enhanced with activity tracking
        tasksPerMember: members && members.length > 0 
          ? Math.round(taskStats.total / members.length)
          : 0
      };

      // Task Analytics
      const taskAnalytics = {
        byStatus: taskStats,
        byPriority: {
          low: tasksArray.filter((t: any) => t.priority === 'low').length || 0,
          medium: tasksArray.filter((t: any) => t.priority === 'medium').length || 0,
          high: tasksArray.filter((t: any) => t.priority === 'high').length || 0,
          urgent: tasksArray.filter((t: any) => t.priority === 'urgent').length || 0,
        },
        completionRate: completionPercentage
      };

      return {
        kpiCards,
        projectProgress,
        teamPerformance,
        taskAnalytics,
        documents: docCount || 0,
        prds: prdCount || 0
      };
    } catch (error) {
      logger.error('Get project stats error', { error, projectId });
      throw new AppError('Failed to fetch analytics', 500);
    }
  }

  static async getKPIs(projectId: string, companyId: string) {
    const stats = await this.getProjectStats(projectId, companyId);
    return stats.kpiCards;
  }

  static async getProjectProgress(projectId: string, companyId: string) {
    const stats = await this.getProjectStats(projectId, companyId);
    return stats.projectProgress;
  }

  static async getTeamPerformance(projectId: string, companyId: string) {
    const stats = await this.getProjectStats(projectId, companyId);
    return stats.teamPerformance;
  }

  static async getTaskAnalytics(projectId: string, companyId: string) {
    const stats = await this.getProjectStats(projectId, companyId);
    return stats.taskAnalytics;
  }
}