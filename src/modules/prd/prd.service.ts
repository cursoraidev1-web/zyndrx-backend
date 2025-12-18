import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { PRDStatus } from '../../types/database.types';
import logger from '../../utils/logger';
import {
  CreatePRDInput,
  UpdatePRDInput,
  UpdatePRDStatusInput,
  GetPRDsQuery,
} from './prd.validation';

/**
 * PRD Service
 * Handles all business logic for Product Requirements Documents
 */
export class PRDService {
  /**
   * Create a new PRD
   * Automatically creates the first version entry
   */
  async createPRD(userId: string, data: CreatePRDInput) {
    try {
      // 1. Verify user has access to the project
      const hasAccess = await this.checkProjectAccess(data.projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      // 2. Check if user has permission to create PRDs (PM, admin, or project owner)
      const canCreate = await this.checkCanCreatePRD(data.projectId, userId);
      if (!canCreate) {
        throw new AppError('Only project owners, admins, and product managers can create PRDs', 403);
      }

      // 3. Create the PRD
      const { data: prd, error: prdError } = await supabaseAdmin
        .from('prds')
        .insert({
          project_id: data.projectId,
          title: data.title,
          content: data.content,
          version: 1,
          status: 'draft' as PRDStatus,
          created_by: userId,
        })
        .select(`
          *,
          creator:users!prds_created_by_fkey(id, email, full_name, avatar_url, role),
          project:projects(id, name, description, owner_id)
        `)
        .single();

      if (prdError || !prd) {
        logger.error('Failed to create PRD', { error: prdError, userId, projectId: data.projectId });
        throw new AppError('Failed to create PRD', 500);
      }

      // 4. Create the first version entry
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
      logger.error('Create PRD error', { error, userId });
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
        .select(`
          *,
          creator:users!prds_created_by_fkey(id, email, full_name, avatar_url, role),
          approver:users!prds_approved_by_fkey(id, email, full_name, avatar_url, role),
          project:projects(id, name, description, owner_id, status)
        `, { count: 'exact' });

      // Filter by project if provided
      if (query.projectId) {
        const hasAccess = await this.checkProjectAccess(query.projectId, userId);
        if (!hasAccess) {
          throw new AppError('Project not found or access denied', 404);
        }
        queryBuilder = queryBuilder.eq('project_id', query.projectId);
      } else {
        // Get all PRDs from projects user has access to
        const userProjectIds = await this.getUserProjectIds(userId);
        if (userProjectIds.length === 0) {
          return {
            data: [],
            pagination: {
              total: 0,
              page: query.page,
              limit: query.limit,
              totalPages: 0,
            },
          };
        }
        queryBuilder = queryBuilder.in('project_id', userProjectIds);
      }

      // Filter by status if provided
      if (query.status) {
        queryBuilder = queryBuilder.eq('status', query.status);
      }

      // Filter by creator if provided
      if (query.createdBy) {
        queryBuilder = queryBuilder.eq('created_by', query.createdBy);
      }

      // Sorting
      const sortColumn = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      queryBuilder = queryBuilder.order(sortColumn, sortOrder);

      // Pagination
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder.range(offset, offset + query.limit - 1);

      const { data: prds, error, count } = await queryBuilder;

      if (error) {
        logger.error('Failed to fetch PRDs', { error, userId });
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
      logger.error('Get PRDs error', { error, userId });
      throw new AppError('Failed to fetch PRDs', 500);
    }
  }

  /**
   * Get single PRD by ID with version history
   */
  async getPRDById(prdId: string, userId: string, includeVersions = true) {
    try {
      const { data: prd, error } = await supabaseAdmin
        .from('prds')
        .select(`
          *,
          creator:users!prds_created_by_fkey(id, email, full_name, avatar_url, role),
          approver:users!prds_approved_by_fkey(id, email, full_name, avatar_url, role),
          project:projects(id, name, description, owner_id, status)
        `)
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

      // Get version history if requested
      let versions = [];
      if (includeVersions) {
        versions = await this.getPRDVersions(prdId, userId);
      }

      return {
        ...this.formatPRD(prd),
        versions,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get PRD by ID error', { error, prdId, userId });
      throw new AppError('Failed to fetch PRD', 500);
    }
  }

  /**
   * Update PRD content
   * Creates a new version snapshot automatically
   */
  async updatePRD(prdId: string, userId: string, data: UpdatePRDInput) {
    try {
      // 1. Get existing PRD
      const { data: existingPRD, error: fetchError } = await supabaseAdmin
        .from('prds')
        .select('*, project:projects(owner_id)')
        .eq('id', prdId)
        .single();

      if (fetchError || !existingPRD) {
        throw new AppError('PRD not found', 404);
      }

      // 2. Check if user has access
      const hasAccess = await this.checkProjectAccess(existingPRD.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // 3. Check if PRD is approved (can't edit approved PRDs)
      if (existingPRD.status === 'approved') {
        throw new AppError('Cannot edit approved PRD. Create a new PRD for changes.', 400);
      }

      // 4. Check if user is the creator or has permission to edit
      const canEdit = await this.checkCanEditPRD(existingPRD, userId);
      if (!canEdit) {
        throw new AppError('Only the creator, project owner, or admins can edit this PRD', 403);
      }

      // 5. Prepare update data
      const newVersion = existingPRD.version + 1;
      const updateData: any = {
        version: newVersion,
        status: 'draft' as PRDStatus, // Reset to draft on edit
      };

      if (data.title) updateData.title = data.title;
      if (data.content) updateData.content = data.content;

      // 6. Update the PRD
      const { data: updatedPRD, error } = await supabaseAdmin
        .from('prds')
        .update(updateData)
        .eq('id', prdId)
        .select(`
          *,
          creator:users!prds_created_by_fkey(id, email, full_name, avatar_url, role),
          project:projects(id, name, description, owner_id)
        `)
        .single();

      if (error || !updatedPRD) {
        logger.error('Failed to update PRD', { error, prdId, userId });
        throw new AppError('Failed to update PRD', 500);
      }

      // 7. Create version snapshot
      await this.createVersionSnapshot(prdId, {
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

      return this.formatPRD(updatedPRD);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update PRD error', { error, prdId, userId });
      throw new AppError('Failed to update PRD', 500);
    }
  }

  /**
   * Update PRD status (submit for review, approve, reject)
   */
  async updatePRDStatus(prdId: string, userId: string, data: UpdatePRDStatusInput) {
    try {
      // 1. Get existing PRD
      const { data: existingPRD, error: fetchError } = await supabaseAdmin
        .from('prds')
        .select('*, project:projects(owner_id)')
        .eq('id', prdId)
        .single();

      if (fetchError || !existingPRD) {
        throw new AppError('PRD not found', 404);
      }

      // 2. Check if user has access
      const hasAccess = await this.checkProjectAccess(existingPRD.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // 3. Validate status transition
      this.validateStatusTransition(existingPRD.status, data.status);

      // 4. Check permissions for approval/rejection
      if (data.status === 'approved' || data.status === 'rejected') {
        const canApprove = await this.checkCanApprove(existingPRD.project_id, userId);
        if (!canApprove) {
          throw new AppError('Only project owners, admins, and product managers can approve/reject PRDs', 403);
        }
      }

      // 5. Prepare update data
      const updateData: any = { status: data.status };

      if (data.status === 'approved') {
        updateData.approved_by = userId;
        updateData.approved_at = new Date().toISOString();
      }

      // Store rejection reason or approval notes in content metadata
      if (data.rejectionReason || data.approvalNotes) {
        updateData.content = {
          ...existingPRD.content,
          _metadata: {
            ...(existingPRD.content as any)?._metadata,
            rejectionReason: data.rejectionReason,
            approvalNotes: data.approvalNotes,
            lastStatusChange: {
              status: data.status,
              changedBy: userId,
              changedAt: new Date().toISOString(),
            },
          },
        };
      }

      // 6. Update status
      const { data: updatedPRD, error } = await supabaseAdmin
        .from('prds')
        .update(updateData)
        .eq('id', prdId)
        .select(`
          *,
          creator:users!prds_created_by_fkey(id, email, full_name, avatar_url, role),
          approver:users!prds_approved_by_fkey(id, email, full_name, avatar_url, role),
          project:projects(id, name, description, owner_id)
        `)
        .single();

      if (error || !updatedPRD) {
        logger.error('Failed to update PRD status', { error, prdId, userId });
        throw new AppError('Failed to update PRD status', 500);
      }

      // 7. Send notification to PRD creator
      if (data.status === 'approved' || data.status === 'rejected') {
        await this.sendStatusChangeNotification(updatedPRD, data);
      }

      logger.info('PRD status updated', {
        prdId,
        status: data.status,
        userId,
      });

      return this.formatPRD(updatedPRD);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update PRD status error', { error, prdId, userId });
      throw new AppError('Failed to update PRD status', 500);
    }
  }

  /**
   * Delete PRD
   * Only creator or project owner can delete
   * Cannot delete approved PRDs
   */
  async deletePRD(prdId: string, userId: string) {
    try {
      // 1. Get existing PRD
      const { data: existingPRD, error: fetchError } = await supabaseAdmin
        .from('prds')
        .select('*, project:projects(owner_id)')
        .eq('id', prdId)
        .single();

      if (fetchError || !existingPRD) {
        throw new AppError('PRD not found', 404);
      }

      // 2. Check if user is creator or project owner
      const isCreator = existingPRD.created_by === userId;
      const isOwner = existingPRD.project?.owner_id === userId;

      if (!isCreator && !isOwner) {
        throw new AppError('Only the creator or project owner can delete this PRD', 403);
      }

      // 3. Don't allow deletion of approved PRDs
      if (existingPRD.status === 'approved') {
        throw new AppError('Cannot delete approved PRD', 400);
      }

      // 4. Delete the PRD (cascade will delete versions)
      const { error } = await supabaseAdmin
        .from('prds')
        .delete()
        .eq('id', prdId);

      if (error) {
        logger.error('Failed to delete PRD', { error, prdId, userId });
        throw new AppError('Failed to delete PRD', 500);
      }

      logger.info('PRD deleted successfully', { prdId, userId });

      return { message: 'PRD deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete PRD error', { error, prdId, userId });
      throw new AppError('Failed to delete PRD', 500);
    }
  }

  /**
   * Get version history for a PRD
   */
  async getPRDVersions(prdId: string, userId: string) {
    try {
      // 1. Check if PRD exists and user has access
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

      // 2. Get all versions
      const { data: versions, error } = await supabaseAdmin
        .from('prd_versions')
        .select(`
          id,
          version,
          title,
          content,
          changes_summary,
          created_at,
          created_by_user:users!prd_versions_created_by_fkey(id, email, full_name, avatar_url, role)
        `)
        .eq('prd_id', prdId)
        .order('version', { ascending: false });

      if (error) {
        logger.error('Failed to fetch PRD versions', { error, prdId });
        throw new AppError('Failed to fetch PRD versions', 500);
      }

      return versions || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get PRD versions error', { error, prdId, userId });
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
   * Check if user can create PRDs (owner, admin, or product_manager)
   */
  private async checkCanCreatePRD(projectId: string, userId: string): Promise<boolean> {
    // Check if owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (project?.owner_id === userId) return true;

    // Check if admin or product manager
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return member?.role === 'admin' || member?.role === 'product_manager';
  }

  /**
   * Check if user can approve PRDs (owner, admin, or product_manager)
   */
  private async checkCanApprove(projectId: string, userId: string): Promise<boolean> {
    // Check if owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (project?.owner_id === userId) return true;

    // Check if admin or product manager
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return member?.role === 'admin' || member?.role === 'product_manager';
  }

  /**
   * Check if user can edit a PRD
   */
  private async checkCanEditPRD(prd: any, userId: string): Promise<boolean> {
    // Creator can always edit
    if (prd.created_by === userId) return true;

    // Project owner can edit
    if (prd.project?.owner_id === userId) return true;

    // Admin can edit
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', prd.project_id)
      .eq('user_id', userId)
      .single();

    return member?.role === 'admin';
  }

  /**
   * Get all project IDs user has access to
   */
  private async getUserProjectIds(userId: string): Promise<string[]> {
    // Get owned projects
    const { data: ownedProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('owner_id', userId);

    // Get member projects
    const { data: memberProjects } = await supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    const ownedIds = ownedProjects?.map((p) => p.id) || [];
    const memberIds = memberProjects?.map((m) => m.project_id) || [];

    return [...new Set([...ownedIds, ...memberIds])];
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      draft: ['in_review'],
      in_review: ['approved', 'rejected', 'draft'],
      approved: [], // Cannot change from approved
      rejected: ['draft', 'in_review'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        400
      );
    }
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
      logger.error('Failed to create version snapshot', { error, prdId });
      // Don't throw - version history is supplementary
    }
  }

  /**
   * Send notification on status change
   */
  private async sendStatusChangeNotification(prd: any, statusData: UpdatePRDStatusInput) {
    try {
      const notificationType = statusData.status === 'approved' ? 'prd_approved' : 'prd_rejected';
      const title = statusData.status === 'approved' ? 'PRD Approved' : 'PRD Rejected';
      
      let message = `Your PRD "${prd.title}" has been ${statusData.status}`;
      if (statusData.rejectionReason) {
        message += `: ${statusData.rejectionReason}`;
      }

      await supabaseAdmin.from('notifications').insert({
        user_id: prd.created_by,
        type: notificationType,
        title,
        message,
        link: `/projects/${prd.project_id}/prds/${prd.id}`,
      });
    } catch (error) {
      logger.error('Failed to send notification', { error, prdId: prd.id });
      // Don't throw - notifications are not critical
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
}
