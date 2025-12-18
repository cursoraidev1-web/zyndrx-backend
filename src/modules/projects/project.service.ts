import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { UserRole } from '../../types/database.types';
import logger from '../../utils/logger';

export interface CreateProjectData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  ownerId: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export class ProjectService {
  async create(data: CreateProjectData) {
    try {
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .insert({
          name: data.name,
          description: data.description,
          owner_id: data.ownerId,
          start_date: data.startDate,
          end_date: data.endDate,
        })
        .select('*')
        .single();

      if (error || !project) {
        logger.error('Failed to create project', { error });
        throw new AppError('Failed to create project', 500);
      }

      // Add owner as project member
      await supabaseAdmin.from('project_members').insert({
        project_id: project.id,
        user_id: data.ownerId,
        role: 'admin',
      });

      return this.formatProject(project);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Project creation error', { error });
      throw new AppError('Failed to create project', 500);
    }
  }

  async getById(projectId: string, userId: string) {
    // Verify user has access
    await this.verifyAccess(projectId, userId);

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select(
        `
        *,
        owner:users!projects_owner_id_fkey(id, full_name, email, avatar_url),
        members:project_members(
          id,
          role,
          joined_at,
          user:users(id, full_name, email, avatar_url, role)
        )
      `
      )
      .eq('id', projectId)
      .single();

    if (error || !project) {
      throw new AppError('Project not found', 404);
    }

    return this.formatProject(project);
  }

  async getAll(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // Get projects where user is owner or member
    const { data: projects, error, count } = await supabaseAdmin
      .from('projects')
      .select(
        `
        *,
        owner:users!projects_owner_id_fkey(id, full_name, avatar_url),
        members:project_members(count)
      `,
        { count: 'exact' }
      )
      .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch projects', { error });
      throw new AppError('Failed to fetch projects', 500);
    }

    return {
      projects: projects?.map((p) => this.formatProject(p)) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async update(projectId: string, userId: string, data: UpdateProjectData) {
    // Only owner can update project
    await this.verifyOwnership(projectId, userId);

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .update({
        name: data.name,
        description: data.description,
        status: data.status,
        start_date: data.startDate,
        end_date: data.endDate,
      })
      .eq('id', projectId)
      .select('*')
      .single();

    if (error || !project) {
      logger.error('Failed to update project', { error });
      throw new AppError('Failed to update project', 500);
    }

    return this.formatProject(project);
  }

  async delete(projectId: string, userId: string) {
    // Only owner can delete project
    await this.verifyOwnership(projectId, userId);

    const { error } = await supabaseAdmin.from('projects').delete().eq('id', projectId);

    if (error) {
      logger.error('Failed to delete project', { error });
      throw new AppError('Failed to delete project', 500);
    }

    return { message: 'Project deleted successfully' };
  }

  async addMember(projectId: string, userId: string, newMemberId: string, role: UserRole) {
    // Only owner or admin can add members
    await this.verifyOwnership(projectId, userId);

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', newMemberId)
      .single();

    if (userError || !user) {
      throw new AppError('User not found', 404);
    }

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', newMemberId)
      .single();

    if (existingMember) {
      throw new AppError('User is already a project member', 409);
    }

    const { data: member, error } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: newMemberId,
        role,
      })
      .select(
        `
        *,
        user:users(id, full_name, email, avatar_url, role)
      `
      )
      .single();

    if (error || !member) {
      logger.error('Failed to add project member', { error });
      throw new AppError('Failed to add project member', 500);
    }

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: newMemberId,
      type: 'task_assigned',
      title: 'Added to project',
      message: `You have been added to the project`,
      link: `/projects/${projectId}`,
    });

    return member;
  }

  async removeMember(projectId: string, userId: string, memberId: string) {
    // Only owner can remove members
    await this.verifyOwnership(projectId, userId);

    // Cannot remove project owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (project?.owner_id === memberId) {
      throw new AppError('Cannot remove project owner', 400);
    }

    const { error } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId);

    if (error) {
      logger.error('Failed to remove project member', { error });
      throw new AppError('Failed to remove project member', 500);
    }

    return { message: 'Member removed successfully' };
  }

  async getMembers(projectId: string, userId: string) {
    // Verify user has access
    await this.verifyAccess(projectId, userId);

    const { data: members, error } = await supabaseAdmin
      .from('project_members')
      .select(
        `
        *,
        user:users(id, full_name, email, avatar_url, role)
      `
      )
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch project members', { error });
      throw new AppError('Failed to fetch project members', 500);
    }

    return members;
  }

  private async verifyAccess(projectId: string, userId: string) {
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

  private async verifyOwnership(projectId: string, userId: string) {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== userId) {
      throw new AppError('Only project owner can perform this action', 403);
    }
  }

  private formatProject(project: any) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.owner_id,
      status: project.status,
      startDate: project.start_date,
      endDate: project.end_date,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      owner: project.owner,
      members: project.members,
    };
  }
}
