import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler, AppError } from '../../middleware/error.middleware'; // FIX 3: Imported AppError
import logger from '../../utils/logger';
import { CompanyService } from '../companies/companies.service'; 

const authService = new AuthService();

export class AuthController {
  
  // POST /api/v1/auth/register
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, companyName, invitationToken } = req.body;

    logger.info('User registration attempt', { email, hasInvitation: !!invitationToken });

    const result = await authService.register({
      email,
      password,
      fullName,
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

    logger.info('User login attempt', { email });

    const result = await authService.login({ email, password }, ipAddress, userAgent);

    if ('require2fa' in result) {
      return ResponseHandler.success(res, result, '2FA verification required');
    }

    return ResponseHandler.success(res, result, 'Login successful');
  });

  // POST /api/v1/auth/users/:companyId (Admin only)
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;
    const { email, password, fullName, companyRole } = req.body;
    const adminUserId = req.user!.id;

    logger.info('Admin creating user', { adminUserId, companyId, email });

    const result = await authService.createUserAsAdmin(adminUserId, companyId, {
      email,
      password,
      fullName,
      companyRole: companyRole || 'member', 
    });

    return ResponseHandler.created(res, result, 'User created successfully');
  });

  // POST /api/v1/auth/oauth/session
  exchangeOAuthSession = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;
    // FIX 2b: Replaced non-existent badRequest with AppError
    if (!accessToken) throw new AppError('Access token is required', 400);

    const result = await OAuthService.exchangeSupabaseSession(accessToken, companyName);

    if ('require2fa' in result) {
      return ResponseHandler.success(res, result, '2FA verification required');
    }
    return ResponseHandler.success(res, result, 'OAuth login successful');
  });

  // FIX 3: Call Service directly (prevents "Expected 3 arguments" error)
  googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;
    const result = await OAuthService.exchangeSupabaseSession(accessToken, companyName);

    if ('require2fa' in result) {
      return ResponseHandler.success(res, result, '2FA verification required');
    }
    return ResponseHandler.success(res, result, 'Google login successful');
  });
  
  // FIX 3: Call Service directly
  githubLogin = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;
    const result = await OAuthService.exchangeSupabaseSession(accessToken, companyName);

    if ('require2fa' in result) {
      return ResponseHandler.success(res, result, '2FA verification required');
    }
    return ResponseHandler.success(res, result, 'GitHub login successful');
  });

  // Password Management
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    return ResponseHandler.success(res, { sent: true }, 'Password reset email sent');
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.password, req.body.accessToken);
    return ResponseHandler.success(res, { success: true }, 'Password reset successfully');
  });

  // Profile Management
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    const user = await authService.getCurrentUser(req.user.id);
    return ResponseHandler.success(res, user);
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    const user = await authService.updateProfile(req.user.id, req.body);
    return ResponseHandler.success(res, user, 'Profile updated successfully');
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    return ResponseHandler.success(res, null, 'Logout successful');
  });

  // 2FA Endpoints
  setup2FA = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    const result = await authService.generate2FASecret(req.user.id);
    return ResponseHandler.success(res, result, 'Scan QR code');
  });

  enable2FA = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    await authService.enable2FA(req.user.id, req.body.token);
    return ResponseHandler.success(res, { enabled: true }, '2FA enabled');
  });

  verify2FALogin = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.loginVerify2FA(req.body.email, req.body.token);
    return ResponseHandler.success(res, result, 'Login successful');
  });
}
