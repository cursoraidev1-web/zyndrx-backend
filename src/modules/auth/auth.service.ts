import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../config/supabase';
import { config } from '../../config';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { CompanyService } from '../companies/companies.service';
import { SecurityService } from '../../services/security.service';
import { OAuthService } from './oauth.service'; 

// Define types locally
export type CompanyRole = 'owner' | 'member' | 'guest';
export type GlobalRole = 'user' | 'admin'; 

// Type helpers for Supabase queries
type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  companyName?: string;
  invitationToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  token: string;
  companyId?: string;
  companyRole?: CompanyRole; 
  companies?: Array<{
    id: string;
    name: string;
    role: CompanyRole;
  }>;
  currentCompany?: {
    id: string;
    name: string;
  };
}

export interface TwoFactorResponse {
  require2fa: true;
  email: string;
}

export class AuthService {
  
  // ===========================================================================
  // 1. REGISTER NEW USER
  // ===========================================================================
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      logger.info('Starting user registration', { email: data.email });

      // 1. Database Connection Check
      const { error: healthError } = await supabaseAdmin.from('users').select('count').limit(1);
      if (healthError && healthError.code !== 'PGRST116') {
        logger.error('Database connection check failed', { error: healthError });
        throw new AppError('Database connection failed', 500);
      }

      // 2. Check Existing User
      const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', data.email).single();
      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // 3. Create Auth User (Role is hardcoded to 'user')
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false,
        user_metadata: { full_name: data.fullName, role: 'user' }, 
      });

      if (authError || !authData.user) {
        throw new AppError(`Failed to create user: ${authError?.message}`, 500);
      }

      // 4. Ensure Profile Exists
      const user = await this.ensureUserProfile(authData.user.id, data.email, data.fullName);

      // 5. Handle Company (Create or Join)
      let company: any = null;
      let myRole: CompanyRole = 'member'; 

      if (data.invitationToken) {
        // A. Join existing team via invite
        logger.info('Processing company invitation', { email: data.email });
        const invitationResult = await CompanyService.acceptCompanyInvitation(
          data.invitationToken,
          user.id,
          data.email
        );
        
        if (!invitationResult || !(invitationResult as any).company) throw new AppError('Invalid invitation', 400);
        
        company = (invitationResult as any).company;
        // FIX 1: Safely access role from the member object using 'as any' to avoid TS error
        myRole = ((invitationResult as any).member?.role as CompanyRole) || 'member';
      } else {
        // B. Create new team
        if (!data.companyName) throw new AppError('Company name is required', 400);
        
        // Note: Your SQL Trigger 'on_company_created' will automatically make this user the 'owner'.
        company = await CompanyService.createCompany({
          name: data.companyName,
          userId: user.id,
        });
        myRole = 'owner'; 
      }

      // 6. Finalize Response
      return this.finalizeLogin(user, company.id);

    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Registration failed', { error });
      throw new AppError('Registration failed', 500);
    }
  }

  // ===========================================================================
  // 2. LOGIN USER
  // ===========================================================================
  async login(data: LoginData, ipAddress?: string, userAgent?: string): Promise<AuthResponse | TwoFactorResponse> {
    try {
      // 1. Check Lockout Status
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, locked_until')
        .eq('email', data.email)
        .single() as any;

      if (existingUser) {
        const isLocked = await SecurityService.isAccountLocked(existingUser.id);
        if (isLocked) {
           throw new AppError('Account is locked. Please try again later.', 423);
        }
      }

      // 2. Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.user) {
        await SecurityService.recordFailedLogin(data.email, ipAddress, userAgent);
        throw new AppError('Invalid email or password', 401);
      }

      // 3. Get Full Profile
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, avatar_url, is_active, is_two_factor_enabled')
        .eq('id', authData.user.id)
        .single() as any;

      if (!user || !user.is_active) throw new AppError('Account inactive', 403);
      
      // 4. Success Logging
      await SecurityService.resetFailedAttempts(user.id);
      await (supabaseAdmin.from('users') as any).update({ last_login: new Date().toISOString() }).eq('id', user.id);

      // 5. 2FA Check
      if (user.is_two_factor_enabled) {
        return { require2fa: true, email: user.email };
      }

      return this.finalizeLogin(user);

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Login failed', 500);
    }
  }

  // ===========================================================================
  // 3. ADMIN: CREATE USER (Invite to Company)
  // ===========================================================================
  async createUserAsAdmin(
    adminUserId: string,
    companyId: string,
    data: { email: string; password: string; fullName: string; companyRole: CompanyRole }
  ) {
    // 1. Verify Permission: Requestor must be 'owner' of this company
    const adminRole = await this.getUserRoleInCompany(adminUserId, companyId);
    if (adminRole !== 'owner') {
      throw new AppError('Only the Team Owner can add new members', 403);
    }

    // 2. Validate Role Input
    if (!['owner', 'member', 'guest'].includes(data.companyRole)) {
        throw new AppError('Invalid role. Must be owner, member, or guest', 400);
    }

    // 3. Create Auth User
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', data.email).single();
    if (existingUser) throw new AppError('User with this email already exists', 409);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false,
        user_metadata: { full_name: data.fullName, role: 'user' },
    });

    if (authError || !authData.user) throw new AppError(`Failed to create user: ${authError?.message}`, 500);

    // 4. Ensure Profile
    const user = await this.ensureUserProfile(authData.user.id, data.email, data.fullName);

    // 5. Add to Company
    const { error: memberError } = await (supabaseAdmin.from('user_companies') as any)
        .insert({
            user_id: user.id,
            company_id: companyId,
            role: data.companyRole,
            status: 'active',
        });

    if (memberError) {
        logger.error('Failed to add user to company', { error: memberError });
        throw new AppError('User created but failed to add to company', 500);
    }

    return { 
        user: { id: user.id, email: user.email, fullName: user.full_name },
        message: 'User created and added to team successfully'
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================
private async finalizeLogin(user: any, specificCompanyId?: string): Promise<AuthResponse> {
    const companies = await CompanyService.getUserCompanies(user.id);
    
    // Force type to any[]
    const companyList = (companies || []) as any[];

    let defaultCompany = null;
    if (specificCompanyId) {
        defaultCompany = companyList.find((c: any) => c.id === specificCompanyId);
    } else {
        defaultCompany = companyList.length > 0 ? companyList[0] : null;
    }

    const activeRole = defaultCompany ? (defaultCompany.role as CompanyRole) : undefined;

    const token = this.generateToken(
      user.id, 
      user.email, 
      defaultCompany?.id,
      activeRole
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
      },
      token,
      companyId: defaultCompany?.id,
      companyRole: activeRole,
      companies: companyList.map((c: any) => ({
        id: c.id,
        name: c.name,
        role: c.role as CompanyRole,
      })),
      currentCompany: defaultCompany ? {
        id: defaultCompany.id,
        name: defaultCompany.name,
      } : undefined,
    };
  }
  private generateToken(userId: string, email: string, companyId?: string, companyRole?: CompanyRole): string {
    const payload: any = { 
        sub: userId, 
        email, 
        globalRole: 'user' 
    };
    
    if (companyId) {
      payload.companyId = companyId;
      payload.role = companyRole; 
    }
    
    return jwt.sign(payload, config.jwt.secret as string, { expiresIn: config.jwt.expiresIn as any });
  }

  private async ensureUserProfile(userId: string, email: string, fullName: string) {
      const { data: createdUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single() as any;
      
      if(createdUser) return createdUser;

      const { data: manualUser } = await (supabaseAdmin.from('users') as any).insert({
          id: userId,
          email: email,
          full_name: fullName,
          role: 'user'
      }).select().single();
      
      return manualUser;
  }

  private async getUserRoleInCompany(userId: string, companyId: string): Promise<CompanyRole | null> {
    const { data: member } = await supabaseAdmin
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();
    
    return member ? (member.role as CompanyRole) : null;
  }

  // ===========================================================================
  // EXISTING METHODS
  // ===========================================================================
  
  async getCurrentUser(userId: string) {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single() as any;

    if (error || !user) throw new AppError('User not found', 404);
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      is2FAEnabled: user.is_two_factor_enabled
    };
  }

  async updateProfile(userId: string, data: { fullName?: string; avatarUrl?: string }) {
    const updateData: UserUpdate = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

    const { data: user, error } = await ((supabaseAdmin.from('users') as any)
      .update(updateData) as any).eq('id', userId).select().single() as any;

    if (error) throw new AppError('Failed to update profile', 500);
    return user;
  }

  async generate2FASecret(userId: string) {
    const secret = speakeasy.generateSecret({ name: `Zyndrx (${userId.substring(0, 8)})` });
    await (supabaseAdmin.from('users') as any).update({ two_factor_secret: secret.base32 }).eq('id', userId);
    return { secret: secret.base32, qrCode: await QRCode.toDataURL(secret.otpauth_url!) };
  }

  async enable2FA(userId: string, token: string) {
    const { data: user } = await supabaseAdmin.from('users').select('two_factor_secret').eq('id', userId).single() as any;
    if (!user?.two_factor_secret) throw new AppError('Setup not initialized', 400);
    if (!speakeasy.totp.verify({ secret: user.two_factor_secret, encoding: 'base32', token: token })) throw new AppError('Invalid code', 400);
    await (supabaseAdmin.from('users') as any).update({ is_two_factor_enabled: true }).eq('id', userId);
    return { success: true };
  }

  async loginVerify2FA(email: string, token: string): Promise<AuthResponse> {
    const { data: user } = await supabaseAdmin.from('users').select('*').eq('email', email).single() as any;
    if (!user?.two_factor_secret) throw new AppError('2FA not enabled', 400);
    if (!speakeasy.totp.verify({ secret: user.two_factor_secret, encoding: 'base32', token: token, window: 1 })) throw new AppError('Invalid 2FA code', 401);
    return this.finalizeLogin(user);
  }

  async forgotPassword(email: string) {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: 'https://zyndrx.netlify.app/reset-password' });
    if (error) throw new AppError(error.message, 400);
    return { success: true };
  }

  async resetPassword(password: string, accessToken: string) {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) throw new AppError('Invalid token', 401);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, { password });
    if (updateError) throw new AppError('Failed to reset password', 500);
    return { success: true };
  }

  async loginWithGoogle(accessToken: string, companyName?: string): Promise<AuthResponse | TwoFactorResponse> {
      const result = await OAuthService.exchangeSupabaseSession(accessToken, companyName);
      return result; 
  }
}
