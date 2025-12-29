import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend'; 
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { PRICING_LIMITS, PlanType } from '../../config/pricing';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export class TeamService {
  
  static async inviteUser(projectId: string, email: string, role: string, invitedBy: string, companyId: string) {
    try {
      // Verify project belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('owner_id, company_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        logger.error('Project not found', { projectId, error: projectError });
        throw new AppError('Project not found', 404);
      }

      const projectCompanyId = (project as any).company_id;
      if (projectCompanyId !== companyId) {
        throw new AppError('Project does not belong to your company', 403);
      }

      const ownerId = (project as any).owner_id;

      const { data: userData } = await db.from('users').select('plan').eq('id', ownerId).single();
      
      const plan = ((userData as any)?.plan as PlanType) || 'free';
      const limits = PRICING_LIMITS[plan];

      const { count } = await db
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      
      const currentCount = count || 0;

      if (currentCount >= limits.maxMembers) {
        throw new AppError(`Member limit reached. The ${plan} plan allows a maximum of ${limits.maxMembers} members.`, 403);
      }

      const targetUserId = await this.getUserIdByEmail(email);
      if (targetUserId) {
          const { data: existingMember } = await db
          .from('project_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', targetUserId)
          .single();

          if (existingMember) {
            throw new AppError('User is already a member of this project', 409);
          }
      }

      const token = crypto.randomBytes(32).toString('hex');

      const { data: invite, error } = await (db.from('project_invites') as any)
        .insert({
          project_id: projectId,
          email,
          token,
          role,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create project invite', { error: error.message, projectId, email });
        throw new AppError(`Failed to create invite: ${error.message}`, 500);
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const inviteLink = `${baseUrl}/accept-invite?token=${token}`;

      if (resend) {
        try {
          await resend.emails.send({
            from: 'Zyndrx <team@zyndrx.com>', 
            to: email,
            subject: 'Join your team on Zyndrx',
            html: `
              <p>You have been invited to join a project on Zyndrx.</p>
              <p><a href="${inviteLink}"><strong>Click here to accept invite</strong></a></p>
              <p>This link expires in 7 days.</p>
            `
          });
          logger.info('Email sent successfully', { email });
        } catch (emailError) {
          logger.error('Failed to send email', { email, error: emailError });
        }
      } else {
        logger.info('Email mock (no API key)', { email, inviteLink });
      }

      return { invite, link: inviteLink };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Invite user error', { error, projectId, email });
      throw new AppError('Failed to invite user', 500);
    }
  }

  static async acceptInvite(token: string, userId: string) {
    try {
      const { data: invite, error: findError } = await (db.from('project_invites') as any)
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (findError || !invite) {
        throw new AppError('Invite not found or expired', 404);
      }

      const { error: memberError } = await (db.from('project_members') as any).insert({
        project_id: invite.project_id,
        user_id: userId,
        role: invite.role,
        joined_at: new Date().toISOString()
      });

      if (memberError && !memberError.message.includes('unique constraint')) {
        logger.error('Failed to add project member', { error: memberError.message, userId, projectId: invite.project_id });
        throw new AppError(`Failed to add member: ${memberError.message}`, 500);
      }

      await (db.from('project_invites') as any)
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      return { success: true, project_id: invite.project_id };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Accept invite error', { error, token, userId });
      throw new AppError('Failed to accept invite', 500);
    }
  }

  static async getMembers(projectId: string, companyId: string) {
    try {
      // Verify project belongs to company
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('company_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        logger.error('Project not found', { projectId, error: projectError });
        throw new AppError('Project not found', 404);
      }

      const projectCompanyId = (project as any).company_id;
      if (projectCompanyId !== companyId) {
        throw new AppError('Project does not belong to your company', 403);
      }

      const { data, error } = await db
        .from('project_members')
        .select(`
          *,
          user:users!project_members_user_id_fkey(id, full_name, email, avatar_url, role)
        `)
        .eq('project_id', projectId);

      if (error) {
        logger.error('Failed to fetch project members', { error: error.message, projectId });
        throw new AppError(`Failed to fetch members: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get members error', { error, projectId });
      throw new AppError('Failed to fetch members', 500);
    }
  }

  private static async getUserIdByEmail(email: string) {
    const { data } = await db.from('users').select('id').eq('email', email).single();
    return (data as any)?.id;
  }

  // Teams CRUD operations
  static async createTeam(data: {
    company_id: string;
    name: string;
    description?: string;
    team_lead_id?: string;
    created_by: string;
  }) {
    try {
      const { data: team, error } = await (db.from('teams') as any)
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          team_lead:users!teams_team_lead_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          creator:users!teams_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new AppError('Team name already exists in this company', 409);
        }
        logger.error('Failed to create team', { error: error.message, data });
        throw new AppError(`Failed to create team: ${error.message}`, 500);
      }

      return team;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create team error', { error, data });
      throw new AppError('Failed to create team', 500);
    }
  }

  static async getTeams(companyId: string) {
    try {
      const { data, error } = await db
        .from('teams')
        .select(`
          *,
          team_lead:users!teams_team_lead_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          creator:users!teams_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch teams', { error: error.message, companyId });
        throw new AppError(`Failed to fetch teams: ${error.message}`, 500);
      }
      return data || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get teams error', { error, companyId });
      throw new AppError('Failed to fetch teams', 500);
    }
  }

  static async getTeamById(teamId: string, companyId: string) {
    try {
      const { data, error } = await db
        .from('teams')
        .select(`
          *,
          team_lead:users!teams_team_lead_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          creator:users!teams_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', teamId)
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        throw new AppError('Team not found or access denied', 404);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get team error', { error, teamId });
      throw new AppError('Failed to fetch team', 500);
    }
  }

  static async updateTeam(teamId: string, companyId: string, updates: any) {
    try {
      const updatePayload: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data: team, error } = await (db.from('teams') as any)
        .update(updatePayload)
        .eq('id', teamId)
        .eq('company_id', companyId)
        .select(`
          *,
          team_lead:users!teams_team_lead_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          creator:users!teams_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new AppError('Team name already exists in this company', 409);
        }
        logger.error('Failed to update team', { error: error.message, teamId });
        throw new AppError(`Failed to update team: ${error.message}`, 500);
      }

      if (!team) {
        throw new AppError('Team not found or access denied', 404);
      }

      return team;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update team error', { error, teamId, updates });
      throw new AppError('Failed to update team', 500);
    }
  }

  static async deleteTeam(teamId: string, companyId: string) {
    try {
      const { error } = await (db.from('teams') as any)
        .delete()
        .eq('id', teamId)
        .eq('company_id', companyId);

      if (error) {
        logger.error('Failed to delete team', { error: error.message, teamId });
        throw new AppError(`Failed to delete team: ${error.message}`, 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete team error', { error, teamId });
      throw new AppError('Failed to delete team', 500);
    }
  }

  static async getTeamMembers(teamId: string, companyId: string) {
    try {
      // Verify team exists and belongs to company
      await this.getTeamById(teamId, companyId);

      const { data, error } = await db
        .from('team_members')
        .select(`
          *,
          user:users!team_members_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        `)
        .eq('team_id', teamId);

      if (error) {
        logger.error('Failed to fetch team members', { error: error.message, teamId });
        throw new AppError(`Failed to fetch team members: ${error.message}`, 500);
      }
      return data || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get team members error', { error, teamId });
      throw new AppError('Failed to fetch team members', 500);
    }
  }

  static async addTeamMember(teamId: string, companyId: string, userId: string, role: string) {
    try {
      // Verify team exists
      await this.getTeamById(teamId, companyId);

      const { data: member, error } = await (db.from('team_members') as any)
        .insert({
          team_id: teamId,
          user_id: userId,
          role: role || 'developer',
          joined_at: new Date().toISOString(),
        })
        .select(`
          *,
          user:users!team_members_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new AppError('User is already a member of this team', 409);
        }
        logger.error('Failed to add team member', { error: error.message, teamId, userId });
        throw new AppError(`Failed to add team member: ${error.message}`, 500);
      }

      return member;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Add team member error', { error, teamId, userId });
      throw new AppError('Failed to add team member', 500);
    }
  }

  static async removeTeamMember(teamId: string, companyId: string, memberUserId: string) {
    try {
      // Verify team exists
      await this.getTeamById(teamId, companyId);

      const { error } = await (db.from('team_members') as any)
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', memberUserId);

      if (error) {
        logger.error('Failed to remove team member', { error: error.message, teamId, memberUserId });
        throw new AppError(`Failed to remove team member: ${error.message}`, 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Remove team member error', { error, teamId, memberUserId });
      throw new AppError('Failed to remove team member', 500);
    }
  }
}