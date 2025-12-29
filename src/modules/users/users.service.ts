import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class UserService {
  
  /**
   * Get all users in a company
   */
  static async getCompanyUsers(companyId: string) {
    try {
      // Get all users that belong to the company
      const { data: memberships, error: memberError } = await db
        .from('user_companies')
        .select(`
          user_id,
          role,
          status,
          joined_at,
          users!user_companies_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url,
            role,
            created_at
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (memberError) {
        logger.error('Failed to fetch company users', { error: memberError.message, companyId });
        throw new AppError(`Failed to fetch company users: ${memberError.message}`, 500);
      }

      // Transform the data to a cleaner format
      const users = (memberships || []).map((membership: any) => ({
        id: membership.users.id,
        email: membership.users.email,
        full_name: membership.users.full_name,
        avatar_url: membership.users.avatar_url,
        role: membership.users.role,
        company_role: membership.role,
        joined_at: membership.joined_at,
        created_at: membership.users.created_at,
      }));

      return users;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get company users error', { error, companyId });
      throw new AppError('Failed to fetch company users', 500);
    }
  }

  /**
   * Get a single user by ID (within company context)
   */
  static async getUserById(userId: string, companyId: string) {
    try {
      // Verify user is member of company
      const { data: membership, error: memberError } = await db
        .from('user_companies')
        .select(`
          user_id,
          role,
          status,
          joined_at,
          users!user_companies_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url,
            role,
            created_at,
            two_factor_enabled
          )
        `)
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (memberError || !membership) {
        throw new AppError('User not found in company or access denied', 404);
      }

      const member = membership as any;

      return {
        id: member.users.id,
        email: member.users.email,
        full_name: member.users.full_name,
        avatar_url: member.users.avatar_url,
        role: member.users.role,
        company_role: member.role,
        two_factor_enabled: member.users.two_factor_enabled,
        joined_at: member.joined_at,
        created_at: member.users.created_at,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get user by ID error', { error, userId, companyId });
      throw new AppError('Failed to fetch user', 500);
    }
  }

  /**
   * Search users in company by name or email
   */
  static async searchUsers(companyId: string, query: string) {
    try {
      // Get all company users first
      const users = await this.getCompanyUsers(companyId);

      // Filter by search query
      const searchLower = query.toLowerCase();
      const filtered = users.filter((user: any) => 
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );

      return filtered;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Search users error', { error, companyId, query });
      throw new AppError('Failed to search users', 500);
    }
  }

  /**
   * Get user statistics (for admin dashboard)
   */
  static async getUserStats(companyId: string) {
    try {
      // Get total users
      const { count: totalUsers, error: countError } = await db
        .from('user_companies')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (countError) {
        logger.error('Failed to count users', { error: countError.message, companyId });
        throw new AppError(`Failed to count users: ${countError.message}`, 500);
      }

      // Get role distribution
      const { data: memberships, error: roleError } = await db
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (roleError) {
        logger.error('Failed to fetch user roles', { error: roleError.message, companyId });
        throw new AppError(`Failed to fetch user roles: ${roleError.message}`, 500);
      }

      const roleDistribution: Record<string, number> = {};
      (memberships || []).forEach((m: any) => {
        const role = m.role || 'member';
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });

      return {
        total: totalUsers || 0,
        roleDistribution,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get user stats error', { error, companyId });
      throw new AppError('Failed to fetch user statistics', 500);
    }
  }
}
