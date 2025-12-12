import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { PRDStatus } from '../../types/database.types';
import logger from '../../utils/logger';

export interface CreatePRDData {
  projectId: string;
  title: string;
  content: any;
  createdBy: string;
}

export interface UpdatePRDData {
  title?: string;
  content?: any;
  changesSummary?: string;
}

export class PRDService {
  async create(data: CreatePRDData) {
    try {
      // Verify project exists and user has access
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', data.projectId)
        .single();

      if (projectError || !project) {
        throw new AppError('Project not found', 404);
      }

      // Create PRD
      const { data: prd, error } = await supabaseAdmin
        .from('prds')
        .insert({
          project_id: data.projectId,
          title: data.title,
          content: data.content,
          created_by: data.createdBy,
          status: 'draft',
          version: 1,
        })
        .select('*')
        .single();

      if (error || !prd) {
        logger.error('Failed to create PRD', { error });
        throw new AppError('Failed to create PRD', 500);
      }

      // Create initial version record
      await supabaseAdmin.from('prd_versions').insert({
        prd_id: prd.id,
        version: 1,
        title: prd.title,
        content: prd.content,
        created_by: data.createdBy,
        changes_summary: 'Initial version',
      });

      return this.formatPRD(prd);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('PRD creation error', { error });
      throw new AppError('Failed to create PRD', 500);
    }
  }

  async getById(prdId: string, userId: string) {
    const { data: prd, error } = await supabaseAdmin
      .from('prds')
      .select(
        `
        *,
        project:projects(*),
        creator:users!prds_created_by_fkey(id, full_name, email, avatar_url),
        approver:users!prds_approved_by_fkey(id, full_name, email, avatar_url)
      `
      )
      .eq('id', prdId)
      .single();

    if (error || !prd) {
      throw new AppError('PRD not found', 404);
    }

    // Verify user has access to the project
    await this.verifyProjectAccess(prd.project_id, userId);

    return this.formatPRD(prd);
  }

  async getByProject(
    projectId: string,
    userId: string,
    filters?: { status?: PRDStatus; page?: number; limit?: number }
  ) {
    // Verify user has access to the project
    await this.verifyProjectAccess(projectId, userId);

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('prds')
      .select(
        `
        *,
        creator:users!prds_created_by_fkey(id, full_name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: prds, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch PRDs', { error });
      throw new AppError('Failed to fetch PRDs', 500);
    }

    return {
      prds: prds?.map((prd) => this.formatPRD(prd)) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async update(prdId: string, userId: string, data: UpdatePRDData) {
    // Get existing PRD
    const { data: existingPRD, error: fetchError } = await supabaseAdmin
      .from('prds')
      .select('*')
      .eq('id', prdId)
      .single();

    if (fetchError || !existingPRD) {
      throw new AppError('PRD not found', 404);
    }

    // Verify user has access
    await this.verifyProjectAccess(existingPRD.project_id, userId);

    // Can only update draft or rejected PRDs
    if (existingPRD.status !== 'draft' && existingPRD.status !== 'rejected') {
      throw new AppError('Can only update draft or rejected PRDs', 400);
    }

    const newVersion = existingPRD.version + 1;

    // Update PRD
    const { data: updatedPRD, error } = await supabaseAdmin
      .from('prds')
      .update({
        title: data.title || existingPRD.title,
        content: data.content || existingPRD.content,
        version: newVersion,
        status: 'draft', // Reset to draft when updated
      })
      .eq('id', prdId)
      .select('*')
      .single();

    if (error || !updatedPRD) {
      logger.error('Failed to update PRD', { error });
      throw new AppError('Failed to update PRD', 500);
    }

    // Create version record
    await supabaseAdmin.from('prd_versions').insert({
      prd_id: prdId,
      version: newVersion,
      title: updatedPRD.title,
      content: updatedPRD.content,
      created_by: userId,
      changes_summary: data.changesSummary || 'Updated PRD',
    });

    return this.formatPRD(updatedPRD);
  }

  async updateStatus(prdId: string, userId: string, status: 'in_review' | 'approved' | 'rejected', feedback?: string) {
    const { data: prd, error: fetchError } = await supabaseAdmin
      .from('prds')
      .select('*, project:projects(owner_id)')
      .eq('id', prdId)
      .single();

    if (fetchError || !prd) {
      throw new AppError('PRD not found', 404);
    }

    // Verify user has access
    await this.verifyProjectAccess(prd.project_id, userId);

    const updateData: any = { status };

    if (status === 'approved') {
      updateData.approved_by = userId;
      updateData.approved_at = new Date().toISOString();
    }

    const { data: updatedPRD, error } = await supabaseAdmin
      .from('prds')
      .update(updateData)
      .eq('id', prdId)
      .select('*')
      .single();

    if (error || !updatedPRD) {
      logger.error('Failed to update PRD status', { error });
      throw new AppError('Failed to update PRD status', 500);
    }

    // Create notification for PRD creator
    if (status === 'approved' || status === 'rejected') {
      await supabaseAdmin.from('notifications').insert({
        user_id: prd.created_by,
        type: status === 'approved' ? 'prd_approved' : 'prd_rejected',
        title: `PRD ${status}`,
        message: `Your PRD "${prd.title}" has been ${status}${feedback ? `: ${feedback}` : ''}`,
        link: `/projects/${prd.project_id}/prds/${prd.id}`,
      });
    }

    return this.formatPRD(updatedPRD);
  }

  async delete(prdId: string, userId: string) {
    const { data: prd, error: fetchError } = await supabaseAdmin
      .from('prds')
      .select('project_id, created_by')
      .eq('id', prdId)
      .single();

    if (fetchError || !prd) {
      throw new AppError('PRD not found', 404);
    }

    // Only creator or project owner can delete
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', prd.project_id)
      .single();

    if (prd.created_by !== userId && project?.owner_id !== userId) {
      throw new AppError('Not authorized to delete this PRD', 403);
    }

    const { error } = await supabaseAdmin.from('prds').delete().eq('id', prdId);

    if (error) {
      logger.error('Failed to delete PRD', { error });
      throw new AppError('Failed to delete PRD', 500);
    }

    return { message: 'PRD deleted successfully' };
  }

  async getVersionHistory(prdId: string, userId: string) {
    // Verify PRD exists and user has access
    const prd = await this.getById(prdId, userId);

    const { data: versions, error } = await supabaseAdmin
      .from('prd_versions')
      .select(
        `
        *,
        creator:users(id, full_name, avatar_url)
      `
      )
      .eq('prd_id', prdId)
      .order('version', { ascending: false });

    if (error) {
      logger.error('Failed to fetch version history', { error });
      throw new AppError('Failed to fetch version history', 500);
    }

    return versions;
  }

  private async verifyProjectAccess(projectId: string, userId: string) {
    const { data: member, error } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !member) {
      // Also check if user is project owner
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

  private formatPRD(prd: any) {
    return {
      id: prd.id,
      projectId: prd.project_id,
      title: prd.title,
      content: prd.content,
      version: prd.version,
      status: prd.status,
      createdBy: prd.created_by,
      approvedBy: prd.approved_by,
      createdAt: prd.created_at,
      updatedAt: prd.updated_at,
      approvedAt: prd.approved_at,
      creator: prd.creator,
      approver: prd.approver,
      project: prd.project,
    };
  }
}
