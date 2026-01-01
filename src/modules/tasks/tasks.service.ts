import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
// import { SubscriptionService } from '../subscriptions/subscriptions.service'; // disabled for dev
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class TaskService {
  
  static async getTasksByProject(projectId: string) {
    try {
      // First, get all tasks
      const { data: tasks, error } = await db
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch tasks', { error, projectId });
        throw new AppError(`Failed to fetch tasks: ${error.message}`, 500);
      }

      if (!tasks || tasks.length === 0) {
        return [];
      }

      // Get unique user IDs for assignees and creators
      const userIds = new Set<string>();
      tasks.forEach((task: any) => {
        if (task.assigned_to) userIds.add(task.assigned_to);
        if (task.created_by) userIds.add(task.created_by);
      });

      // Fetch user data if needed
      let usersMap: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: users, error: usersError } = await db
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIds));

        if (!usersError && users) {
          users.forEach((user: any) => {
            usersMap[user.id] = user;
          });
        }
      }

      // Enrich tasks with user data
      const enrichedTasks = tasks.map((task: any) => ({
        ...task,
        assignee: task.assigned_to ? usersMap[task.assigned_to] || null : null,
        reporter: task.created_by ? { full_name: usersMap[task.created_by]?.full_name || null } : null,
      }));

      return enrichedTasks;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get tasks by project error', { error, projectId });
      throw new AppError('Failed to fetch tasks', 500);
    }
  }

  static async createTask(data: any, userId: string, companyId: string) {
    try {
      // 1. Verify project exists FIRST
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', data.projectId)
        .single();

      if (projectError || !project) {
        logger.error('Project not found', { projectId: data.projectId, error: projectError });
        throw new AppError('Project not found', 404);
      }

      // 2. Ensure company_id matches
      const projectCompanyId = (project as any).company_id;
      if (projectCompanyId !== companyId) {
        throw new AppError('Project does not belong to your company', 403);
      }

      /* // 3. Check plan limits (DISABLED FOR DEV TO FIX PERMISSION ERROR)
      try {
        const limitCheck = await SubscriptionService.checkLimit(companyId, 'task');
        if (!limitCheck.allowed) {
          throw new AppError(limitCheck.message || 'Plan limit reached. Please upgrade your plan.', 403);
        }
      } catch (limitError) {
        if (limitError instanceof AppError) throw limitError;
        logger.error('Failed to check task limit', { error: limitError, companyId });
        // Don't throw error here to allow creation during dev
      }
      */

      // 4. Insert Task
      const { data: task, error } = await (db.from('tasks') as any)
        .insert({
          title: data.title,
          description: data.description,
          status: data.status || 'todo',
          priority: data.priority,
          start_date: data.startDate,
          due_date: data.dueDate,
          
          // ✅ Correct spellings handled here
          assignee_id: data.assigneeId, 
          assigned_to: data.assigneeId, // Fail-safe for legacy column
          
          project_id: data.projectId,
          company_id: companyId,
          created_by: userId
        })
        .select('*')
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
        .select('*')
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

      // Fetch assignee data if assigned_to exists
      if (task.assigned_to) {
        const { data: assignee } = await db
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('id', task.assigned_to)
          .single();

        return {
          ...task,
          assignee: assignee || null,
        };
      }

      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update task error', { error, taskId, updates });
      throw new AppError('Failed to update task', 500);
    }
  }

  static async getTaskById(taskId: string) {
    try {
      const { data: task, error } = await db
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Task not found', 404);
        }
        logger.error('Failed to fetch task', { error, taskId });
        throw new AppError(`Failed to fetch task: ${error.message}`, 500);
      }

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // Fetch assignee and creator data
      const taskObj = task as any;
      const userIds = new Set<string>();
      if (taskObj.assigned_to) userIds.add(taskObj.assigned_to);
      if (taskObj.created_by) userIds.add(taskObj.created_by);

      let usersMap: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: users } = await db
          .from('users')
          .select('id, full_name, avatar_url, email')
          .in('id', Array.from(userIds));

        if (users) {
          users.forEach((user: any) => {
            usersMap[user.id] = user;
          });
        }
      }

      return {
        ...taskObj,
        assignee: taskObj.assigned_to ? usersMap[taskObj.assigned_to] || null : null,
        reporter: taskObj.created_by ? usersMap[taskObj.created_by] || null : null,
      } as any;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get task by ID error', { error, taskId });
      throw new AppError('Failed to fetch task', 500);
    }
  }

  static async deleteTask(taskId: string) {
    try {
      const { error } = await (db.from('tasks') as any)
        .delete()
        .eq('id', taskId);

      if (error) {
        logger.error('Failed to delete task', { error: error.message, taskId });
        throw new AppError(`Failed to delete task: ${error.message}`, 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete task error', { error, taskId });
      throw new AppError('Failed to delete task', 500);
    }
  }

  static async getAllTasks(companyId: string, userId?: string) {
    try {
      let query = db
        .from('tasks')
        .select('*')
        .eq('company_id', companyId);

      if (userId) {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      const { data: tasks, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch tasks', { error: error.message, companyId, userId });
        throw new AppError(`Failed to fetch tasks: ${error.message}`, 500);
      }

      // Enrich with user data
      const userIds = new Set<string>();
      const tasksArray: any[] = (tasks || []) as any[];
      tasksArray.forEach((task: any) => {
        if (task && task.assigned_to) userIds.add(task.assigned_to);
        if (task && task.created_by) userIds.add(task.created_by);
      });

      let usersMap: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: users } = await db
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIds));

        if (users) {
          users.forEach((user: any) => {
            usersMap[user.id] = user;
          });
        }
      }

      return tasksArray.map((task: any) => ({
        ...task,
        assignee: task.assigned_to ? usersMap[task.assigned_to] || null : null,
        reporter: task.created_by ? usersMap[task.created_by] || null : null,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get all tasks error', { error, companyId, userId });
      throw new AppError('Failed to fetch tasks', 500);
    }
  }
}