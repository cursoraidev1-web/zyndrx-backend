import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import { PRICING_LIMITS, PlanType } from '../../config/pricing';
import { EmailService } from '../../utils/email.service';
import logger from '../../utils/logger';

const db = supabase as SupabaseClient<Database>;

export class TeamService {
  
  static async inviteUser(projectId: string, email: string, role: string, invitedBy: string) {
    const { data: project } = await db.from('projects').select('owner_id').eq('id', projectId).single();
    if (!project) throw new Error('Project not found');

    // FIX: Cast 'project' to 'any' to access 'owner_id'
    const ownerId = (project as any).owner_id;

    const { data: userData } = await db.from('users').select('plan').eq('id', ownerId).single();
    
    // FIX: Cast 'userData' to 'any' to access 'plan'
    const plan = ((userData as any)?.plan as PlanType) || 'free';
    const limits = PRICING_LIMITS[plan];

    const { count } = await db
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    
    const currentCount = count || 0;

    if (currentCount >= limits.maxMembers) {
      throw new Error(`Member limit reached. The ${plan} plan allows a maximum of ${limits.maxMembers} members.`);
    }

    const targetUserId = await this.getUserIdByEmail(email);
    if (targetUserId) {
        const { data: existingMember } = await db
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .single();

        if (existingMember) throw new Error('User is already a member of this project');
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

    if (error) throw new Error(error.message);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/accept-invite?token=${token}`;

    // Send invitation email via EmailService
    try {
      const subject = 'Join your team on Zyndrx';
      const html = `
        <h2>Project Invitation</h2>
        <p>You have been invited to join a project on Zyndrx.</p>
        <p><a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
        <p>This link expires in 7 days.</p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${inviteLink}</p>
      `;
      
      await EmailService.sendEmail(email, subject, html);
      logger.info('Invitation email sent successfully', { email });
    } catch (emailError: any) {
      logger.error('Failed to send invitation email', { email, error: emailError?.message });
      // Don't fail the invite if email fails
    }

    return { invite, link: inviteLink };
  }

  static async acceptInvite(token: string, userId: string) {
    const { data: invite, error: findError } = await (db.from('project_invites') as any)
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (findError || !invite) throw new Error('Invite not found or expired');

    const { error: memberError } = await (db.from('project_members') as any).insert({
      project_id: invite.project_id,
      user_id: userId,
      role: invite.role,
      joined_at: new Date().toISOString()
    });

    if (memberError && !memberError.message.includes('unique constraint')) {
      throw new Error(memberError.message);
    }

    await (db.from('project_invites') as any)
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    return { success: true, project_id: invite.project_id };
  }

  static async getMembers(projectId: string) {
    const { data, error } = await db
      .from('project_members')
      .select(`
        *,
        user:users!project_members_user_id_fkey(id, full_name, email, avatar_url, role)
      `)
      .eq('project_id', projectId);

    if (error) throw new Error(error.message);
    return data;
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
      // Insert team first
      const { data: team, error } = await (db.from('teams') as any)
        .insert({
          company_id: data.company_id,
          name: data.name,
          description: data.description || null,
          team_lead_id: data.team_lead_id || null,
          created_by: data.created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Team name already exists in this company');
        }
        logger.error('Create team database error', { error, data });
        throw new Error(error.message || 'Failed to create team');
      }

      // Fetch related data separately if needed
      let teamWithRelations: any = { ...team };
      
      if ((team as any).team_lead_id) {
        const { data: teamLead } = await (db.from('users') as any)
          .select('id, full_name, avatar_url, email')
          .eq('id', (team as any).team_lead_id)
          .single();
        teamWithRelations.team_lead = teamLead;
      }

      if ((team as any).created_by) {
        const { data: creator } = await (db.from('users') as any)
          .select('id, full_name, avatar_url')
          .eq('id', (team as any).created_by)
          .single();
        teamWithRelations.creator = creator;
      }

      return teamWithRelations;
    } catch (error: any) {
      logger.error('Create team error', { error: error.message || error, data });
      throw error;
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

      if (error) throw new Error(error.message);
      return data || [];
    } catch (error) {
      logger.error('Get teams error', { error, companyId });
      throw error;
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
        throw new Error('Team not found or access denied');
      }

      return data;
    } catch (error) {
      logger.error('Get team error', { error, teamId });
      throw error;
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
          throw new Error('Team name already exists in this company');
        }
        throw new Error(error.message);
      }

      if (!team) {
        throw new Error('Team not found');
      }

      return team;
    } catch (error) {
      logger.error('Update team error', { error, teamId, updates });
      throw error;
    }
  }

  static async deleteTeam(teamId: string, companyId: string) {
    try {
      const { error } = await (db.from('teams') as any)
        .delete()
        .eq('id', teamId)
        .eq('company_id', companyId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Delete team error', { error, teamId });
      throw error;
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

      if (error) throw new Error(error.message);
      return data || [];
    } catch (error) {
      logger.error('Get team members error', { error, teamId });
      throw error;
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
          throw new Error('User is already a member of this team');
        }
        throw new Error(error.message);
      }

      return member;
    } catch (error) {
      logger.error('Add team member error', { error, teamId, userId });
      throw error;
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
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Remove team member error', { error, teamId, memberUserId });
      throw error;
    }
  }
}