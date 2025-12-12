import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../config/supabase';
import { config } from '../../config';
import { UserRole } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

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
  token: string;
}

export class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, config.security.bcryptRounds);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm email for simplicity
        user_metadata: {
          full_name: data.fullName,
          role: data.role || 'developer',
        },
      });

      if (authError || !authData.user) {
        logger.error('Supabase auth error', { error: authError });
        throw new AppError('Failed to create user account', 500);
      }

      // User profile is automatically created by the trigger
      // Wait a moment for the trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch the created user
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', authData.user.id)
        .single();

      if (userError || !user) {
        logger.error('Failed to fetch created user', { error: userError });
        throw new AppError('User created but profile fetch failed', 500);
      }

      // Generate JWT token
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
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Registration error', { error });
      throw new AppError('Registration failed', 500);
    }
  }

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Fetch user profile
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url, is_active')
        .eq('id', authData.user.id)
        .single();

      if (userError || !user) {
        throw new AppError('User profile not found', 404);
      }

      if (!user.is_active) {
        throw new AppError('Account is inactive', 403);
      }

      // Update last login
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Generate JWT token
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
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Login error', { error });
      throw new AppError('Login failed', 500);
    }
  }

  async getCurrentUser(userId: string) {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, avatar_url, created_at, last_login')
      .eq('id', userId)
      .single();

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

  async updateProfile(userId: string, data: { fullName?: string; avatarUrl?: string }) {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({
        full_name: data.fullName,
        avatar_url: data.avatarUrl,
      })
      .eq('id', userId)
      .select('id, email, full_name, role, avatar_url')
      .single();

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

  private generateToken(userId: string, email: string, role: UserRole): string {
    return jwt.sign(
      {
        sub: userId,
        email,
        role,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      }
    );
  }
}
