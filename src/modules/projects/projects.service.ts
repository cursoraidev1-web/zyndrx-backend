import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
} from './projects.validation';

export class ProjectsService {
  /**
   * Create a new project
   * The creator is automatically added as the owner
   */
  async createProject(userId: string, data: CreateProjectInput) {
    try {
      // Create the project
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .insert({
          name: data.name,
          description: data.description,
          owner_id: userId,
          start_date: data.startDate,
          end_date: data.endDate,
          status: 'active',
        })
        .select('*')
        .single();

      if (projectError || !project) {
        logger.error('Failed to create project', { error: projectError });
        throw new AppError('Failed to create project', 500);
      }

      // Add creator as a project member with admin role
      const { error: memberError } = await supabaseAdmin
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: 'admin',
        });

      if (memberError) {
        logger.error('Failed to add creator as project member', {
          error: memberError,
        });
        // Don't fail the entire operation, just log the error
      }

      logger.info('Project created successfully', {
        projectId: project.id,
        ownerId: userId,
      });

      return this.formatProject(project);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create project error', { error });
      throw new AppError('Failed to create project', 500);
    }
  }

  /**
   * Get all projects where user is owner or member
   */
  async getUserProjects(userId: string) {
    try {
      // Get projects where user is owner or member
      const { data: projects, error } = await supabaseAdmin
        .from('projects')
        .select(
          `
          *,
          owner:users!owner_id(id, email, full_name, avatar_url),
          project_members(count)
        `
        )
        .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch user projects', { error });
        throw new AppError('Failed to fetch projects', 500);
      }

      return projects.map((p) => this.formatProject(p));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get user projects error', { error });
      throw new AppError('Failed to fetch projects', 500);
    }
  }

  /**
   * Get single project by ID
   * Checks if user has access to the project
   */
  async getProjectById(projectId: string, userId: string) {
    try {
      // Check if user has access to this project
      const hasAccess = await this.checkUserAccess(projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select(
          `
          *,
          owner:users!owner_id(id, email, full_name, avatar_url, role),
          project_members(
            id,
            role,
            joined_at,
            user:users(id, email, full_name, avatar_url, role)
          )
        `
        )
        .eq('id', projectId)
        .single();

      if (error || !project) {
        throw new AppError('Project not found', 404);
      }

      return this.formatProjectDetails(project);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get project by ID error', { error });
      throw new AppError('Failed to fetch project', 500);
    }
  }

  /**
   * Update project information
   * Only owner can update
   */
  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectInput
  ) {
    try {
      // Check if user is the owner
      const isOwner = await this.checkIsOwner(projectId, userId);
      if (!isOwner) {
        throw new AppError('Only project owner can update project', 403);
      }

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

      logger.info('Project updated successfully', { projectId });

      return this.formatProject(project);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update project error', { error });
      throw new AppError('Failed to update project', 500);
    }
  }

  /**
   * Delete project
   * Only owner can delete
   */
  async deleteProject(projectId: string, userId: string) {
    try {
      // Check if user is the owner
      const isOwner = await this.checkIsOwner(projectId, userId);
      if (!isOwner) {
        throw new AppError('Only project owner can delete project', 403);
      }

      const { error } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        logger.error('Failed to delete project', { error });
        throw new AppError('Failed to delete project', 500);
      }

      logger.info('Project deleted successfully', { projectId, userId });

      return { message: 'Project deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete project error', { error });
      throw new AppError('Failed to delete project', 500);
    }
  }

  /**
   * Add a member to the project
   * Only owner or admins can add members
   */
  async addMember(projectId: string, userId: string, data: AddMemberInput) {
    try {
      // Check if user has admin access
      const hasAdminAccess = await this.checkAdminAccess(projectId, userId);
      if (!hasAdminAccess) {
        throw new AppError(
          'Only project owner or admins can add members',
          403
        );
      }

      // Check if user to add exists
      const { data: userToAdd, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name')
        .eq('id', data.userId)
        .single();

      if (userError || !userToAdd) {
        throw new AppError('User not found', 404);
      }

      // Check if already a member
      const { data: existingMember } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', data.userId)
        .single();

      if (existingMember) {
        throw new AppError('User is already a member of this project', 409);
      }

      // Add member
      const { data: member, error } = await supabaseAdmin
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: data.userId,
          role: data.role,
        })
        .select(
          `
          id,
          role,
          joined_at,
          user:users(id, email, full_name, avatar_url)
        `
        )
        .single();

      if (error || !member) {
        logger.error('Failed to add project member', { error });
        throw new AppError('Failed to add member to project', 500);
      }

      logger.info('Member added to project', {
        projectId,
        memberId: data.userId,
        addedBy: userId,
      });

      return member;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Add member error', { error });
      throw new AppError('Failed to add member', 500);
    }
  }

  /**
   * Remove a member from the project
   * Only owner or admins can remove members
   * Owner cannot be removed
   */
  async removeMember(projectId: string, userId: string, memberUserId: string) {
    try {
      // Check if user has admin access
      const hasAdminAccess = await this.checkAdminAccess(projectId, userId);
      if (!hasAdminAccess) {
        throw new AppError(
          'Only project owner or admins can remove members',
          403
        );
      }

      // Check if trying to remove the owner
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();

      if (project?.owner_id === memberUserId) {
        throw new AppError('Cannot remove project owner', 400);
      }

      // Remove member
      const { error } = await supabaseAdmin
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', memberUserId);

      if (error) {
        logger.error('Failed to remove project member', { error });
        throw new AppError('Failed to remove member from project', 500);
      }

      logger.info('Member removed from project', {
        projectId,
        memberId: memberUserId,
        removedBy: userId,
      });

      return { message: 'Member removed successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Remove member error', { error });
      throw new AppError('Failed to remove member', 500);
    }
  }

  /**
   * Get all members of a project
   */
  async getProjectMembers(projectId: string, userId: string) {
    try {
      // Check if user has access
      const hasAccess = await this.checkUserAccess(projectId, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      const { data: members, error } = await supabaseAdmin
        .from('project_members')
        .select(
          `
          id,
          role,
          joined_at,
          user:users(id, email, full_name, avatar_url, role)
        `
        )
        .eq('project_id', projectId)
        .order('joined_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch project members', { error });
        throw new AppError('Failed to fetch project members', 500);
      }

      return members;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get project members error', { error });
      throw new AppError('Failed to fetch members', 500);
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Check if user has any access to the project (owner or member)
   */
  private async checkUserAccess(
    projectId: string,
    userId: string
  ): Promise<boolean> {
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
   * Check if user is the project owner
   */
  private async checkIsOwner(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    return project?.owner_id === userId;
  }

  /**
   * Check if user is owner or has admin role in project
   */
  private async checkAdminAccess(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const isOwner = await this.checkIsOwner(projectId, userId);
    if (isOwner) return true;

    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return member?.role === 'admin';
  }

  /**
   * Format project for response
   */
  private formatProject(project: any) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      ownerId: project.owner_id,
      owner: project.owner,
      startDate: project.start_date,
      endDate: project.end_date,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };
  }

  /**
   * Format project with detailed information
   */
  private formatProjectDetails(project: any) {
    return {
      ...this.formatProject(project),
      members: project.project_members || [],
    };
  }
}
