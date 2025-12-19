import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
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
  token: string;
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
      // Check Supabase connection
      const { data: healthCheck, error: healthError } = await supabaseAdmin.from('users').select('count').limit(1);
      if (healthError && healthError.code !== 'PGRST116') throw new AppError('Database connection failed', 500);

      // Check existing user
      const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', data.email).single();
      if (existingUser) throw new AppError('User with this email already exists', 409);

      // Create Auth User
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, role: data.role || 'developer' },
      });

      if (authError || !authData.user) throw new AppError(`Failed to create user: ${authError?.message}`, 500);

      // Sync Profile (Retry logic omitted for brevity, but recommended in prod)
      let user = null;
      const { data: createdUser } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', authData.user.id)
        .single() as any;
      
      user = createdUser;

      // Fallback manual creation
      if (!user) {
         const { data: manualUser } = await (supabaseAdmin.from('users') as any).insert({
           id: authData.user.id,
           email: data.email,
           full_name: data.fullName,
           role: data.role || 'developer'
         }).select().single();
         user = manualUser;
      }

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
      logger.error('Registration error', { error });
      throw new AppError('Registration failed', 500);
    }
  }

  // 2. LOGIN USER (Standard)
  async login(data: LoginData): Promise<AuthResponse | TwoFactorResponse> {
    try {
      // Auth with Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.user) throw new AppError('Invalid email or password', 401);

      // Get Profile & 2FA Status
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url, is_active, is_two_factor_enabled') // Added 2FA check
        .eq('id', authData.user.id)
        .single() as any;

      if (!user || !user.is_active) throw new AppError('Account inactive or not found', 403);

      // Update Last Login
      await (supabaseAdmin.from('users') as any).update({ last_login: new Date().toISOString() }).eq('id', user.id);

      // 🔴 CHECK 2FA: If enabled, STOP here.
      if (user.is_two_factor_enabled) {
        return { require2fa: true, email: user.email };
      }

      // No 2FA? Return Token.
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
      throw new AppError('Login failed', 500);
    }
  }

  // 3. GOOGLE LOGIN (Handles Signup & Login)
  async loginWithGoogle(accessToken: string): Promise<AuthResponse | TwoFactorResponse> {
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
      }

      if (!user.is_active) throw new AppError('Account is inactive', 403);

      // 🔴 CHECK 2FA: Even for Google, we enforce it if they enabled it manually.
      if (user.is_two_factor_enabled) {
        return { require2fa: true, email: user.email };
      }

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

    const jwtToken = this.generateToken(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
      token: jwtToken,
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

  // PRIVATE: Generate JWT
  private generateToken(userId: string, email: string, role: UserRole): string {
    const payload = { sub: userId, email, role };
    const secret = String(config.jwt.secret);
    return jwt.sign(payload, secret, { expiresIn: config.jwt.expiresIn as any });
  }
}