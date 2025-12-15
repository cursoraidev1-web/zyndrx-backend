import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import {
  CreatePRDInput,
  UpdatePRDInput,
  UpdatePRDStatusInput,
  GetPRDsQuery,
} from './prds.validation';

export class PRDsService {
  /**
   * Create a new PRD
   * Automatically creates the first version entry
   */
  async createPRD(userId: string, data: CreatePRDInput) {
    try {
      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(data.projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      // Create the PRD
      const { data: prd, error: prdError } = await supabaseAdmin
        .from('prds')
        .insert({
          project_id: data.projectId,
          title: data.title,
          content: data.content,
          version: 1,
          status: 'draft',
          created_by: userId,
        })
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url),
          project:projects(id, name)
        `
        )
        .single();

      if (prdError || !prd) {
        logger.error('Failed to create PRD', { error: prdError });
        throw new AppError('Failed to create PRD', 500);
      }

      // Create the first version entry
      await this.createVersionSnapshot(prd.id, {
        version: 1,
        title: data.title,
        content: data.content,
        createdBy: userId,
        changesSummary: 'Initial version',
      });

      logger.info('PRD created successfully', {
        prdId: prd.id,
        projectId: data.projectId,
        userId,
      });

      return this.formatPRD(prd);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create PRD error', { error });
      throw new AppError('Failed to create PRD', 500);
    }
  }

  /**
   * Get PRDs with filtering and pagination
   */
  async getPRDs(userId: string, query: GetPRDsQuery) {
    try {
      let queryBuilder = supabaseAdmin
        .from('prds')
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url),
          approver:users!approved_by(id, email, full_name, avatar_url),
          project:projects(id, name)
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
        // Get all PRDs from projects user has access to
        const { data: userProjects } = await supabaseAdmin
          .from('projects')
          .select('id')
          .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`);

        if (!userProjects || userProjects.length === 0) {
          return { data: [], pagination: { total: 0, page: 1, limit: query.limit, totalPages: 0 } };
        }

        const projectIds = userProjects.map((p) => p.id);
        queryBuilder = queryBuilder.in('project_id', projectIds);
      }

      // Filter by status if provided
      if (query.status) {
        queryBuilder = queryBuilder.eq('status', query.status);
      }

      // Pagination
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder
        .order('created_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

      const { data: prds, error, count } = await queryBuilder;

      if (error) {
        logger.error('Failed to fetch PRDs', { error });
        throw new AppError('Failed to fetch PRDs', 500);
      }

      return {
        data: prds?.map((prd) => this.formatPRD(prd)) || [],
        pagination: {
          total: count || 0,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil((count || 0) / query.limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get PRDs error', { error });
      throw new AppError('Failed to fetch PRDs', 500);
    }
  }

  /**
   * Get single PRD by ID with version history
   */
  async getPRDById(prdId: string, userId: string) {
    try {
      const { data: prd, error } = await supabaseAdmin
        .from('prds')
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url, role),
          approver:users!approved_by(id, email, full_name, avatar_url, role),
          project:projects(id, name, owner_id),
          versions:prd_versions(
            id,
            version,
            title,
            created_at,
            changes_summary,
            created_by_user:users!created_by(id, email, full_name, avatar_url)
          )
        `
        )
        .eq('id', prdId)
        .single();

      if (error || !prd) {
        throw new AppError('PRD not found', 404);
      }

      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(prd.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      return this.formatPRDDetails(prd);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get PRD by ID error', { error });
      throw new AppError('Failed to fetch PRD', 500);
    }
  }

  /**
   * Update PRD
   * Creates a new version snapshot automatically
   */
  async updatePRD(prdId: string, userId: string, data: UpdatePRDInput) {
    try {
      // Get existing PRD
      const { data: existingPRD, error: fetchError } = await supabaseAdmin
        .from('prds')
        .select('*, project:projects(owner_id)')
        .eq('id', prdId)
        .single();

      if (fetchError || !existingPRD) {
        throw new AppError('PRD not found', 404);
      }

      // Check if user has access
      const hasAccess = await this.checkProjectAccess(existingPRD.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // Check if PRD is approved (can't edit approved PRDs)
      if (existingPRD.status === 'approved') {
        throw new AppError('Cannot edit approved PRD. Create a new version instead.', 400);
      }

      // Increment version
      const newVersion = existingPRD.version + 1;

      // Update the PRD
      const { data: prd, error } = await supabaseAdmin
        .from('prds')
        .update({
          title: data.title || existingPRD.title,
          content: data.content || existingPRD.content,
          version: newVersion,
          status: 'draft', // Reset to draft on edit
        })
        .eq('id', prdId)
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url),
          project:projects(id, name)
        `
        )
        .single();

      if (error || !prd) {
        logger.error('Failed to update PRD', { error });
        throw new AppError('Failed to update PRD', 500);
      }

      // Create version snapshot
      await this.createVersionSnapshot(prd.id, {
        version: newVersion,
        title: data.title || existingPRD.title,
        content: data.content || existingPRD.content,
        createdBy: userId,
        changesSummary: data.changesSummary || 'Updated PRD',
      });

      logger.info('PRD updated successfully', {
        prdId,
        version: newVersion,
        userId,
      });

      return this.formatPRD(prd);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update PRD error', { error });
      throw new AppError('Failed to update PRD', 500);
    }
  }

  /**
   * Update PRD status (submit for review, approve, reject)
   */
  async updatePRDStatus(prdId: string, userId: string, data: UpdatePRDStatusInput) {
    try {
      // Get existing PRD
      const { data: existingPRD, error: fetchError } = await supabaseAdmin
        .from('prds')
        .select('*, project:projects(owner_id)')
        .eq('id', prdId)
        .single();

      if (fetchError || !existingPRD) {
        throw new AppError('PRD not found', 404);
      }

      // Check if user has access
      const hasAccess = await this.checkProjectAccess(existingPRD.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // Check permissions for approval/rejection
      if (data.status === 'approved' || data.status === 'rejected') {
        const canApprove = await this.checkCanApprove(existingPRD.project_id, userId);
        if (!canApprove) {
          throw new AppError('Only project owners and product managers can approve/reject PRDs', 403);
        }
      }

      // Update status
      const updateData: any = { status: data.status };

      if (data.status === 'approved') {
        updateData.approved_by = userId;
        updateData.approved_at = new Date().toISOString();
      }

      if (data.status === 'rejected' && data.rejectionReason) {
        // Store rejection reason in content metadata
        updateData.content = {
          ...existingPRD.content,
          _metadata: {
            rejectionReason: data.rejectionReason,
            rejectedBy: userId,
            rejectedAt: new Date().toISOString(),
          },
        };
      }

      const { data: prd, error } = await supabaseAdmin
        .from('prds')
        .update(updateData)
        .eq('id', prdId)
        .select(
          `
          *,
          creator:users!created_by(id, email, full_name, avatar_url),
          approver:users!approved_by(id, email, full_name, avatar_url),
          project:projects(id, name)
        `
        )
        .single();

      if (error || !prd) {
        logger.error('Failed to update PRD status', { error });
        throw new AppError('Failed to update PRD status', 500);
      }

      logger.info('PRD status updated', {
        prdId,
        status: data.status,
        userId,
      });

      return this.formatPRD(prd);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update PRD status error', { error });
      throw new AppError('Failed to update PRD status', 500);
    }
  }

  /**
   * Delete PRD
   * Only creator or project owner can delete
   */
  async deletePRD(prdId: string, userId: string) {
    try {
      // Get existing PRD
      const { data: existingPRD, error: fetchError } = await supabaseAdmin
        .from('prds')
        .select('*, project:projects(owner_id)')
        .eq('id', prdId)
        .single();

      if (fetchError || !existingPRD) {
        throw new AppError('PRD not found', 404);
      }

      // Check if user is creator or project owner
      const isCreator = existingPRD.created_by === userId;
      const isOwner = existingPRD.project.owner_id === userId;

      if (!isCreator && !isOwner) {
        throw new AppError('Only the creator or project owner can delete this PRD', 403);
      }

      // Don't allow deletion of approved PRDs
      if (existingPRD.status === 'approved') {
        throw new AppError('Cannot delete approved PRD', 400);
      }

      const { error } = await supabaseAdmin.from('prds').delete().eq('id', prdId);

      if (error) {
        logger.error('Failed to delete PRD', { error });
        throw new AppError('Failed to delete PRD', 500);
      }

      logger.info('PRD deleted successfully', { prdId, userId });

      return { message: 'PRD deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete PRD error', { error });
      throw new AppError('Failed to delete PRD', 500);
    }
  }

  /**
   * Get version history for a PRD
   */
  async getPRDVersions(prdId: string, userId: string) {
    try {
      // Check if PRD exists and user has access
      const { data: prd } = await supabaseAdmin
        .from('prds')
        .select('project_id')
        .eq('id', prdId)
        .single();

      if (!prd) {
        throw new AppError('PRD not found', 404);
      }

      const hasAccess = await this.checkProjectAccess(prd.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // Get all versions
      const { data: versions, error } = await supabaseAdmin
        .from('prd_versions')
        .select(
          `
          id,
          version,
          title,
          content,
          changes_summary,
          created_at,
          created_by_user:users!created_by(id, email, full_name, avatar_url)
        `
        )
        .eq('prd_id', prdId)
        .order('version', { ascending: false });

      if (error) {
        logger.error('Failed to fetch PRD versions', { error });
        throw new AppError('Failed to fetch PRD versions', 500);
      }

      return versions || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get PRD versions error', { error });
      throw new AppError('Failed to fetch PRD versions', 500);
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
   * Check if user can approve PRDs (owner or product_manager)
   */
  private async checkCanApprove(projectId: string, userId: string): Promise<boolean> {
    // Check if owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (project?.owner_id === userId) return true;

    // Check if product manager or admin
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return member?.role === 'product_manager' || member?.role === 'admin';
  }

  /**
   * Create a version snapshot
   */
  private async createVersionSnapshot(
    prdId: string,
    data: {
      version: number;
      title: string;
      content: any;
      createdBy: string;
      changesSummary?: string;
    }
  ) {
    const { error } = await supabaseAdmin.from('prd_versions').insert({
      prd_id: prdId,
      version: data.version,
      title: data.title,
      content: data.content,
      created_by: data.createdBy,
      changes_summary: data.changesSummary || 'Version update',
    });

    if (error) {
      logger.error('Failed to create version snapshot', { error });
      // Don't throw - version history is supplementary
    }
  }

  /**
   * Format PRD for response
   */
  private formatPRD(prd: any) {
    return {
      id: prd.id,
      projectId: prd.project_id,
      project: prd.project,
      title: prd.title,
      content: prd.content,
      version: prd.version,
      status: prd.status,
      createdBy: prd.created_by,
      creator: prd.creator,
      approvedBy: prd.approved_by,
      approver: prd.approver,
      approvedAt: prd.approved_at,
      createdAt: prd.created_at,
      updatedAt: prd.updated_at,
    };
  }

  /**
   * Format PRD with detailed information including versions
   */
  private formatPRDDetails(prd: any) {
    return {
      ...this.formatPRD(prd),
      versions: prd.versions || [],
    };
  }
}
