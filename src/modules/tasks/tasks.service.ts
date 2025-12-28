import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class TaskService {
  
  static async getTasksByProject(projectId: string) {
    try {
      const { data, error } = await db
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url),
          reporter:users!tasks_created_by_fkey(full_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch tasks', { error, projectId });
        throw new AppError(`Failed to fetch tasks: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get tasks by project error', { error, projectId });
      throw new AppError('Failed to fetch tasks', 500);
    }
  }

  static async createTask(data: any, userId: string, companyId: string) {
    try {
      // Verify project exists and belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', data.project_id)
        .single();

      if (projectError || !project) {
        logger.error('Project not found', { projectId: data.project_id, error: projectError });
        throw new AppError('Project not found', 404);
      }

      // Ensure company_id matches
      const projectCompanyId = (project as any).company_id;
      if (projectCompanyId !== companyId) {
        throw new AppError('Project does not belong to your company', 403);
      }

      // Check plan limits
      const limitCheck = await SubscriptionService.checkLimit(companyId, 'task');
      if (!limitCheck.allowed) {
        throw new AppError(limitCheck.message || 'Plan limit reached', 403);
      }

      // Insert task with company_id
      const { data: task, error } = await (db.from('tasks') as any)
        .insert({
          ...data,
          created_by: userId,
          company_id: companyId, // Ensure company_id is set
          status: 'todo'
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create task', { error, data, userId, companyId });
        throw new AppError(`Failed to create task: ${error.message}`, 500);
      }

      if (!task) {
        throw new AppError('Failed to create task', 500);
      }

      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create task error', { error, data, userId, companyId });
      throw new AppError('Failed to create task', 500);
    }
  }

  static async updateTask(taskId: string, updates: any) {
    try {
      const { data: task, error } = await (db.from('tasks') as any)
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Task not found', 404);
        }
        logger.error('Failed to update task', { error, taskId, updates });
        throw new AppError(`Failed to update task: ${error.message}`, 500);
      }

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update task error', { error, taskId, updates });
      throw new AppError('Failed to update task', 500);
    }
  }
}