import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';

// Use 'any' cast for specific write operations to avoid strict type conflicts with generated types
const db = supabase as SupabaseClient<Database>;

export class TeamService {
  
  // 1. Send an Invite
  static async inviteUser(projectId: string, email: string, role: string, invitedBy: string) {
    // Check if user is already a member first
    const { data: existingMember } = await db
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', (await this.getUserIdByEmail(email)) || '') // Helper check
      .single();

    if (existingMember) {
      throw new Error('User is already a member of this project');
    }

    // Generate a random secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Save to 'project_invites'
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

    // MOCK EMAIL LOG (Replace with SendGrid/Resend in production)
    const inviteLink = `http://localhost:3000/accept-invite?token=${token}`;
    console.log(`\n📧 [EMAIL MOCK] To: ${email}`);
    console.log(`Subject: You have been invited to a project!`);
    console.log(`Link: ${inviteLink}\n`);

    return { invite, link: inviteLink };
  }

  // 2. Accept an Invite
  static async acceptInvite(token: string, userId: string) {
    // Find valid invite
    const { data: invite, error: findError } = await (db.from('project_invites') as any)
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString()) // Ensure not expired
      .single();

    if (findError || !invite) throw new Error('Invite not found or expired');

    // Add to 'project_members' (Using your existing schema structure)
    const { error: memberError } = await (db.from('project_members') as any).insert({
      project_id: invite.project_id,
      user_id: userId,
      role: invite.role,
      joined_at: new Date().toISOString()
    });

    if (memberError) {
      // Handle race condition where user clicked twice
      if (!memberError.message.includes('unique constraint')) throw new Error(memberError.message);
    }

    // Mark invite as accepted so it can't be used again
    await (db.from('project_invites') as any)
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    return { success: true, project_id: invite.project_id };
  }

  // 3. List Members
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
    
    // FIX: Cast 'data' to 'any' so we can access .id without error
    return (data as any)?.id;
  }
}