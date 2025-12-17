import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../config/supabase';
import { config } from '../../config';
import { UserRole, Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

// Type helpers for Supabase queries
type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];
 
export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
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
  token: string;  // JWT token for frontend to store
}
 
export class AuthService {
  // REGISTER NEW USER
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // 0. Verify Supabase connection first
      const { data: healthCheck, error: healthError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
      
      if (healthError && healthError.code !== 'PGRST116') {
        logger.error('Supabase connection test failed', { error: healthError });
        console.error('🔴 Supabase Connection Error:', JSON.stringify(healthError, null, 2));
        throw new AppError(
          `Cannot connect to database: ${healthError.message || 'Connection failed'}`,
          500
        );
      }

      // 1. Check if user already exists
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is expected for new users
        logger.error('Error checking existing user', { error: checkError });
        throw new AppError('Failed to check user existence', 500);
      }

      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }
 
      // 2. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm for simplicity
        user_metadata: {
          full_name: data.fullName,
          role: data.role || 'developer',
        },
      });

      if (authError || !authData.user) {
        // Log full error details
        const errorDetails = {
          message: authError?.message,
          status: authError?.status,
          name: authError?.name,
          code: (authError as any)?.code,
          details: (authError as any)?.details,
          hint: (authError as any)?.hint,
          fullError: authError,
        };
        
        logger.error('Supabase auth error', errorDetails);
        // Also log to console for immediate visibility
        console.error('🔴 Supabase Auth Error:', JSON.stringify(errorDetails, null, 2));
        
        // Provide more helpful error messages
        let errorMessage = authError?.message || 'Unknown error';
        
        // Handle specific error cases
        if (errorMessage.includes('Database error') || (authError as any)?.code === 'unexpected_failure') {
          errorMessage = `Database error: The database trigger may be failing. Check if handle_new_user() function and trigger exist in Supabase. Original: ${(authError as any)?.hint || errorMessage}`;
        } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
          errorMessage = 'User with this email already exists';
        } else if ((authError as any)?.code === '23505') {
          // Unique constraint violation
          errorMessage = 'User with this email already exists';
        } else if ((authError as any)?.status === 400) {
          errorMessage = `Invalid request: ${(authError as any)?.hint || errorMessage}`;
        }
        
        throw new AppError(`Failed to create user account: ${errorMessage}`, 500);
      }

      // 3. Check if user profile was created by trigger, if not create manually
      let user = null;
      let userError = null;
      const maxRetries = 3;
      const retryDelay = 500;
      
      for (let i = 0; i < maxRetries; i++) {
        const result = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, role, avatar_url')
          .eq('id', authData.user.id)
          .single() as { data: Pick<UserRow, 'id' | 'email' | 'full_name' | 'role' | 'avatar_url'> | null; error: any };
        
        user = result.data;
        userError = result.error;
        
        if (user) {
          break; // User found, exit retry loop
        }
        
        // Wait before retrying (except on last iteration)
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      // 4. If trigger didn't create the profile, create it manually
      if (!user) {
        logger.warn('User profile not created by trigger, creating manually', {
          userId: authData.user.id,
          email: authData.user.email,
        });

        const userInsertData: UserInsert = {
          id: authData.user.id,
          email: authData.user.email || data.email,
          full_name: data.fullName,
          role: (data.role || 'developer') as UserRole,
        };

        const { data: createdUser, error: createError } = await ((supabaseAdmin
          .from('users') as any)
          .insert(userInsertData) as any)
          .select('id, email, full_name, role, avatar_url')
          .single() as { data: Pick<UserRow, 'id' | 'email' | 'full_name' | 'role' | 'avatar_url'> | null; error: any };

        if (createError || !createdUser) {
          logger.error('Failed to create user profile manually', {
            error: createError,
            userId: authData.user.id,
            email: authData.user.email,
            errorCode: createError?.code,
            errorMessage: createError?.message,
          });
          console.error('🔴 Manual User Profile Creation Error:', JSON.stringify({
            error: createError,
            userId: authData.user.id,
          }, null, 2));
          
          // Cleanup: Try to delete the auth user since profile creation failed
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {
            // Ignore cleanup errors
          });
          
          throw new AppError(
            `User created in auth but profile creation failed: ${createError?.message || 'Unknown error'}. Code: ${createError?.code || 'N/A'}`,
            500
          );
        }

        user = createdUser;
      }

      // 5. Generate JWT token for frontend
      const token = this.generateToken(user.id, user.email, user.role);
 
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          avatarUrl: user.avatar_url,
        },
        token,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Registration error', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        email: data.email
      });
      throw new AppError(
        `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }
 
  // LOGIN USER
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // 1. Sign in with Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
 
      if (authError || !authData.user) {
        throw new AppError('Invalid email or password', 401);
      }
 
      // 2. Fetch user profile
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url, is_active')
        .eq('id', authData.user.id)
        .single() as { data: Pick<UserRow, 'id' | 'email' | 'full_name' | 'role' | 'avatar_url' | 'is_active'> | null; error: any };

      if (userError || !user) {
        throw new AppError('User profile not found', 404);
      }

      if (!user.is_active) {
        throw new AppError('Account is inactive', 403);
      }

      // 3. Update last login timestamp
      const updateData: UserUpdate = { last_login: new Date().toISOString() };
      await (supabaseAdmin
        .from('users') as any)
        .update(updateData)
        .eq('id', user.id);
 
      // 4. Generate JWT token
      const token = this.generateToken(user.id, user.email, user.role);
 
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          avatarUrl: user.avatar_url,
        },
        token,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Login error', { error });
      throw new AppError('Login failed', 500);
    }
  }
 
  // GET CURRENT USER (from token)
  async getCurrentUser(userId: string) {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, avatar_url, created_at, last_login')
      .eq('id', userId)
      .single() as { data: Pick<UserRow, 'id' | 'email' | 'full_name' | 'role' | 'avatar_url' | 'created_at' | 'last_login'> | null; error: any };

    if (error || !user) {
      throw new AppError('User not found', 404);
    }
 
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    };
  }
 
  // UPDATE USER PROFILE
  async updateProfile(userId: string, data: { fullName?: string; avatarUrl?: string }) {
    const updateData: UserUpdate = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

    const { data: user, error } = await ((supabaseAdmin
      .from('users') as any)
      .update(updateData) as any)
      .eq('id', userId)
      .select('id, email, full_name, role, avatar_url')
      .single() as { data: Pick<UserRow, 'id' | 'email' | 'full_name' | 'role' | 'avatar_url'> | null; error: any };

    if (error || !user) {
      throw new AppError('Failed to update profile', 500);
    }
 
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    };
  }
 
  // GENERATE JWT TOKEN (Private method)
  private generateToken(userId: string, email: string, role: UserRole): string {
    const payload = {
      sub: userId,     // Subject (user ID)
      email,
      role,
    };
    const secret = String(config.jwt.secret);
    const options: jwt.SignOptions = {
      expiresIn: config.jwt.expiresIn as any, // 7 days - cast to any to handle StringValue type
    };
    return jwt.sign(payload, secret, options) as string;
  }
}