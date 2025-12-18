import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import {
  CreateTaskInput,
  UpdateTaskInput,
  BulkUpdateTasksInput,
  GetTasksQuery,
} from './tasks.validation';

export class TasksService {
  /**
   * Create a new task
   */
  async createTask(userId: string, data: CreateTaskInput) {
    try {
      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(data.projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      // If PRD is specified, check if it belongs to the project
      if (data.prdId) {
        const { data: prd } = await supabaseAdmin
          .from('prds')
          .select('project_id')
          .eq('id', data.prdId)
          .single();

        if (!prd || prd.project_id !== data.projectId) {
          throw new AppError('PRD not found or does not belong to this project', 400);
        }
      }

      // If assignedTo is specified, check if user is a project member
      if (data.assignedTo) {
        const isMember = await this.checkProjectAccess(data.projectId, data.assignedTo);
        if (!isMember) {
          throw new AppError('Cannot assign task to user who is not a project member', 400);
        }
      }

      // Get the next order_index
      const { data: lastTask } = await supabaseAdmin
        .from('tasks')
        .select('order_index')
        .eq('project_id', data.projectId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const orderIndex = lastTask ? lastTask.order_index + 1 : 0;

      // Create the task
      const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert({
          project_id: data.projectId,
          prd_id: data.prdId,
          title: data.title,
          description: data.description,
          status: 'todo',
          priority: data.priority,
          assigned_to: data.assignedTo,
          created_by: userId,
          due_date: data.dueDate,
          order_index: orderIndex,
        })
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url),
          assignee:users!assigned_to(id, email, full_name, avatar_url),
          project:projects(id, name),
          prd:prds(id, title)
        `
        )
        .single();

      if (taskError || !task) {
        logger.error('Failed to create task', { error: taskError });
        throw new AppError('Failed to create task', 500);
      }

      logger.info('Task created successfully', {
        taskId: task.id,
        projectId: data.projectId,
        userId,
      });

      return this.formatTask(task);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create task error', { error });
      throw new AppError('Failed to create task', 500);
    }
  }

  /**
   * Get tasks with filtering, sorting, and pagination
   */
  async getTasks(userId: string, query: GetTasksQuery) {
    try {
      let queryBuilder = supabaseAdmin
        .from('tasks')
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url),
          assignee:users!assigned_to(id, email, full_name, avatar_url),
          project:projects(id, name),
          prd:prds(id, title)
        `,
          { count: 'exact' }
        );

      // Filter by project if provided
      if (query.projectId) {
        const hasAccess = await this.checkProjectAccess(query.projectId, userId);
        if (!hasAccess) {
          throw new AppError('Project not found or access denied', 404);
        }
        queryBuilder = queryBuilder.eq('project_id', query.projectId);
      } else {
        // Get all tasks from projects user has access to
        const { data: userProjects } = await supabaseAdmin
          .from('projects')
          .select('id')
          .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`);

        if (!userProjects || userProjects.length === 0) {
          return {
            data: [],
            pagination: { total: 0, page: 1, limit: query.limit, totalPages: 0 },
          };
        }

        const projectIds = userProjects.map((p) => p.id);
        queryBuilder = queryBuilder.in('project_id', projectIds);
      }

      // Filter by PRD if provided
      if (query.prdId) {
        queryBuilder = queryBuilder.eq('prd_id', query.prdId);
      }

      // Filter by status if provided
      if (query.status) {
        queryBuilder = queryBuilder.eq('status', query.status);
      }

      // Filter by priority if provided
      if (query.priority) {
        queryBuilder = queryBuilder.eq('priority', query.priority);
      }

      // Filter by assignee if provided
      if (query.assignedTo) {
        queryBuilder = queryBuilder.eq('assigned_to', query.assignedTo);
      }

      // Search in title and description
      if (query.search) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query.search}%,description.ilike.%${query.search}%`
        );
      }

      // Sorting
      const sortBy = query.sortBy || 'order_index';
      const sortOrder = query.sortOrder || 'asc';
      queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder.range(offset, offset + query.limit - 1);

      const { data: tasks, error, count } = await queryBuilder;

      if (error) {
        logger.error('Failed to fetch tasks', { error });
        throw new AppError('Failed to fetch tasks', 500);
      }

      return {
        data: tasks?.map((task) => this.formatTask(task)) || [],
        pagination: {
          total: count || 0,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil((count || 0) / query.limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get tasks error', { error });
      throw new AppError('Failed to fetch tasks', 500);
    }
  }

  /**
   * Get single task by ID
   */
  async getTaskById(taskId: string, userId: string) {
    try {
      const { data: task, error } = await supabaseAdmin
        .from('tasks')
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url, role),
          assignee:users!assigned_to(id, email, full_name, avatar_url, role),
          project:projects(id, name, owner_id),
          prd:prds(id, title, version)
        `
        )
        .eq('id', taskId)
        .single();

      if (error || !task) {
        throw new AppError('Task not found', 404);
      }

      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(task.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      return this.formatTask(task);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get task by ID error', { error });
      throw new AppError('Failed to fetch task', 500);
    }
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, userId: string, data: UpdateTaskInput) {
    try {
      // Get existing task
      const { data: existingTask, error: fetchError } = await supabaseAdmin
        .from('tasks')
        .select('*, project:projects(owner_id)')
        .eq('id', taskId)
        .single();

      if (fetchError || !existingTask) {
        throw new AppError('Task not found', 404);
      }

      // Check if user has access
      const hasAccess = await this.checkProjectAccess(existingTask.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // If changing assignee, check if new assignee is a project member
      if (data.assignedTo !== undefined) {
        if (data.assignedTo !== null) {
          const isMember = await this.checkProjectAccess(
            existingTask.project_id,
            data.assignedTo
          );
          if (!isMember) {
            throw new AppError('Cannot assign task to user who is not a project member', 400);
          }
        }
      }

      // Auto-set completed_at when status changes to completed
      const updateData: any = {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigned_to: data.assignedTo,
        due_date: data.dueDate,
        order_index: data.orderIndex,
      };

      if (data.status === 'completed' && existingTask.status !== 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (data.status && data.status !== 'completed' && existingTask.completed_at) {
        updateData.completed_at = null;
      }

      // Update the task
      const { data: task, error } = await supabaseAdmin
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url),
          assignee:users!assigned_to(id, email, full_name, avatar_url),
          project:projects(id, name),
          prd:prds(id, title)
        `
        )
        .single();

      if (error || !task) {
        logger.error('Failed to update task', { error });
        throw new AppError('Failed to update task', 500);
      }

      logger.info('Task updated successfully', {
        taskId,
        userId,
      });

      return this.formatTask(task);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update task error', { error });
      throw new AppError('Failed to update task', 500);
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string, userId: string) {
    try {
      // Get existing task
      const { data: existingTask, error: fetchError } = await supabaseAdmin
        .from('tasks')
        .select('*, project:projects(owner_id)')
        .eq('id', taskId)
        .single();

      if (fetchError || !existingTask) {
        throw new AppError('Task not found', 404);
      }

      // Check if user is creator or project owner
      const isCreator = existingTask.created_by === userId;
      const isOwner = existingTask.project.owner_id === userId;

      if (!isCreator && !isOwner) {
        throw new AppError('Only the creator or project owner can delete this task', 403);
      }

      const { error } = await supabaseAdmin.from('tasks').delete().eq('id', taskId);

      if (error) {
        logger.error('Failed to delete task', { error });
        throw new AppError('Failed to delete task', 500);
      }

      logger.info('Task deleted successfully', { taskId, userId });

      return { message: 'Task deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete task error', { error });
      throw new AppError('Failed to delete task', 500);
    }
  }

  /**
   * Bulk update tasks (primarily for reordering)
   */
  async bulkUpdateTasks(userId: string, data: BulkUpdateTasksInput) {
    try {
      // Verify user has access to all tasks
      for (const taskUpdate of data.tasks) {
        const { data: task } = await supabaseAdmin
          .from('tasks')
          .select('project_id')
          .eq('id', taskUpdate.id)
          .single();

        if (!task) {
          throw new AppError(`Task ${taskUpdate.id} not found`, 404);
        }

        const hasAccess = await this.checkProjectAccess(task.project_id, userId);
        if (!hasAccess) {
          throw new AppError(`Access denied for task ${taskUpdate.id}`, 403);
        }
      }

      // Update all tasks
      const updates = data.tasks.map((taskUpdate) =>
        supabaseAdmin
          .from('tasks')
          .update({ order_index: taskUpdate.orderIndex })
          .eq('id', taskUpdate.id)
      );

      await Promise.all(updates);

      logger.info('Bulk task update completed', {
        taskCount: data.tasks.length,
        userId,
      });

      return { message: 'Tasks updated successfully', count: data.tasks.length };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Bulk update tasks error', { error });
      throw new AppError('Failed to bulk update tasks', 500);
    }
  }

  /**
   * Get task statistics for a project
   */
  async getTaskStats(projectId: string, userId: string) {
    try {
      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      // Get all tasks for the project
      const { data: tasks, error } = await supabaseAdmin
        .from('tasks')
        .select('status, priority')
        .eq('project_id', projectId);

      if (error) {
        logger.error('Failed to fetch task stats', { error });
        throw new AppError('Failed to fetch task statistics', 500);
      }

      // Calculate statistics
      const stats = {
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
          ? ((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100).toFixed(2)
          : '0.00',
      };

      return stats;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get task stats error', { error });
      throw new AppError('Failed to fetch task statistics', 500);
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Check if user has access to a project
   */
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

  /**
   * Format task for response
   */
  private formatTask(task: any) {
    return {
      id: task.id,
      projectId: task.project_id,
      project: task.project,
      prdId: task.prd_id,
      prd: task.prd,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      assignee: task.assignee,
      createdBy: task.created_by,
      creator: task.creator,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      orderIndex: task.order_index,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  }
}
