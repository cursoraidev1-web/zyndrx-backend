import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { EmailService } from '../../utils/email.service';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import logger from '../../utils/logger';

const db = supabaseAdmin;

interface UserRecord { email: string; full_name: string; }

export class ProjectService {
  
  static async createProject(data: any) {
    try {
      if (!data.company_id) throw new AppError('Company ID is required', 400);

      const limitCheck = await SubscriptionService.checkLimit(data.company_id, 'project');
      if (!limitCheck.allowed) throw new AppError(limitCheck.message || 'Limit reached', 403);

      const { data: project, error } = await (db.from('projects') as any)
        .insert({ ...data, status: 'active' })
        .select()
        .single();

      if (error || !project) throw new AppError(`Failed to create project: ${error?.message}`, 500);

      if (data.owner_id) {
        this.sendProjectNotification(project, data.owner_id);
      }

      return project;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create project', 500);
    }
  }

  static async getUserProjects(userId: string, companyId: string, filters?: any) {
    try {
      let query = db.from('projects').select('*').eq('company_id', companyId);
      if (filters?.status) query = query.eq('status', filters.status);
      
      const { data: allProjects, error } = await query;
      if (error) throw new AppError(error.message, 500);
      
      const { data: memberProjects } = await db.from('project_members').select('project_id').eq('user_id', userId);
      const ids = (memberProjects || []).map((m: any) => m.project_id);
      
      return (allProjects || []).filter((p: any) => p.owner_id === userId || ids.includes(p.id));
    } catch (error) {
      throw new AppError('Failed to fetch user projects', 500);
    }
  }

  static async getProjectById(projectId: string, companyId: string) {
    try {
      const { data, error } = await db.from('projects').select('*').eq('id', projectId).eq('company_id', companyId).single();
      if (error || !data) throw new AppError('Project not found', 404);
      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch project', 500);
    }
  }

  static async updateProject(id: string, companyId: string, updates: any) {
    try {
      const { data, error } = await (db.from('projects') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data;
    } catch (error) {
      throw new AppError('Failed to update project', 500);
    }
  }

  static async deleteProject(id: string, companyId: string) {
    try {
      const { error } = await db.from('projects').delete().eq('id', id).eq('company_id', companyId);
      if (error) throw new AppError('Delete failed', 500);
    } catch (error) {
      throw new AppError('Failed to delete project', 500);
    }
  }

  static async getProjectMembers(projectId: string, companyId: string) {
    try {
      await this.getProjectById(projectId, companyId);
      const { data: members, error } = await db.from('project_members')
        .select(`*, users!project_members_user_id_fkey (id, full_name, email, avatar_url)`)
        .eq('project_id', projectId);
      
      if (error) throw new AppError('Failed to fetch members', 500);
      return members || [];
    } catch (error) {
      throw new AppError('Failed to fetch members', 500);
    }
  }

  static async addProjectMember(projectId: string, companyId: string, userId: string, role: string, inviterId: string) {
    try {
      // Fetch project first for name (cast to any for TS)
      const project = await this.getProjectById(projectId, companyId) as any;

      const { data: member, error } = await (db.from('project_members') as any)
        .insert({ project_id: projectId, user_id: userId, role })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new AppError('User is already a member', 409);
        throw new AppError(error.message, 500);
      }

      // Trigger invitation email
      this.sendInvitationNotification(projectId, userId, inviterId, project.name);

      return member;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to add member', 500);
    }
  }

  static async removeProjectMember(projectId: string, companyId: string, userId: string) {
    try {
      await this.getProjectById(projectId, companyId);
      const { error } = await db.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
      if (error) throw new AppError('Failed to remove member', 500);
    } catch (error) {
      throw new AppError('Failed to remove member', 500);
    }
  }

  private static async sendProjectNotification(project: any, ownerId: string) {
    try {
      const { data: ownerFetch } = await db.from('users').select('email, full_name').eq('id', ownerId).single();
      const ownerData = ownerFetch as unknown as UserRecord;
      if (ownerData?.email) {
        await EmailService.sendProjectCreatedEmail(ownerData.email, ownerData.full_name, project.name, project.id);
      }
    } catch (err) { logger.warn('Project notification failed', err); }
  }

  private static async sendInvitationNotification(projectId: string, inviteeId: string, inviterId: string, projectName: string) {
    try {
      const [inviteeFetch, inviterFetch] = await Promise.all([
        db.from('users').select('email, full_name').eq('id', inviteeId).single(),
        db.from('users').select('full_name').eq('id', inviterId).single()
      ]);

      const invitee = inviteeFetch.data as unknown as UserRecord;
      const inviter = inviterFetch.data as any;

      if (invitee?.email) {
        await EmailService.sendProjectInvitationEmail(
          invitee.email,
          invitee.full_name,
          projectName,
          projectId,
          inviter?.full_name || 'A team member'
        );
      }
    } catch (err) { logger.warn('Invitation email failed', err); }
  }
}