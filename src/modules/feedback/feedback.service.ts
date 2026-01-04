import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export interface Feedback {
  id: string;
  userId: string;
  companyId?: string;
  type: 'general' | 'bug' | 'feature' | 'issue';
  rating?: number;
  title: string;
  description: string;
  email?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'closed';
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackData {
  userId: string;
  companyId?: string;
  type: 'general' | 'bug' | 'feature' | 'issue';
  rating?: number;
  title: string;
  description: string;
  email?: string;
}

export class FeedbackService {
  /**
   * Create feedback
   */
  static async createFeedback(data: CreateFeedbackData): Promise<Feedback> {
    try {
      const { data: feedback, error } = await (db.from('feedback') as any)
        .insert({
          user_id: data.userId,
          company_id: data.companyId || null,
          type: data.type,
          rating: data.rating || null,
          title: data.title,
          description: data.description,
          email: data.email || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create feedback', { error: error.message, data });
        throw new AppError(`Failed to create feedback: ${error.message}`, 500);
      }

      return this.mapFeedbackFromDB(feedback);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Feedback creation error', { error, data });
      throw new AppError('Failed to create feedback', 500);
    }
  }

  /**
   * Get feedback by ID
   */
  static async getFeedbackById(feedbackId: string, userId: string): Promise<Feedback | null> {
    try {
      const { data, error } = await db
        .from('feedback')
        .select('*')
        .eq('id', feedbackId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new AppError(error.message, 500);
      }

      if (!data) return null;

      return this.mapFeedbackFromDB(data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch feedback', 500);
    }
  }

  /**
   * Get feedback list (for user or admin)
   */
  static async getFeedback(
    userId: string,
    companyId?: string,
    filters?: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Feedback[]> {
    try {
      let query = db.from('feedback').select('*').eq('user_id', userId);

      if (companyId) {
        query = query.eq('company_id', companyId) as any;
      }

      if (filters?.type) {
        query = query.eq('type', filters.type) as any;
      }

      if (filters?.status) {
        query = query.eq('status', filters.status) as any;
      }

      query = query.order('created_at', { ascending: false }) as any;

      if (filters?.limit) {
        query = query.limit(filters.limit) as any;
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1) as any;
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(error.message, 500);
      }

      return (data || []).map((item: any) => this.mapFeedbackFromDB(item));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch feedback', 500);
    }
  }

  /**
   * Update feedback status
   * Note: Typically an admin function, but users can update their own pending feedback
   */
  static async updateFeedbackStatus(
    feedbackId: string,
    userId: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'closed'
  ): Promise<Feedback> {
    try {
      // Verify feedback belongs to user
      const { data: existing, error: fetchError } = await db
        .from('feedback')
        .select('user_id, status, company_id')
        .eq('id', feedbackId)
        .single() as any;

      if (fetchError || !existing) {
        throw new AppError('Feedback not found', 404);
      }

      const existingData = existing as any;
      
      // Check if the user is an admin of the company associated with the feedback
      let isAdmin = false;
      if (existingData.company_id) {
        const { data: membership } = await db
          .from('user_companies')
          .select('role')
          .eq('company_id', existingData.company_id)
          .eq('user_id', userId)
          .single() as any;
        isAdmin = membership?.role === 'admin';
      }

      // Only allow updating if user is admin OR if it's the owner and status is pending
      if (!isAdmin && (existingData.user_id !== userId || existingData.status !== 'pending')) {
        throw new AppError('Unauthorized to update feedback status', 403);
      }

      const updatePayload: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Note: resolved_at and resolved_by columns don't exist in schema
      // If needed, add them via migration. For now, store in metadata
      if (status === 'resolved' || status === 'closed') {
        updatePayload.metadata = {
          ...(existingData.metadata || {}),
          resolved_at: new Date().toISOString(),
          resolved_by: userId
        };
      }

      const { data: feedback, error } = await (db.from('feedback') as any)
        .update(updatePayload)
        .eq('id', feedbackId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update feedback status', { error: error.message, feedbackId, status });
        throw new AppError(`Failed to update feedback status: ${error.message}`, 500);
      }

      return this.mapFeedbackFromDB(feedback);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Feedback status update error', { error, feedbackId, status });
      throw new AppError('Failed to update feedback status', 500);
    }
  }

  /**
   * Map database feedback to service interface
   */
  private static mapFeedbackFromDB(data: any): Feedback {
    return {
      id: data.id,
      userId: data.user_id,
      companyId: data.company_id,
      type: data.type,
      rating: data.rating,
      title: data.title,
      description: data.description,
      email: data.email,
      status: data.status,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

