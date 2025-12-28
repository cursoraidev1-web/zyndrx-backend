import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend'; 
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import { PRICING_LIMITS, PlanType } from '../../config/pricing';
import logger from '../../utils/logger';

const db = supabase as SupabaseClient<Database>;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
}