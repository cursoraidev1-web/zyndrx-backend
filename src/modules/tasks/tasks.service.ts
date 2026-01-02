import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { EmailService } from '../../utils/email.service';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

// Local interfaces to satisfy the compiler and ensure type safety
interface UserRecord { email: string; full_name: string; }
interface ProjectRecord { name: string; company_id: string; }

export class TaskService {
  static async getTasksByProject(projectId: string, companyId: string, userId?: string) {
    try {
      const { data: tasksData, error } = await db
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
  
      if (error) throw new AppError('Failed to fetch tasks', 500);
      
      // ✅ FIX: Force cast to any[] to kill the 'never' errors
      const tasks = (tasksData || []) as any[];
  
      const userIds = Array.from(new Set(tasks.flatMap(t => [t.assigned_to, t.created_by].filter(Boolean) as string[])));
  
      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: users } = await db
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
  
        if (users) {
          users.forEach((user: any) => { usersMap[user.id] = user; });
        }
      }
  
      return tasks.map(task => ({
        ...task,
        assignee: task.assigned_to ? usersMap[task.assigned_to] || null : null,
        reporter: task.created_by ? usersMap[task.created_by] || null : null,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get tasks error', { error, projectId });
      throw new AppError('Failed to fetch tasks', 500);
    }
  }

  static async createTask(data: any, userId: string, companyId: string) {
    try {
      const targetProjectId = data.projectId || data.project_id;
      
      // Explicitly type the project fetch
      const { data: projectData } = await db
        .from('projects')
        .select('name, company_id')
        .eq('id', targetProjectId)
        .single();

      const project = projectData as unknown as ProjectRecord;

      if (!project || project.company_id !== companyId) {
        throw new AppError('Project not found or access denied', 404);
      }

      const taskPayload = {
        title: data.title,
        description: data.description || null,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        project_id: targetProjectId,
        company_id: companyId,
        created_by: userId,
        assigned_to: data.assigneeId || data.assigned_to || null,
        due_date: data.dueDate || null,
        prd_id: data.prd_id || null,
        tags: data.tags || [],
      };

      const { data: task, error } = await (db.from('tasks') as any)
        .insert(taskPayload)
        .select('*')
        .single();

      if (error) throw new AppError(`Failed to create task: ${error.message}`, 500);

      // Trigger email if assigned to someone else
      if (task.assigned_to && task.assigned_to !== userId) {
        // We don't await this to keep the API response fast (Fire and forget)
        this.sendAssignmentEmail(task.assigned_to, task, project.name, userId);
      }

      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create task error', { error });
      throw new AppError('Failed to create task', 500);
    }
  }

  private static async sendAssignmentEmail(assigneeId: string, task: any, projectName: string, creatorId: string) {
    try {
      const [{ data: assigneeData }, { data: creatorData }] = await Promise.all([
        db.from('users').select('email, full_name').eq('id', assigneeId).single(),
        db.from('users').select('full_name').eq('id', creatorId).single()
      ]);

      const assignee = assigneeData as unknown as UserRecord;
      const creator = creatorData as unknown as Partial<UserRecord>;

      if (assignee?.email) {
        await EmailService.sendTaskAssignedEmail(
          assignee.email,
          assignee.full_name,
          task.title,
          projectName || 'Project',
          creator?.full_name || 'A team member',
          task.id
        );
      }
    } catch (err) {
      logger.warn('Failed to send assignment email notification', err);
    }
  }


  static async updateTask(taskId: string, updates: any, companyId: string) {
    try {
      const { data: task, error } = await (db.from('tasks') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('company_id', companyId)
        .select('*')
        .single();

      if (error || !task) throw new AppError('Task not found or access denied', 404);

      if (task.assigned_to) {
        const { data: assignee } = await db.from('users').select('id, full_name, avatar_url').eq('id', task.assigned_to).single();
        return { ...task, assignee: assignee || null };
      }
      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update task', 500);
    }
  }

  static async getTaskById(taskId: string, companyId: string) {
    try {
      const { data: task, error } = await db.from('tasks').select('*').eq('id', taskId).eq('company_id', companyId).single();
      if (error || !task) throw new AppError('Task not found', 404);
      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch task', 500);
    }
  }

  static async deleteTask(taskId: string, companyId: string) {
    const { error } = await db.from('tasks').delete().eq('id', taskId).eq('company_id', companyId);
    if (error) throw new AppError('Failed to delete task', 500);
  }

  static async getAllTasks(companyId: string, userId?: string) {
    let query = db.from('tasks').select('*').eq('company_id', companyId);
    if (userId) query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
    const { data: tasks, error } = await query.order('created_at', { ascending: false });
    if (error) throw new AppError('Failed to fetch tasks', 500);
    return tasks || [];
  }

  // private static async sendAssignmentEmail(assigneeId: string, task: any, projectName: string, creatorId: string) {
  //   try {
  //     const { data: assigneeFetch } = await db.from('users').select('email, full_name').eq('id', assigneeId).single();
  //     const { data: creatorFetch } = await db.from('users').select('full_name').eq('id', creatorId).single();

  //     const assignee = assigneeFetch as any;
  //     const creator = creatorFetch as any;

  //     if (assignee && assignee.email) {
  //       await EmailService.sendTaskAssignedEmail(
  //         assignee.email,
  //         assignee.full_name,
  //         task.title,
  //         projectName || 'Project',
  //         creator?.full_name || 'A team member',
  //         task.id
  //       );
  //     }
  //   } catch (err) {
  //     logger.warn('Failed to send assignment email', err);
  //   }
  // }
}