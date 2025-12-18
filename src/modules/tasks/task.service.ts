import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { TaskStatus, TaskPriority } from '../../types/database.types';
import logger from '../../utils/logger';

export interface CreateTaskData {
  projectId: string;
  prdId?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
  createdBy: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  prdId?: string;
  page?: number;
  limit?: number;
}

export class TaskService {
  async create(data: CreateTaskData) {
    try {
      // Verify project exists and user has access
      const { data: member } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', data.projectId)
        .eq('user_id', data.createdBy)
        .single();

      if (!member) {
        throw new AppError('Access denied to this project', 403);
      }

      // Verify PRD if provided
      if (data.prdId) {
        const { data: prd } = await supabaseAdmin
          .from('prds')
          .select('id')
          .eq('id', data.prdId)
          .eq('project_id', data.projectId)
          .single();

        if (!prd) {
          throw new AppError('PRD not found in this project', 404);
        }
      }

      // Verify assignee is project member if provided
      if (data.assignedTo) {
        const { data: assigneeMember } = await supabaseAdmin
          .from('project_members')
          .select('id')
          .eq('project_id', data.projectId)
          .eq('user_id', data.assignedTo)
          .single();

        if (!assigneeMember) {
          throw new AppError('Assigned user is not a project member', 400);
        }
      }

      const { data: task, error } = await supabaseAdmin
        .from('tasks')
        .insert({
          project_id: data.projectId,
          prd_id: data.prdId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          assigned_to: data.assignedTo,
          due_date: data.dueDate,
          created_by: data.createdBy,
        })
        .select(
          `
          *,
          assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url),
          creator:users!tasks_created_by_fkey(id, full_name, avatar_url)
        `
        )
        .single();

      if (error || !task) {
        logger.error('Failed to create task', { error });
        throw new AppError('Failed to create task', 500);
      }

      // Send notification to assignee
      if (data.assignedTo && data.assignedTo !== data.createdBy) {
        await supabaseAdmin.from('notifications').insert({
          user_id: data.assignedTo,
          type: 'task_assigned',
          title: 'New task assigned',
          message: `You have been assigned to: ${task.title}`,
          link: `/projects/${data.projectId}/tasks/${task.id}`,
        });
      }

      return this.formatTask(task);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Task creation error', { error });
      throw new AppError('Failed to create task', 500);
    }
  }

  async getById(taskId: string, userId: string) {
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .select(
        `
        *,
        project:projects(*),
        prd:prds(id, title),
        assignee:users!tasks_assigned_to_fkey(id, full_name, email, avatar_url),
        creator:users!tasks_created_by_fkey(id, full_name, avatar_url)
      `
      )
      .eq('id', taskId)
      .single();

    if (error || !task) {
      throw new AppError('Task not found', 404);
    }

    // Verify user has access to project
    await this.verifyProjectAccess(task.project_id, userId);

    return this.formatTask(task);
  }

  async getByProject(projectId: string, userId: string, filters?: TaskFilters) {
    // Verify user has access
    await this.verifyProjectAccess(projectId, userId);

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('tasks')
      .select(
        `
        *,
        assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url),
        creator:users!tasks_created_by_fkey(id, full_name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters?.prdId) {
      query = query.eq('prd_id', filters.prdId);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch tasks', { error });
      throw new AppError('Failed to fetch tasks', 500);
    }

    return {
      tasks: tasks?.map((task) => this.formatTask(task)) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async update(taskId: string, userId: string, data: UpdateTaskData) {
    // Get existing task
    const { data: existingTask, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('*, project:projects(owner_id)')
      .eq('id', taskId)
      .single();

    if (fetchError || !existingTask) {
      throw new AppError('Task not found', 404);
    }

    // Verify user has access
    await this.verifyProjectAccess(existingTask.project_id, userId);

    // Handle status change to completed
    const updateData: any = {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigned_to: data.assignedTo,
      due_date: data.dueDate,
    };

    if (data.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (data.status !== 'completed') {
      updateData.completed_at = null;
    }

    const { data: updatedTask, error } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(
        `
        *,
        assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url),
        creator:users!tasks_created_by_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error || !updatedTask) {
      logger.error('Failed to update task', { error });
      throw new AppError('Failed to update task', 500);
    }

    // Send notification on status change to completed
    if (data.status === 'completed' && existingTask.status !== 'completed') {
      await supabaseAdmin.from('notifications').insert({
        user_id: existingTask.created_by,
        type: 'task_completed',
        title: 'Task completed',
        message: `Task "${existingTask.title}" has been completed`,
        link: `/projects/${existingTask.project_id}/tasks/${taskId}`,
      });
    }

    // Send notification on assignment change
    if (data.assignedTo && data.assignedTo !== existingTask.assigned_to) {
      await supabaseAdmin.from('notifications').insert({
        user_id: data.assignedTo,
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: `You have been assigned to: ${updatedTask.title}`,
        link: `/projects/${existingTask.project_id}/tasks/${taskId}`,
      });
    }

    return this.formatTask(updatedTask);
  }

  async delete(taskId: string, userId: string) {
    const { data: task, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('project_id, created_by')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      throw new AppError('Task not found', 404);
    }

    // Verify user has access and is either creator or project owner
    await this.verifyProjectAccess(task.project_id, userId);

    // Only creator or project owner can delete
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', task.project_id)
      .single();

    if (task.created_by !== userId && project?.owner_id !== userId) {
      throw new AppError('Not authorized to delete this task', 403);
    }

    const { error } = await supabaseAdmin.from('tasks').delete().eq('id', taskId);

    if (error) {
      logger.error('Failed to delete task', { error });
      throw new AppError('Failed to delete task', 500);
    }

    return { message: 'Task deleted successfully' };
  }

  async getMyTasks(userId: string, filters?: { status?: TaskStatus; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('tasks')
      .select(
        `
        *,
        project:projects(id, name),
        creator:users!tasks_created_by_fkey(id, full_name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch user tasks', { error });
      throw new AppError('Failed to fetch tasks', 500);
    }

    return {
      tasks: tasks?.map((task) => this.formatTask(task)) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
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

  private formatTask(task: any) {
    return {
      id: task.id,
      projectId: task.project_id,
      prdId: task.prd_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      createdBy: task.created_by,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      orderIndex: task.order_index,
      assignee: task.assignee,
      creator: task.creator,
      project: task.project,
      prd: task.prd,
    };
  }
}
