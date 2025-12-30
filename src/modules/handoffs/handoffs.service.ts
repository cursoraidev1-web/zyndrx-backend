import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { ProjectService } from '../projects/projects.service';

const db = supabaseAdmin as SupabaseClient<Database>;

export class HandoffService {
  
  // Create handoff
  static async createHandoff(data: {
    project_id: string;
    from_user_id: string;
    to_user_id: string;
    title: string;
    description?: string;
    priority?: string;
    due_date?: string;
    company_id: string;
  }) {
    try {
      // Verify project exists and belongs to company
      await ProjectService.getProjectById(data.project_id, data.company_id);

      const { data: handoff, error } = await (db.from('handoffs') as any)
        .insert({
          ...data,
          status: 'pending',
          priority: data.priority || 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          from_user:users!handoffs_from_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          to_user:users!handoffs_to_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          project:projects!handoffs_project_id_fkey (
            id,
            name
          )
        `)
        .single();

      if (error) {
        logger.error('Failed to create handoff', { error: error.message, data });
        throw new AppError(`Failed to create handoff: ${error.message}`, 500);
      }

      return handoff;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create handoff error', { error, data });
      throw new AppError('Failed to create handoff', 500);
    }
  }

  // Get handoff by ID
  static async getHandoffById(handoffId: string, companyId: string) {
    try {
      const { data, error } = await db
        .from('handoffs')
        .select(`
          *,
          from_user:users!handoffs_from_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          to_user:users!handoffs_to_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          project:projects!handoffs_project_id_fkey (
            id,
            name
          ),
          approver:users!handoffs_approved_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', handoffId)
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        throw new AppError('Handoff not found or access denied', 404);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get handoff error', { error, handoffId });
      throw new AppError('Failed to fetch handoff', 500);
    }
  }

  // Get handoffs with filters
  static async getHandoffs(filters: {
    companyId: string;
    projectId?: string;
    status?: string;
    userId?: string;
    fromUserId?: string;
    toUserId?: string;
  }) {
    try {
      let query = db
        .from('handoffs')
        .select(`
          *,
          from_user:users!handoffs_from_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          to_user:users!handoffs_to_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          project:projects!handoffs_project_id_fkey (
            id,
            name
          )
        `)
        .eq('company_id', filters.companyId);

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.fromUserId) {
        query = query.eq('from_user_id', filters.fromUserId);
      }

      if (filters.toUserId) {
        query = query.eq('to_user_id', filters.toUserId);
      }

      if (filters.userId) {
        query = query.or(`from_user_id.eq.${filters.userId},to_user_id.eq.${filters.userId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch handoffs', { error: error.message, filters });
        throw new AppError(`Failed to fetch handoffs: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get handoffs error', { error, filters });
      throw new AppError('Failed to fetch handoffs', 500);
    }
  }

  // Update handoff
  static async updateHandoff(handoffId: string, companyId: string, updates: any) {
    try {
      const updatePayload: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data: handoff, error } = await (db.from('handoffs') as any)
        .update(updatePayload)
        .eq('id', handoffId)
        .eq('company_id', companyId)
        .select(`
          *,
          from_user:users!handoffs_from_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          to_user:users!handoffs_to_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          project:projects!handoffs_project_id_fkey (
            id,
            name
          )
        `)
        .single();

      if (error) {
        logger.error('Failed to update handoff', { error: error.message, handoffId, updates });
        throw new AppError(`Failed to update handoff: ${error.message}`, 500);
      }

      if (!handoff) {
        throw new AppError('Handoff not found', 404);
      }

      return handoff;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update handoff error', { error, handoffId });
      throw new AppError('Failed to update handoff', 500);
    }
  }

  // Delete handoff
  static async deleteHandoff(handoffId: string, companyId: string) {
    try {
      const { error } = await (db.from('handoffs') as any)
        .delete()
        .eq('id', handoffId)
        .eq('company_id', companyId);

      if (error) {
        logger.error('Failed to delete handoff', { error: error.message, handoffId });
        throw new AppError(`Failed to delete handoff: ${error.message}`, 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete handoff error', { error, handoffId });
      throw new AppError('Failed to delete handoff', 500);
    }
  }

  // Approve handoff
  static async approveHandoff(handoffId: string, approverId: string, companyId: string) {
    try {
      const handoff = await this.getHandoffById(handoffId, companyId);
      const handoffData = handoff as any;

      if (handoffData.status !== 'pending' && handoffData.status !== 'in_review') {
        throw new AppError('Only pending or in_review handoffs can be approved', 400);
      }

      const { data: updatedHandoff, error } = await (db.from('handoffs') as any)
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', handoffId)
        .eq('company_id', companyId)
        .select(`
          *,
          from_user:users!handoffs_from_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          to_user:users!handoffs_to_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          project:projects!handoffs_project_id_fkey (
            id,
            name
          ),
          approver:users!handoffs_approved_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        logger.error('Failed to approve handoff', { error: error.message, handoffId });
        throw new AppError(`Failed to approve handoff: ${error.message}`, 500);
      }

      return updatedHandoff;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Approve handoff error', { error, handoffId });
      throw new AppError('Failed to approve handoff', 500);
    }
  }

  // Reject handoff
  static async rejectHandoff(handoffId: string, rejectorId: string, companyId: string, reason?: string) {
    try {
      const handoff = await this.getHandoffById(handoffId, companyId);
      const handoffData = handoff as any;

      if (handoffData.status !== 'pending' && handoffData.status !== 'in_review') {
        throw new AppError('Only pending or in_review handoffs can be rejected', 400);
      }

      const { data: updatedHandoff, error } = await (db.from('handoffs') as any)
        .update({
          status: 'rejected',
          rejected_by: rejectorId,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', handoffId)
        .eq('company_id', companyId)
        .select(`
          *,
          from_user:users!handoffs_from_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          to_user:users!handoffs_to_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          project:projects!handoffs_project_id_fkey (
            id,
            name
          )
        `)
        .single();

      if (error) {
        logger.error('Failed to reject handoff', { error: error.message, handoffId });
        throw new AppError(`Failed to reject handoff: ${error.message}`, 500);
      }

      return updatedHandoff;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Reject handoff error', { error, handoffId });
      throw new AppError('Failed to reject handoff', 500);
    }
  }
}



