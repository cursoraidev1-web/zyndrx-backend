import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class ProjectService {
  
  static async createProject(data: any) {
    try {
      // Ensure company_id is set
      if (!data.company_id) {
        throw new AppError('Company ID is required', 400);
      }

      // Check plan limits
      const limitCheck = await SubscriptionService.checkLimit(data.company_id, 'project');
      if (!limitCheck.allowed) {
        throw new AppError(limitCheck.message || 'Plan limit reached', 403);
      }

      const { data: project, error } = await (db.from('projects') as any)
        .insert({
          ...data,
          status: 'active',
          company_id: data.company_id // Ensure company_id is set
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create project', { error, data });
        throw new AppError(`Failed to create project: ${error.message}`, 500);
      }

      if (!project) {
        throw new AppError('Failed to create project', 500);
      }

      return project;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create project error', { error, data });
      throw new AppError('Failed to create project', 500);
    }
  }

  static async getUserProjects(
    userId: string, 
    companyId: string, 
    filters?: { team_name?: string; status?: string }
  ) {
    try {
      // First, get all projects for the company
      let query = db
        .from('projects')
        .select('*')
        .eq('company_id', companyId);

      // Apply filters
      if (filters?.team_name) {
        query = query.eq('team_name', filters.team_name);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data: allProjects, error: projectsError } = await query.order('created_at', { ascending: false });
      
      if (projectsError) {
        logger.error('Failed to fetch projects', { error: projectsError, companyId, userId });
        throw new AppError(`Failed to fetch projects: ${projectsError.message}`, 500);
      }

      // Get projects where user is a member
      const { data: memberProjects, error: membersError } = await db
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      if (membersError) {
        logger.warn('Failed to fetch project memberships', { error: membersError, userId });
      }

      const memberProjectIds = (memberProjects || []).map((mp: any) => mp.project_id);

      // Filter projects: user is owner OR member
      const userProjects = (allProjects || []).filter((project: any) => 
        project.owner_id === userId || memberProjectIds.includes(project.id)
      );

      return userProjects;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get user projects error', { error, userId, companyId });
      throw new AppError('Failed to fetch projects', 500);
    }
  }

  static async getProjectById(projectId: string, companyId: string) {
    try {
      // Filter by company_id for multi-tenancy
      const { data, error } = await db
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Project not found or access denied', 404);
        }
        logger.error('Failed to fetch project', { error, projectId, companyId });
        throw new AppError(`Failed to fetch project: ${error.message}`, 500);
      }

      if (!data) {
        throw new AppError('Project not found or access denied', 404);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get project by ID error', { error, projectId, companyId });
      throw new AppError('Failed to fetch project', 500);
    }
  }
}