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
      // Generate unique slug
      let slug = await this.generateUniqueSlug(data.name);
      let company = null;

      // Create company with retry logic for duplicate slugs
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        const { data: companyData, error: companyError } = await (db.from('companies') as any)
          .insert({
            name: data.name,
            slug: slug,
          })
          .select()
          .single();

        if (companyError) {
          // Handle duplicate slug error specifically
          if (companyError.code === '23505' && companyError.message?.includes('slug')) {
            attempts++;
            if (attempts >= maxAttempts) {
              logger.error('Failed to create company after multiple slug attempts', {
                companyName: data.name,
                attempts
              });
              throw new AppError(
                'Unable to create company. A company with a similar name may already exist. Please try a different company name.',
                409
              );
            }
            logger.warn('Duplicate slug detected, generating new unique slug', {
              originalSlug: slug,
              companyName: data.name,
              attempt: attempts
            });
            // Generate a new unique slug and retry
            slug = await this.generateUniqueSlug(data.name, true);
            continue;
          } else {
            // Provide user-friendly error messages
            let userMessage = 'Failed to create company. Please try again.';
            
            if (companyError.code === '23505') {
              // Generic unique constraint violation
              userMessage = 'A company with this name or identifier already exists. Please choose a different name.';
            } else if (companyError.message?.includes('null') || companyError.message?.includes('NOT NULL')) {
              userMessage = 'Company name is required. Please provide a valid company name.';
            } else if (companyError.message) {
              // Log technical error but show user-friendly message
              logger.error('Company creation database error', {
                error: companyError,
                code: companyError.code,
                message: companyError.message,
                companyName: data.name
              });
            }
            
            throw new AppError(userMessage, 500);
          }
        }

        if (!companyData) {
          throw new AppError('Failed to create company. Please try again.', 500);
        }

        company = companyData;
        break; // Success, exit loop
      }

      if (!company) {
        throw new AppError(
          'Unable to create company after multiple attempts. A company with a similar name may already exist. Please try a different company name.',
          500
        );
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
        logger.error('Failed to add user to company, rolling back company creation', {
          error: memberError,
          companyId: company.id,
          userId: data.userId
        });
        throw new AppError(
          'Company was created but we couldn\'t add you as a member. Please contact support for assistance.',
          500
        );
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
      logger.error('Company creation error', { 
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        companyName: data.name,
        userId: data.userId
      });
      throw new AppError(
        'An unexpected error occurred while creating your company. Please try again or contact support if the problem persists.',
        500
      );
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

  /**
   * Generate a unique slug by checking for existing slugs and appending a suffix if needed
   */
  private static async generateUniqueSlug(name: string, forceUnique: boolean = false): Promise<string> {
    const baseSlug = this.generateSlug(name);
    
    // If not forcing uniqueness, check if base slug exists
    if (!forceUnique) {
      const { data: existing } = await db
        .from('companies')
        .select('id')
        .eq('slug', baseSlug)
        .single();
      
      // If slug doesn't exist, return it
      if (!existing) {
        return baseSlug;
      }
    }
    
    // Slug exists or forceUnique is true, append a random suffix
    const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 random chars
    let uniqueSlug = `${baseSlug}-${randomSuffix}`;
    
    // Ensure the new slug is also unique (retry if needed)
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const { data: existing } = await db
        .from('companies')
        .select('id')
        .eq('slug', uniqueSlug)
        .single();
      
      if (!existing) {
        return uniqueSlug;
      }
      
      // Generate new suffix and try again
      const newSuffix = Math.random().toString(36).substring(2, 8);
      uniqueSlug = `${baseSlug}-${newSuffix}`;
      attempts++;
    }
    
    // Fallback: use timestamp if all random attempts fail
    const timestampSuffix = Date.now().toString(36);
    return `${baseSlug}-${timestampSuffix}`;
  }
}

