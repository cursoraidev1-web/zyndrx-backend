import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { AppError } from '../../middleware/error.middleware';
import { EmailService } from '../../utils/email.service';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

// Local interface to kill the 'never' type errors
interface UserRecord { email: string; full_name: string; }

export class ProjectService {
  
  /**
   * Create project and notify owner
   */
  static async createProject(data: any) {
    try {
      if (!data.company_id) throw new AppError('Company ID is required', 400);

      // 1. Check Plan Limits
      const limitCheck = await SubscriptionService.checkLimit(data.company_id, 'project');
      if (!limitCheck.allowed) {
        throw new AppError(limitCheck.message || 'Plan limit reached', 403);
      }

      // 2. Insert Project
      const { data: project, error } = await (db.from('projects') as any)
        .insert({
          ...data,
          status: 'active',
          company_id: data.company_id 
        })
        .select()
        .single();

      if (error || !project) {
        logger.error('Failed to create project', { error, data });
        throw new AppError(`Failed to create project: ${error?.message}`, 500);
      }

      // 3. Notify Owner (Fire and forget)
      if (data.owner_id) {
        this.sendProjectNotification(project, data.owner_id);
      }

      return project;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create project error', { error, data });
      throw new AppError('Failed to create project', 500);
    }
  }

  /**
   * Internal helper for project notifications
   */
  private static async sendProjectNotification(project: any, ownerId: string) {
    try {
      const { data: ownerFetch } = await db
        .from('users')
        .select('email, full_name')
        .eq('id', ownerId)
        .single();
      
      const ownerData = ownerFetch as unknown as UserRecord;

      if (ownerData?.email) {
        await EmailService.sendProjectCreatedEmail(
          ownerData.email, 
          ownerData.full_name, 
          project.name, 
          project.id
        );
      }
    } catch (err) {
      logger.warn('Project notification email failed', err);
    }
  }

  static async getUserProjects(userId: string, companyId: string, filters?: { team_name?: string; status?: string }) {
    let query = db.from('projects').select('*').eq('company_id', companyId);

    if (filters?.team_name) query = query.eq('team_name', filters.team_name);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data: allProjects, error: projectsError } = await query.order('created_at', { ascending: false });
    
    if (projectsError) throw new AppError('Failed to fetch projects', 500);

    const { data: memberProjects } = await db
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    const memberProjectIds = (memberProjects || []).map((mp: any) => mp.project_id);

    return (allProjects || []).filter((p: any) => 
      p.owner_id === userId || memberProjectIds.includes(p.id)
    );
  }

  static async getProjectById(projectId: string, companyId: string) {
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', companyId)
      .single();

    if (error || !data) throw new AppError('Project not found or access denied', 404);
    return data;
  }

  static async updateProject(projectId: string, companyId: string, updates: any) {
    const { data: project, error } = await (db.from('projects') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error || !project) throw new AppError('Failed to update project', 500);
    return project;
  }

  static async deleteProject(projectId: string, companyId: string) {
    const { error } = await db.from('projects').delete().eq('id', projectId).eq('company_id', companyId);
    if (error) throw new AppError('Failed to delete project', 500);
  }
  static async getProjectMembers(projectId: string, companyId: string) {
    await this.getProjectById(projectId, companyId);
    const { data, error } = await db.from('project_members')
      .select(`*, users!project_members_user_id_fkey (id, full_name, email, avatar_url)`)
      .eq('project_id', projectId);
    if (error) throw new AppError('Failed to fetch members', 500);
    return data || [];
  }

  static async removeProjectMember(projectId: string, companyId: string, userId: string) {
    await this.getProjectById(projectId, companyId);
    const { error } = await db.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
    if (error) throw new AppError('Failed to remove member', 500);
  }

  static async addProjectMember(projectId: string, companyId: string, userId: string, role: string) {
    await this.getProjectById(projectId, companyId);

    const { data: member, error } = await (db.from('project_members') as any)
      .insert({ project_id: projectId, user_id: userId, role: role || 'developer' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError('User is already a member', 409);
      throw new AppError('Failed to add project member', 500);
    }
    return member;
  }
}