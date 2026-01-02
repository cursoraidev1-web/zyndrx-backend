import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
// import { SubscriptionService } from '../subscriptions/subscriptions.service'; // disabled for dev
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class TaskService {
  
  /**
   * Get tasks by project with company context validation
   */
  static async getTasksByProject(projectId: string, companyId: string, userId?: string) {
    try {
      // 1. Verify project exists and belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('id, company_id, owner_id')
        .eq('id', projectId)
        .eq('company_id', companyId)
        .single();

      if (projectError || !project) {
        logger.error('Project not found or access denied', { projectId, companyId, error: projectError });
        throw new AppError('Project not found or access denied', 404);
      }

      // 2. Verify user has access to project
      if (userId) {
        const projectObj = project as any;
        const isOwner = projectObj.owner_id === userId;
        
        if (!isOwner) {
          const { data: member } = await db
            .from('project_members')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .single();

          if (!member) {
            logger.warn('User attempted to access project without membership', { projectId, userId, companyId });
            throw new AppError('You do not have access to this project', 403);
          }
        }
      }

      // 3. Get tasks
      const { data: tasks, error } = await db
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch tasks', { error, projectId, companyId });
        throw new AppError('Failed to fetch tasks', 500);
      }

      if (!tasks || tasks.length === 0) {
        return [];
      }

      // 4. Enrich with User Data
      const userIds = new Set<string>();
      tasks.forEach((task: any) => {
        if (task.assigned_to) userIds.add(task.assigned_to);
        if (task.created_by) userIds.add(task.created_by);
      });

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

  /**
   * Create Task (Fixed Logic)
   */
  static async createTask(data: any, userId: string, companyId: string) {
    try {
      // 1. Verify project exists
      // Note: Check if input uses 'projectId' (camelCase) or 'project_id' (snake_case)
      const targetProjectId = data.projectId || data.project_id;

      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', targetProjectId)
        .single();

      if (projectError || !project) {
        logger.error('Project not found', { projectId: targetProjectId, error: projectError });
        throw new AppError('Project not found', 404);
      }

      if ((project as any).company_id !== companyId) {
        throw new AppError('Project does not belong to your company', 403);
      }

      /* // 2. Limit Check (DISABLED FOR DEV)
      try {
        const limitCheck = await SubscriptionService.checkLimit(companyId, 'task');
        if (!limitCheck.allowed) throw new AppError(limitCheck.message, 403);
      } catch (err) { ... }
      */

      // 3. Prepare Data for Insert
      // We map the frontend camelCase fields to database snake_case columns
      const taskData: any = {
        title: data.title,
        description: data.description || null,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        
        // Date Fields
        start_date: data.startDate || null,
        due_date: data.dueDate || null,

        // ID Fields
        project_id: targetProjectId,
        company_id: companyId,
        created_by: userId,

        // Assignee Mapping (Frontend usually sends assigneeId)
        assigned_to: data.assigneeId || data.assigned_to || null,
        
        tags: data.tags || [],
      };

      // Optional PRD link
      if (data.prd_id) {
        taskData.prd_id = data.prd_id;
      }

      // 4. Perform Insert
      const { data: task, error } = await (db.from('tasks') as any)
        .insert(taskData)
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to create task', { error, data, userId, companyId });
        throw new AppError(`Failed to create task: ${error.message}`, 500);
      }

      // Send task creation email to assignee if assigned
      if (task && task.assigned_to) {
        try {
          const { data: assigneeData } = await db.from('users').select('email, full_name').eq('id', task.assigned_to).single();
          const { data: creatorData } = await db.from('users').select('full_name').eq('id', userId).single();
          const { data: projectData } = await db.from('projects').select('name').eq('id', task.project_id).single();
          
          const assignee = assigneeData as any;
          const creator = creatorData as any;
          const project = projectData as any;
          if (assignee && assignee.email && assignee.full_name && creator && creator.full_name && project && project.name) {
            const { EmailService } = await import('../../utils/email.service');
            await EmailService.sendTaskCreatedEmail(
              assignee.email as string,
              assignee.full_name as string,
              task.title,
              task.id,
              project.name as string,
              creator.full_name as string
            );
          }
        } catch (emailError) {
          logger.error('Failed to send task creation email', { error: emailError, taskId: task?.id });
          // Don't fail task creation if email fails
        }
      }

      return task;

    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create task error', { error, data, userId, companyId });
      throw new AppError('Failed to create task', 500);
    }
  }

  /**
   * Update Task
   */
  static async updateTask(taskId: string, updates: any, companyId: string) {
    try {
      // Optimistic locking + IDOR check in one query
      const { data: task, error } = await (db.from('tasks') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('company_id', companyId)
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Task not found or access denied', 404);
        }
        logger.error('Failed to update task', { error, taskId, companyId });
        throw new AppError('Failed to update task', 500);
      }

      if (!task) {
        throw new AppError('Task not found or access denied', 404);
      }

      // Enrich Assignee
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
      logger.error('Update task error', { error, taskId });
      throw new AppError('Failed to update task', 500);
    }
  }

  /**
   * Get Task By ID
   */
  static async getTaskById(taskId: string, companyId: string) {
    try {
      const { data: task, error } = await db
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('company_id', companyId)
        .single();

      if (error || !task) {
        throw new AppError('Task not found or access denied', 404);
      }

      // Enrich Data
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

  /**
   * Delete Task
   */
  static async deleteTask(taskId: string, companyId: string) {
    try {
      const { error } = await (db.from('tasks') as any)
        .delete()
        .eq('id', taskId)
        .eq('company_id', companyId);

      if (error) {
        logger.error('Failed to delete task', { error: error.message, taskId, companyId });
        throw new AppError('Failed to delete task', 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete task error', { error, taskId, companyId });
      throw new AppError('Failed to delete task', 500);
    }
  }

  /**
   * Get All Tasks (Company Scope)
   */
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
        logger.error('Failed to fetch tasks', { error: error.message, companyId });
        throw new AppError('Failed to fetch tasks', 500);
      }

      // Enrich Data
      const userIds = new Set<string>();
      const tasksArray: any[] = (tasks || []) as any[];
      tasksArray.forEach((task: any) => {
        if (task.assigned_to) userIds.add(task.assigned_to);
        if (task.created_by) userIds.add(task.created_by);
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
      logger.error('Get all tasks error', { error, companyId });
      throw new AppError('Failed to fetch tasks', 500);
    }
  }
}