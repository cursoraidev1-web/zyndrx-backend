import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../config/supabase';
import { config } from '../../config';
import { UserRole, Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import { CompanyService } from '../companies/companies.service';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { SecurityService } from '../../services/security.service';

// Type helpers for Supabase queries
type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  companyName?: string;
  role?: UserRole;
  invitationToken?: string; // For accepting company invitations
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
    role: UserRole;
    avatarUrl: string | null;
  };
  token: string;
  companyId?: string;
  companies?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  currentCompany?: {
    id: string;
    name: string;
  };
}

// Response when 2FA is required (Stop and ask for code)
export interface TwoFactorResponse {
  require2fa: true;
  email: string;
}

export class AuthService {
  
  // 1. REGISTER NEW USER
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      logger.info('Starting user registration', { email: data.email, companyName: data.companyName });

      // Check Supabase connection
      const { data: healthCheck, error: healthError } = await supabaseAdmin.from('users').select('count').limit(1);
      if (healthError && healthError.code !== 'PGRST116') {
        logger.error('Database connection check failed', { error: healthError });
        throw new AppError('Database connection failed', 500);
      }

      // Check existing user
      const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', data.email).single();
      if (existingUser) {
        logger.warn('Registration attempted with existing email', { email: data.email });
        throw new AppError('User with this email already exists', 409);
      }

      // Create Auth User (email verification required)
      logger.info('Creating auth user', { email: data.email });
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false, // Require email verification
        user_metadata: { full_name: data.fullName, role: data.role || 'developer' },
      });

      if (authError || !authData.user) {
        logger.error('Failed to create auth user', { 
          error: authError, 
          errorMessage: authError?.message,
          errorCode: authError?.code,
          email: data.email 
        });
        throw new AppError(`Failed to create user: ${authError?.message}`, 500);
      }

      logger.info('Auth user created successfully', { userId: authData.user.id, email: data.email });

      // Sync Profile - Wait for trigger to create user profile
      let user = null;
      logger.info('Checking for user profile from trigger', { userId: authData.user.id });
      const { data: createdUser, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', authData.user.id)
        .single() as any;
      
      if (profileError && profileError.code !== 'PGRST116') {
        logger.warn('Error checking for user profile', { error: profileError, userId: authData.user.id });
      }
      
      user = createdUser;

      // Fallback manual creation if trigger didn't fire
      if (!user) {
        logger.info('Trigger did not create user profile, creating manually', { userId: authData.user.id });
        const { data: manualUser, error: manualError } = await (supabaseAdmin.from('users') as any).insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.fullName,
          role: data.role || 'developer'
        }).select().single();
        
        if (manualError || !manualUser) {
          logger.error('Failed to create user profile manually', {
            error: manualError,
            errorMessage: manualError?.message,
            errorCode: manualError?.code,
            errorDetails: manualError?.details,
            errorHint: manualError?.hint,
            userId: authData.user.id,
            email: data.email
          });
          // Clean up auth user if profile creation fails
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            logger.info('Cleaned up auth user after profile creation failure', { userId: authData.user.id });
          } catch (cleanupError) {
            logger.error('Failed to clean up auth user', { error: cleanupError, userId: authData.user.id });
          }
          throw new AppError(`Failed to create user profile: ${manualError?.message || 'Unknown error'}`, 500);
        }
        
        user = manualUser;
        logger.info('User profile created manually', { userId: user.id });
      } else {
        logger.info('User profile found from trigger', { userId: user.id });
      }

      // Validate user exists before proceeding
      if (!user || !user.id) {
        logger.error('User validation failed - user is null or missing id', { user, userId: authData.user.id });
        throw new AppError('User profile creation failed - user data is invalid', 500);
      }

      let company: any = null;

      // Check if this is an invitation-based registration
      if (data.invitationToken) {
        logger.info('Processing company invitation', { email: data.email, token: data.invitationToken });
        
        // Accept company invitation
        const invitationResult = await CompanyService.acceptCompanyInvitation(
          data.invitationToken,
          user.id,
          data.email
        );

        if (!invitationResult || !invitationResult.company) {
          throw new AppError('Invalid or expired invitation token', 400);
        }

        company = invitationResult.company;
        logger.info('Company invitation accepted', { companyId: (company as any).id, userId: user.id });
      } else {
        // Create company for the user (subscription is created automatically in createCompany)
        if (!data.companyName) {
          throw new AppError('Company name is required for new registrations', 400);
        }

        logger.info('Creating company for user', { userId: user.id, companyName: data.companyName });
        company = await CompanyService.createCompany({
          name: data.companyName,
          userId: user.id,
        });

        if (!company || !company.id) {
          logger.error('Company validation failed - company is null or missing id', { company, userId: user.id });
          throw new AppError('Company creation failed - company data is invalid', 500);
        }

        logger.info('Company created successfully', { companyId: company.id, userId: user.id });
      }

      // Get user's companies
      logger.info('Fetching user companies', { userId: user.id });
      const companies = await CompanyService.getUserCompanies(user.id);

      if (!Array.isArray(companies)) {
        logger.error('getUserCompanies returned non-array', { companies, userId: user.id });
        throw new AppError('Failed to retrieve user companies', 500);
      }

      logger.info('User companies retrieved', { userId: user.id, companyCount: companies.length });

      // Generate token
      logger.info('Generating JWT token', { userId: user.id, companyId: company.id });
      const token = this.generateToken(user.id, user.email, user.role, company.id);

      // Build response with defensive mapping
      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          avatarUrl: user.avatar_url || null,
        },
        token,
        companyId: company.id,
        companies: companies.length > 0 
          ? companies.map((c) => {
              if (!c || !c.id || !c.name) {
                logger.warn('Invalid company data in mapping', { company: c, userId: user.id });
                return null;
              }
              return {
                id: c.id,
                name: c.name,
                role: c.role || 'developer',
              };
            }).filter((c): c is { id: string; name: string; role: string } => c !== null)
          : [],
        currentCompany: {
          id: company.id,
          name: company.name,
        },
      };

      logger.info('Registration completed successfully', { 
        userId: user.id, 
        email: user.email, 
        companyId: company.id 
      });

      return response;
    } catch (error) {
      if (error instanceof AppError) {
        logger.error('Registration failed with AppError', {
          message: error.message,
          statusCode: error.statusCode,
          email: data.email,
          stack: error.stack
        });
        throw error;
      }
      
      logger.error('Registration error - unexpected error type', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        email: data.email,
        companyName: data.companyName
      });
      
      throw new AppError(
        error instanceof Error ? error.message : 'Registration failed',
        500
      );
    }
  }

  // 2. LOGIN USER (Standard)
  async login(data: LoginData, ipAddress?: string, userAgent?: string): Promise<AuthResponse | TwoFactorResponse> {
    try {
      // Check if user exists first to check lock status
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, locked_until, failed_login_attempts')
        .eq('email', data.email)
        .single() as any;

      if (existingUser) {
        // Check if account is locked
        const isLocked = await SecurityService.isAccountLocked(existingUser.id);
        if (isLocked) {
          const remainingMinutes = await SecurityService.getRemainingLockoutTime(existingUser.id);
          await SecurityService.logSecurityEvent({
            userId: existingUser.id,
            eventType: 'login_blocked_locked',
            ipAddress,
            userAgent,
            success: false,
            details: { email: data.email, reason: 'account_locked' },
          });
          throw new AppError(
            `Account is locked due to too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
            423 // 423 Locked
          );
        }
      }

      // Auth with Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.user) {
        // Record failed login attempt
        await SecurityService.recordFailedLogin(data.email, ipAddress, userAgent);
        throw new AppError('Invalid email or password', 401);
      }

      // Get Profile & 2FA Status
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url, is_active, is_two_factor_enabled') // Added 2FA check
        .eq('id', authData.user.id)
        .single() as any;

      if (!user || !user.is_active) {
        await SecurityService.recordFailedLogin(data.email, ipAddress, userAgent);
        throw new AppError('Account inactive or not found', 403);
      }

      // Reset failed attempts on successful login
      await SecurityService.resetFailedAttempts(user.id);
      
      // Log successful login attempt
      await SecurityService.logSecurityEvent({
        userId: user.id,
        eventType: 'login_success',
        ipAddress,
        userAgent,
        success: true,
        details: { email: data.email },
      });

      // Update Last Login
      await (supabaseAdmin.from('users') as any).update({ last_login: new Date().toISOString() }).eq('id', user.id);

      // 🔴 CHECK 2FA: If enabled, STOP here.
      if (user.is_two_factor_enabled) {
        return { require2fa: true, email: user.email };
      }

      // No 2FA? Return Token.
      // Get user's companies and default company
      const companies = await CompanyService.getUserCompanies(user.id);
      const defaultCompany = companies.length > 0 ? companies[0] : null;
      
      const token = this.generateToken(
        user.id, 
        user.email, 
        user.role, 
        defaultCompany?.id
      );
      
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          avatarUrl: user.avatar_url,
        },
        token,
        companyId: defaultCompany?.id,
        companies: companies.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
        })),
        currentCompany: defaultCompany ? {
          id: defaultCompany.id,
          name: defaultCompany.name,
        } : undefined,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Login failed', 500);
    }
  }

  // 3. GOOGLE LOGIN (Handles Signup & Login)
  async loginWithGoogle(accessToken: string, companyName?: string): Promise<AuthResponse | TwoFactorResponse> {
    try {
      const { data: userData, error: tokenError } = await supabaseAdmin.auth.getUser(accessToken);
      if (tokenError || !userData.user) throw new AppError('Invalid Google token', 401);

      const authUser = userData.user;
      const email = authUser.email!;

      // Check existence
      let { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url, is_active, is_two_factor_enabled')
        .eq('id', authUser.id)
        .single() as any;

      // Sync if new (SIGN UP via Google)
      if (!user) {
        const metadata = authUser.user_metadata || {};
        const newUser = {
          id: authUser.id,
          email: email,
          full_name: metadata.full_name || email.split('@')[0],
          role: 'developer',
          avatar_url: metadata.avatar_url || metadata.picture,
        };

        const { data: createdUser, error: createError } = await (supabaseAdmin.from('users') as any)
          .insert(newUser)
          .select()
          .single();

        if (createError) throw new AppError('Failed to sync Google user', 500);
        user = createdUser;

        // Create default company for new Google signups
        if (companyName) {
          await CompanyService.createCompany({
            name: companyName,
            userId: user.id,
          });
        }
      }

      if (!user.is_active) throw new AppError('Account is inactive', 403);

      // 🔴 CHECK 2FA: Even for Google, we enforce it if they enabled it manually.
      if (user.is_two_factor_enabled) {
        return { require2fa: true, email: user.email };
      }

      // Get user's companies and default company
      const companies = await CompanyService.getUserCompanies(user.id);
      const defaultCompany = companies.length > 0 ? companies[0] : null;
      
      const token = this.generateToken(
        user.id, 
        user.email, 
        user.role, 
        defaultCompany?.id
      );
      
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          avatarUrl: user.avatar_url,
        },
        token,
        companyId: defaultCompany?.id,
        companies: companies.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
        })),
        currentCompany: defaultCompany ? {
          id: defaultCompany.id,
          name: defaultCompany.name,
        } : undefined,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Google login failed', 500);
    }
  }

  // 4. VERIFY 2FA CODE (Login Step 2)
  async loginVerify2FA(email: string, token: string): Promise<AuthResponse> {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, avatar_url, two_factor_secret')
      .eq('email', email)
      .single() as any;

    if (!user || !user.two_factor_secret) throw new AppError('2FA not enabled', 400);

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 1 // 30 sec leeway
    });

    if (!verified) throw new AppError('Invalid 2FA code', 401);

    // Get user's companies and default company
    const companies = await CompanyService.getUserCompanies(user.id);
    const defaultCompany = companies.length > 0 ? companies[0] : null;
    
    const jwtToken = this.generateToken(
      user.id, 
      user.email, 
      user.role, 
      defaultCompany?.id
    );
    
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
      token: jwtToken,
      companyId: defaultCompany?.id,
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
      })),
      currentCompany: defaultCompany ? {
        id: defaultCompany.id,
        name: defaultCompany.name,
      } : undefined,
    };
  }

  // 5. SETUP 2FA (Generate QR Code)
  async generate2FASecret(userId: string) {
    const secret = speakeasy.generateSecret({ name: `Zyndrx (${userId.substring(0, 8)})` });
    
    // Save temp secret
    await (supabaseAdmin.from('users') as any)
      .update({ two_factor_secret: secret.base32 })
      .eq('id', userId);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode: qrCodeUrl };
  }

  // 6. ENABLE 2FA (Finalize Setup)
  async enable2FA(userId: string, token: string) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('two_factor_secret')
      .eq('id', userId)
      .single() as any;

    if (!user?.two_factor_secret) throw new AppError('Setup not initialized', 400);

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token
    });

    if (!verified) throw new AppError('Invalid code', 400);

    // Activate
    await (supabaseAdmin.from('users') as any)
      .update({ is_two_factor_enabled: true })
      .eq('id', userId);

    return { success: true };
  }

  // GET CURRENT USER
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
      role: user.role,
      avatarUrl: user.avatar_url,
      is2FAEnabled: user.is_two_factor_enabled // Useful for frontend settings
    };
  }

  // UPDATE PROFILE
  async updateProfile(userId: string, data: { fullName?: string; avatarUrl?: string }) {
    const updateData: UserUpdate = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

    const { data: user, error } = await ((supabaseAdmin.from('users') as any)
      .update(updateData) as any).eq('id', userId).select().single() as any;

    if (error) throw new AppError('Failed to update profile', 500);
    return user;
  }

  // ADMIN: CREATE USER (Admin only - for creating users in their company)
  async createUserAsAdmin(
    adminUserId: string,
    companyId: string,
    data: { email: string; password: string; fullName: string; role?: UserRole; companyRole?: string }
  ) {
    try {
      // Verify admin is company admin
      const { data: membership } = await supabaseAdmin
        .from('user_companies')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', adminUserId)
        .single();

      const member = membership as any;
      if (!member || member.role !== 'admin') {
        throw new AppError('Only company admins can create users', 403);
      }

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false, // Require email verification
        user_metadata: { full_name: data.fullName, role: data.role || 'developer' },
      });

      if (authError || !authData.user) {
        throw new AppError(`Failed to create user: ${authError?.message}`, 500);
      }

      // Create user profile
      const { data: user, error: profileError } = await (supabaseAdmin.from('users') as any).insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.fullName,
        role: data.role || 'developer',
      }).select().single();

      if (profileError || !user) {
        // Cleanup auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new AppError(`Failed to create user profile: ${profileError?.message}`, 500);
      }

      // Add user to company
      const { data: newMember, error: memberError } = await (supabaseAdmin.from('user_companies') as any)
        .insert({
          user_id: user.id,
          company_id: companyId,
          role: data.companyRole || 'member',
          status: 'active',
        })
        .select()
        .single();

      if (memberError) {
        logger.error('Failed to add user to company after creation', { error: memberError, userId: user.id, companyId });
        throw new AppError('User created but failed to add to company', 500);
      }

      logger.info('User created by admin', { 
        createdBy: adminUserId, 
        userId: user.id, 
        email: data.email, 
        companyId 
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
        companyMembership: newMember,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to create user as admin', { error, adminUserId, companyId });
      throw new AppError('Failed to create user', 500);
    }
  }

  // PRIVATE: Generate JWT
  private generateToken(userId: string, email: string, role: UserRole, companyId?: string): string {
    const payload: any = { sub: userId, email, role };
    if (companyId) {
      payload.companyId = companyId;
    }
    const secret = String(config.jwt.secret);
    return jwt.sign(payload, secret, { expiresIn: config.jwt.expiresIn as any });
  }

  /**
   * Generate a new JWT token for a user with a specific company context
   * Used when switching companies/workspaces
   */
  async generateTokenForCompany(userId: string, companyId: string): Promise<string> {
    const user = await this.getCurrentUser(userId);
    return this.generateToken(userId, user.email, user.role, companyId);
  }
  async loginWithGitHub(accessToken: string, companyName?: string): Promise<AuthResponse | TwoFactorResponse> {
    // Exact same logic as Google, just verifying a GitHub token
    // Supabase handles the provider difference internally if you use getUser()
    return this.loginWithGoogle(accessToken, companyName); 
  }

  // NEW: Forgot Password (Sends email)
  async forgotPassword(email: string) {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://zyndrx.netlify.app/reset-password', // Point to your Frontend
    });
    if (error) throw new AppError(error.message, 400);
    return { success: true };
  }

  // NEW: Reset Password (User clicks email link -> Frontend -> Here)
  async resetPassword(password: string, accessToken: string) {
    // verify the user using the token
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) throw new AppError('Invalid or expired token', 401);

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      { password }
    );
    
    if (updateError) throw new AppError('Failed to reset password', 500);
    return { success: true };
  }
}