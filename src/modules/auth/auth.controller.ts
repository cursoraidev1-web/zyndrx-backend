import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import { config } from '../../config';
import logger from '../../utils/logger';

const authService = new AuthService();

export class AuthController {
  
  // POST /api/v1/auth/register
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, role, companyName, invitationToken } = req.body;

    logger.info('User registration attempt', { email, hasInvitation: !!invitationToken });

    const result = await authService.register({
      email,
      password,
      fullName,
      role,
      companyName,
      invitationToken,
    });

    logger.info('User registered successfully', { userId: result.user.id, email });

    return ResponseHandler.created(res, result, 'Registration successful');
  });

  // POST /api/v1/auth/login
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    logger.info('User login attempt', { email, ip: ipAddress });

    const result = await authService.login({ email, password }, ipAddress, userAgent);

    // Handle 2FA Requirement
    if ('require2fa' in result) {
      logger.info('User 2FA required for login', { email });
      return ResponseHandler.success(res, result, '2FA verification required. Please enter your code.');
    }

    logger.info('User logged in successfully', { userId: result.user.id, email });

    return ResponseHandler.success(res, result, 'Login successful');
  });

  /**
   * POST /api/v1/auth/oauth/session
   * Exchange Supabase OAuth session token for JWT token
   * Called by frontend after successful OAuth login via Supabase
   */
  exchangeOAuthSession = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;

    if (!accessToken) {
      return ResponseHandler.error(res, 'Access token is required', 400);
    }

    logger.info('Exchanging Supabase OAuth session', { hasCompanyName: !!companyName });

    const result = await OAuthService.exchangeSupabaseSession(accessToken, companyName);

    if (result.require2fa) {
      logger.info('User 2FA required for OAuth login', { email: result.user.email });
      return ResponseHandler.success(res, result, '2FA verification required. Please enter your code.');
    }

    logger.info('OAuth session exchanged successfully', { userId: result.user.id, email: result.user.email });
    return ResponseHandler.success(res, result, 'OAuth login successful');
  });

  /**
   * POST /api/v1/auth/google
   * Legacy endpoint - accepts Supabase accessToken (for backward compatibility)
   * Now uses the new Supabase session exchange internally
   */
  googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;
    logger.info('Google login attempt (Supabase token)');

    // Use the new session exchange method
    const result = await OAuthService.exchangeSupabaseSession(accessToken, companyName);

    if ('require2fa' in result) {
      return ResponseHandler.success(res, result, '2FA verification required. Please enter your code.');
    }

    return ResponseHandler.success(res, result, 'Google login successful');
  });

  /* -------------------------------------------------------------------------- */
  /* NEW METHODS FOR UI (GitHub, Forgot Password, Reset Password)               */
  /* -------------------------------------------------------------------------- */


  /**
   * POST /api/v1/auth/github
   * Legacy endpoint - accepts Supabase accessToken (for backward compatibility)
   * Now uses the new Supabase session exchange internally
   */
  githubLogin = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;
    logger.info('GitHub login attempt (Supabase token)');

    // Use the new session exchange method
    const result = await OAuthService.exchangeSupabaseSession(accessToken, companyName);

    if ('require2fa' in result) {
      return ResponseHandler.success(res, result, '2FA verification required. Please enter your code.');
    }

    return ResponseHandler.success(res, result, 'GitHub login successful');
  });

  // POST /api/v1/auth/forgot-password
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return ResponseHandler.success(res, { sent: true }, 'Password reset email sent');
  });

  // POST /api/v1/auth/reset-password
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { password, accessToken } = req.body;
    await authService.resetPassword(password, accessToken);
    return ResponseHandler.success(res, { success: true }, 'Password reset successfully');
  });

  /* -------------------------------------------------------------------------- */

  // GET /api/v1/auth/me
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }
    const user = await authService.getCurrentUser(req.user.id);
    
    // Include company information for workspace dropdown
    const { CompanyService } = await import('../companies/companies.service');
    const companies = await CompanyService.getUserCompanies(req.user.id);
    const currentCompanyId = req.user.companyId || req.companyId;
    const currentCompany = currentCompanyId 
      ? companies.find(c => c.id === currentCompanyId)
      : companies[0];
    
    return ResponseHandler.success(res, {
      ...user,
      companyId: currentCompany?.id,
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
      })),
      currentCompany: currentCompany ? {
        id: currentCompany.id,
        name: currentCompany.name,
      } : undefined,
    });
  });

  // PUT /api/v1/auth/profile
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { fullName, avatarUrl } = req.body;

    const user = await authService.updateProfile(req.user.id, {
      fullName,
      avatarUrl,
    });

    logger.info('User profile updated', { userId: req.user.id });

    return ResponseHandler.success(res, user, 'Profile updated successfully');
  });

  // POST /api/v1/auth/logout
  logout = asyncHandler(async (req: Request, res: Response) => {
    logger.info('User logged out', { userId: req.user?.id });
    return ResponseHandler.success(res, null, 'Logout successful');
  });

  /* -------------------------------------------------------------------------- */
  /* 2FA ENDPOINTS                                                              */
  /* -------------------------------------------------------------------------- */

  // POST /api/v1/auth/2fa/setup
  setup2FA = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    
    logger.info('Initiating 2FA setup', { userId: req.user.id });
    const result = await authService.generate2FASecret(req.user.id);
    return ResponseHandler.success(res, result, 'Scan this QR code with Google Authenticator');
  });

  // POST /api/v1/auth/2fa/enable
  enable2FA = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    const { token } = req.body;
    
    await authService.enable2FA(req.user.id, token);
    logger.info('2FA enabled successfully', { userId: req.user.id });
    return ResponseHandler.success(res, { enabled: true }, '2FA enabled successfully');
  });

  // POST /api/v1/auth/2fa/verify
  verify2FALogin = asyncHandler(async (req: Request, res: Response) => {
    const { email, token } = req.body;
    logger.info('Verifying 2FA login code', { email });
    
    const result = await authService.loginVerify2FA(email, token);
    logger.info('2FA login verified', { userId: result.user.id });
    return ResponseHandler.success(res, result, 'Login successful');
  });

  // POST /api/v1/auth/users/:companyId (Admin only - create user in company)
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;
    const { email, password, fullName, role, companyRole } = req.body;
    const adminUserId = req.user!.id;

    logger.info('Admin creating user', { adminUserId, companyId, email });

    const result = await authService.createUserAsAdmin(adminUserId, companyId, {
      email,
      password,
      fullName,
      role,
      companyRole,
    });

    logger.info('User created by admin', { userId: result.user.id, adminUserId, companyId });

    return ResponseHandler.created(res, result, 'User created successfully');
  });
}