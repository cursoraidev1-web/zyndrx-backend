import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import EmailService from '../../utils/email.service';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export interface CreateCompanyData {
  name: string;
  description?: string;
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
   * Check if a user has admin privileges (admin or owner role)
   */
  private static isAdminOrOwner(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'owner';
  }
  /**
   * Create a new company and add user as admin
   */
  static async createCompany(data: CreateCompanyData) {
    try {
      // Validate company name
      if (!data.name || !data.name.trim()) {
        throw new AppError('Company name is required. Please provide a valid company name.', 400);
      }

      const trimmedName = data.name.trim();

      // Check if company name already exists (case-insensitive)
      const { data: existingCompany } = await db
        .from('companies')
        .select('id, name')
        .ilike('name', trimmedName)
        .single();

      if (existingCompany) {
        throw new AppError(
          'A company with this name already exists. Please choose a different name.',
          409
        );
      }

      // Generate unique slug
      let slug = await this.generateUniqueSlug(trimmedName);
      let company = null;

      // Create company with retry logic for duplicate slugs
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        const { data: companyData, error: companyError } = await (db.from('companies') as any)
          .insert({
            name: trimmedName,
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
                companyName: trimmedName,
                attempts
              });
              throw new AppError(
                'Unable to create company. A company with a similar name may already exist. Please try a different company name.',
                409
              );
            }
            logger.warn('Duplicate slug detected, generating new unique slug', {
              originalSlug: slug,
              companyName: trimmedName,
              attempt: attempts
            });
            // Generate a new unique slug and retry
            slug = await this.generateUniqueSlug(trimmedName, true);
            continue;
          } else {
            // Provide user-friendly error messages with better error detection
            let userMessage = 'Failed to create company. Please try again.';
            
            // Log the full error for debugging
            logger.error('Company creation database error', {
              error: companyError,
              code: companyError.code,
              message: companyError.message,
              details: companyError.details,
              hint: companyError.hint,
              companyName: data.name,
              slug: slug,
              userId: data.userId
            });
            
            if (companyError.code === '23505') {
              // Generic unique constraint violation
              userMessage = 'A company with this name or identifier already exists. Please choose a different name.';
            } else if (companyError.code === '23503') {
              // Foreign key constraint violation
              userMessage = 'Invalid user reference. Please ensure you are logged in and try again.';
            } else if (companyError.code === '23502') {
              // Not null constraint violation
              userMessage = 'Company name is required. Please provide a valid company name.';
            } else if (companyError.message?.includes('null') || companyError.message?.includes('NOT NULL')) {
              userMessage = 'Company name is required. Please provide a valid company name.';
            } else if (companyError.message?.includes('duplicate') || companyError.message?.includes('unique')) {
              userMessage = 'A company with this name already exists. Please choose a different name.';
            } else if (companyError.message) {
              // Include more context in the error message if available
              userMessage = `Failed to create company: ${companyError.message}`;
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

      // Send company creation email
      try {
        const { data: userData } = await (db.from('users') as any).select('email, full_name').eq('id', data.userId).single();
        if (userData && userData.email && userData.full_name) {
          const { EmailService } = await import('../../utils/email.service');
          await EmailService.sendCompanyCreatedEmail(userData.email, userData.full_name, company.name);
        }
      } catch (emailError) {
        logger.error('Failed to send company creation email', { error: emailError, companyId: company.id });
        // Don't fail company creation if email fails
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
   * Invite user to company (supports both existing and new users)
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
      if (!inviterMember || !CompanyService.isAdminOrOwner(inviterMember.role)) {
        throw new AppError('Only company admins or owners can invite users', 403);
      }

      // Get company info for email
      const { data: company } = await db
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      const companyData = company as any;

      // Find user by email
      const { data: user } = await db
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      const userData = user as any;

      // If user exists, add them directly
      if (userData && userData.id) {
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

        logger.info('User added to company directly', { userId: userData.id, companyId, email });
        return { ...newMember, isNewUser: false };
      }

      // User doesn't exist - create invitation
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Check for existing pending invite
      const { data: existingInvite } = await db
        .from('company_invites')
        .select('id')
        .eq('company_id', companyId)
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvite) {
        throw new AppError('An invitation has already been sent to this email', 409);
      }

      // Create invitation
      const { data: invite, error: inviteError } = await (db.from('company_invites') as any)
        .insert({
          company_id: companyId,
          email: email.trim().toLowerCase(),
          token,
          role: role || 'member',
          invited_by: inviterId,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (inviteError) throw new AppError(inviteError.message, 500);

      // Send invitation email via EmailService
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const inviteLink = `${baseUrl}/accept-company-invite?token=${token}`;

      try {
        await EmailService.sendCompanyInvitationEmail(
          email,
          companyData?.name || 'a company',
          inviteLink
        );
        logger.info('Company invitation email sent', { email, companyId });
      } catch (emailError) {
        logger.error('Failed to send invitation email', { email, error: emailError });
        // Don't fail the invitation if email fails - return the link
      }

      logger.info('Company invitation created', { email, companyId, token });
      return { invite, link: inviteLink, isNewUser: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to invite user', { error, email, companyId });
      throw new AppError('Failed to invite user', 500);
    }
  }

  /**
   * Accept company invitation (for new users during registration)
   */
  static async acceptCompanyInvitation(token: string, userId: string, email: string) {
    try {
      // Find invitation
      const { data: invite, error: inviteError } = await db
        .from('company_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        throw new AppError('Invalid or expired invitation token', 400);
      }

      const inviteData = invite as any;

      // Verify email matches
      if (inviteData.email.toLowerCase() !== email.toLowerCase()) {
        throw new AppError('Email does not match invitation', 400);
      }

      // Get company details
      const { data: company } = await db
        .from('companies')
        .select('*')
        .eq('id', inviteData.company_id)
        .single();

      if (!company) {
        throw new AppError('Company not found', 404);
      }

      // Add user to company
      const { data: newMember, error: memberError } = await (db.from('user_companies') as any)
        .insert({
          user_id: userId,
          company_id: inviteData.company_id,
          role: inviteData.role || 'member',
          status: 'active',
        })
        .select()
        .single();

      if (memberError) {
        // If user is already a member, that's okay - just mark invite as accepted
        if (memberError.message?.includes('unique constraint')) {
          logger.info('User already a member, marking invite as accepted', { userId, companyId: inviteData.company_id });
        } else {
          throw new AppError(memberError.message, 500);
        }
      }

      // Mark invitation as accepted
      await (db.from('company_invites') as any)
        .update({ status: 'accepted' })
        .eq('id', inviteData.id);

      logger.info('Company invitation accepted', { userId, companyId: inviteData.company_id, email });
      return { company, member: newMember };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to accept company invitation', { error, token, userId, email });
      throw new AppError('Failed to accept invitation', 500);
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
      if (!member || !CompanyService.isAdminOrOwner(member.role)) {
        throw new AppError('Only company admins or owners can update member roles', 403);
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
      if (!member || !CompanyService.isAdminOrOwner(member.role)) {
        throw new AppError('Only company admins or owners can remove members', 403);
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

