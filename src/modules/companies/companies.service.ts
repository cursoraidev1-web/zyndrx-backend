import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export interface CreateCompanyData {
  name: string;
  userId: string;
}

export interface CompanyMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  status: string;
  joinedAt: string;
}

export class CompanyService {
  /**
   * Create a new company and add user as admin
   */
  static async createCompany(data: CreateCompanyData) {
    try {
      // Create company
      const { data: company, error: companyError } = await (db.from('companies') as any)
        .insert({
          name: data.name,
          slug: this.generateSlug(data.name),
        })
        .select()
        .single();

      if (companyError || !company) {
        throw new AppError(`Failed to create company: ${companyError?.message}`, 500);
      }

      // Add user as admin
      const { error: memberError } = await (db.from('user_companies') as any)
        .insert({
          user_id: data.userId,
          company_id: company.id,
          role: 'admin',
          status: 'active',
        });

      if (memberError) {
        // Rollback: delete company if member creation fails
        await (db.from('companies') as any).delete().eq('id', company.id);
        throw new AppError(`Failed to add user to company: ${memberError.message}`, 500);
      }

      // Create default subscription (free plan with 30-day trial)
      try {
        await SubscriptionService.createDefaultSubscription(company.id);
      } catch (subscriptionError) {
        // Log but don't fail company creation if subscription creation fails
        logger.error('Failed to create subscription for company', {
          companyId: company.id,
          error: subscriptionError,
        });
      }

      return company;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Company creation error', { error });
      throw new AppError('Failed to create company', 500);
    }
  }

  /**
   * Get user's companies
   */
  static async getUserCompanies(userId: string) {
    try {
      const { data, error } = await db
        .from('user_companies')
        .select(`
          company_id,
          role,
          status,
          joined_at,
          companies (
            id,
            name,
            slug,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw new AppError(error.message, 500);

      return (data || []).map((item: any) => ({
        id: item.companies.id,
        name: item.companies.name,
        slug: item.companies.slug,
        role: item.role,
        status: item.status,
        joinedAt: item.joined_at,
        createdAt: item.companies.created_at,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch companies', 500);
    }
  }

  /**
   * Get company by ID (verify user is member)
   */
  static async getCompanyById(companyId: string, userId: string) {
    try {
      // Verify user is member
      const { data: membership } = await db
        .from('user_companies')
        .select('role, status')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        throw new AppError('Company not found or access denied', 404);
      }

      const { data: company, error } = await db
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error || !company) {
        throw new AppError('Company not found', 404);
      }

      const member = membership as any;
      const comp = company as any;
      return {
        ...comp,
        userRole: member?.role,
        userStatus: member?.status,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch company', 500);
    }
  }

  /**
   * Get company members
   */
  static async getCompanyMembers(companyId: string, userId: string): Promise<CompanyMember[]> {
    try {
      // Verify user is member
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        throw new AppError('Company not found or access denied', 404);
      }

      const { data, error } = await db
        .from('user_companies')
        .select(`
          id,
          role,
          status,
          joined_at,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', companyId);

      if (error) throw new AppError(error.message, 500);

      return (data || []).map((item: any) => ({
        id: item.users.id,
        email: item.users.email,
        fullName: item.users.full_name,
        role: item.role,
        avatarUrl: item.users.avatar_url,
        status: item.status,
        joinedAt: item.joined_at,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch company members', 500);
    }
  }

  /**
   * Invite user to company
   */
  static async inviteUser(companyId: string, email: string, role: string, inviterId: string) {
    try {
      // Verify inviter is admin
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', inviterId)
        .single();

      const inviterMember = membership as any;
      if (!inviterMember || inviterMember.role !== 'admin') {
        throw new AppError('Only company admins can invite users', 403);
      }

      // Find user by email
      const { data: user } = await db
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      const userData = user as any;
      if (!userData || !userData.id) {
        throw new AppError('User not found', 404);
      }

      // Check if already a member
      const { data: existing } = await db
        .from('user_companies')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userData.id)
        .single();

      if (existing) {
        throw new AppError('User is already a member of this company', 409);
      }

      // Add user to company
      const { data: newMember, error } = await (db.from('user_companies') as any)
        .insert({
          user_id: userData.id,
          company_id: companyId,
          role: role || 'member',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);

      return newMember;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to invite user', 500);
    }
  }

  /**
   * Update user role in company
   */
  static async updateMemberRole(
    companyId: string,
    memberUserId: string,
    newRole: string,
    updaterId: string
  ) {
    try {
      // Verify updater is admin
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', updaterId)
        .single();

      const member = membership as any;
      if (!member || member.role !== 'admin') {
        throw new AppError('Only company admins can update member roles', 403);
      }

      // Update role
      const { data, error } = await (db.from('user_companies') as any)
        .update({ role: newRole })
        .eq('company_id', companyId)
        .eq('user_id', memberUserId)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      if (!data) throw new AppError('Member not found', 404);

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update member role', 500);
    }
  }

  /**
   * Remove user from company
   */
  static async removeMember(companyId: string, memberUserId: string, removerId: string) {
    try {
      // Verify remover is admin
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', removerId)
        .single();

      const member = membership as any;
      if (!member || member.role !== 'admin') {
        throw new AppError('Only company admins can remove members', 403);
      }

      // Prevent removing yourself
      if (memberUserId === removerId) {
        throw new AppError('Cannot remove yourself from company', 400);
      }

      // Remove member
      const { error } = await (db.from('user_companies') as any)
        .delete()
        .eq('company_id', companyId)
        .eq('user_id', memberUserId);

      if (error) throw new AppError(error.message, 500);

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to remove member', 500);
    }
  }

  /**
   * Verify user is member of company
   */
  static async verifyMembership(companyId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await db
        .from('user_companies')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Switch user's active company
   */
  static async switchCompany(companyId: string, userId: string) {
    try {
      // Verify user is member of company
      const isMember = await this.verifyMembership(companyId, userId);
      if (!isMember) {
        throw new AppError('Company not found or access denied', 404);
      }

      // Get company details
      const { data: company, error } = await db
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error || !company) {
        throw new AppError('Company not found', 404);
      }

      // Get user's role in company
      const { data: membership } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();

      const member = membership as any;
      const comp = company as any;
      return {
        company: {
          id: comp.id,
          name: comp.name,
          slug: comp.slug,
        },
        userRole: member?.role || 'member',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to switch company', 500);
    }
  }

  /**
   * Generate URL-friendly slug from company name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

