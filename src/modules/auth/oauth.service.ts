import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import { CompanyService } from '../companies/companies.service';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { UserRole } from '../../types/database.types';
import logger from '../../utils/logger';

export class OAuthService {
  /**
   * Generate Google OAuth URL
   */
  static getGoogleAuthUrl(redirectUri: string, state?: string): string {
    if (!config.google.clientId) {
      throw new AppError('Google OAuth not configured', 500);
    }

    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange Google authorization code for tokens
   */
  static async exchangeGoogleCode(code: string, redirectUri: string) {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new AppError('Google OAuth not configured', 500);
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Google token exchange failed', { error });
        throw new AppError('Failed to exchange Google authorization code', 401);
      }

      const data = await response.json() as any;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Google OAuth error', { error });
      throw new AppError('Google OAuth failed', 500);
    }
  }

  /**
   * Get Google user info from access token
   */
  static async getGoogleUserInfo(accessToken: string) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new AppError('Failed to fetch Google user info', 401);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get Google user info', 500);
    }
  }

  /**
   * Generate GitHub OAuth URL
   */
  static getGitHubAuthUrl(redirectUri: string, state?: string): string {
    if (!config.github.clientId) {
      throw new AppError('GitHub OAuth not configured', 500);
    }

    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: redirectUri,
      scope: 'user:email',
      ...(state && { state }),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange GitHub authorization code for access token
   */
  static async exchangeGitHubCode(code: string, redirectUri: string) {
    if (!config.github.clientId || !config.github.clientSecret) {
      throw new AppError('GitHub OAuth not configured', 500);
    }

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('GitHub token exchange failed', { error });
        throw new AppError('Failed to exchange GitHub authorization code', 401);
      }

      const data = await response.json() as any;
      
      if (data.error) {
        throw new AppError(data.error_description || 'GitHub OAuth error', 401);
      }

      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('GitHub OAuth error', { error });
      throw new AppError('GitHub OAuth failed', 500);
    }
  }

  /**
   * Get GitHub user info from access token
   */
  static async getGitHubUserInfo(accessToken: string) {
    try {
      // Get user info
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!userResponse.ok) {
        throw new AppError('Failed to fetch GitHub user info', 401);
      }

      const user = await userResponse.json();

      // Get primary email
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const userData = user as any;
      let email = userData.email;
      if (emailResponse.ok) {
        const emails = await emailResponse.json() as any[];
        const primaryEmail = emails.find((e: any) => e.primary) || emails[0];
        email = primaryEmail?.email || userData.email;
      }

      return {
        id: userData.id.toString(),
        email: email || `${userData.login}@users.noreply.github.com`,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
        login: userData.login,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get GitHub user info', 500);
    }
  }

  /**
   * Handle Google OAuth callback - create/login user
   */
  static async handleGoogleCallback(code: string, redirectUri: string, companyName?: string) {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeGoogleCode(code, redirectUri);

      // Get user info from Google
      const googleUser = await this.getGoogleUserInfo(tokens.accessToken);

      // Create or get user via Supabase
      let authUser;
      let isNewUser = false;

      const googleUserData = googleUser as any;
      // Check if user exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', googleUserData.email)
        .single();
      if (existingUser) {
        // Existing user - get auth user
        const existing = existingUser as any;
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(existing.id);
        authUser = authData?.user;
      } else {
        // New user - create in Supabase Auth
        isNewUser = true;
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: googleUserData.email,
          email_confirm: true,
          user_metadata: {
            full_name: googleUserData.name || googleUserData.email.split('@')[0],
            avatar_url: googleUserData.picture,
            provider: 'google',
          },
        });

        if (authError || !authData.user) {
          throw new AppError(`Failed to create user: ${authError?.message}`, 500);
        }

        authUser = authData.user;

        // Create user profile
        const { error: profileError } = await (supabaseAdmin.from('users') as any).insert({
          id: authUser.id,
          email: googleUserData.email,
          full_name: googleUserData.name || googleUserData.email.split('@')[0],
          role: 'developer',
          avatar_url: googleUserData.picture,
        });

        if (profileError) {
          logger.error('Failed to create user profile', { error: profileError });
        }

        // Create default company for new users
        if (isNewUser) {
          await CompanyService.createCompany({
            name: companyName || `${googleUserData.name || googleUserData.email.split('@')[0]}'s Workspace`,
            userId: authUser.id,
          });
        }
      }

      if (!authUser) {
        throw new AppError('Failed to authenticate user', 500);
      }

      // Get user profile
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url, is_active, is_two_factor_enabled')
        .eq('id', authUser.id)
        .single() as any;

      if (!user || !user.is_active) {
        throw new AppError('Account inactive or not found', 403);
      }

      // Get companies
      const companies = await CompanyService.getUserCompanies(user.id);
      const defaultCompany = companies.length > 0 ? companies[0] : null;

      // Generate JWT token
      const token = this.generateJWTToken(
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
        currentCompany: defaultCompany
          ? {
              id: defaultCompany.id,
              name: defaultCompany.name,
            }
          : undefined,
        require2fa: user.is_two_factor_enabled,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Google OAuth callback error', { error });
      throw new AppError('Google OAuth callback failed', 500);
    }
  }

  /**
   * Handle GitHub OAuth callback - create/login user
   */
  static async handleGitHubCallback(code: string, redirectUri: string, companyName?: string) {
    try {
      // Exchange code for access token
      const tokens = await this.exchangeGitHubCode(code, redirectUri);

      // Get user info from GitHub
      const githubUser = await this.getGitHubUserInfo(tokens.accessToken);

      // Create or get user
      let authUser;
      let isNewUser = false;

      const githubUserData = githubUser as any;
      // Check if user exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', githubUserData.email)
        .single();

      if (existingUser) {
        // Existing user
        const existing = existingUser as any;
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(existing.id);
        authUser = authData?.user;
      } else {
        // New user
        isNewUser = true;
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: githubUserData.email,
          email_confirm: true,
          user_metadata: {
            full_name: githubUserData.name || githubUserData.login,
            avatar_url: githubUserData.avatar_url,
            provider: 'github',
          },
        });

        if (authError || !authData.user) {
          throw new AppError(`Failed to create user: ${authError?.message}`, 500);
        }

        authUser = authData.user;

        // Create user profile
        const { error: profileError } = await (supabaseAdmin.from('users') as any).insert({
          id: authUser.id,
          email: githubUserData.email,
          full_name: githubUserData.name || githubUserData.login,
          role: 'developer',
          avatar_url: githubUserData.avatar_url,
        });

        if (profileError) {
          logger.error('Failed to create user profile', { error: profileError });
        }

        // Create default company for new users
        if (isNewUser) {
          await CompanyService.createCompany({
            name: companyName || `${githubUserData.name || githubUserData.login}'s Workspace`,
            userId: authUser.id,
          });
          // Subscription is created automatically in CompanyService.createCompany
        }
      }

      if (!authUser) {
        throw new AppError('Failed to authenticate user', 500);
      }

      // Get user profile
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, avatar_url, is_active, is_two_factor_enabled')
        .eq('id', authUser.id)
        .single() as any;

      if (!user || !user.is_active) {
        throw new AppError('Account inactive or not found', 403);
      }

      // Get companies
      const companies = await CompanyService.getUserCompanies(user.id);
      const defaultCompany = companies.length > 0 ? companies[0] : null;

      // Generate JWT token
      const token = this.generateJWTToken(
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
        currentCompany: defaultCompany
          ? {
              id: defaultCompany.id,
              name: defaultCompany.name,
            }
          : undefined,
        require2fa: user.is_two_factor_enabled,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('GitHub OAuth callback error', { error });
      throw new AppError('GitHub OAuth callback failed', 500);
    }
  }

  /**
   * Generate JWT token (same logic as AuthService)
   */
  private static generateJWTToken(userId: string, email: string, role: UserRole, companyId?: string): string {
    const payload: any = { sub: userId, email, role };
    if (companyId) {
      payload.companyId = companyId;
    }
    const secret = String(config.jwt.secret);
    return jwt.sign(payload, secret, { expiresIn: config.jwt.expiresIn as any });
  }
}

