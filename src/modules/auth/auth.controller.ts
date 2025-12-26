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
    const { email, password, fullName, role, companyName } = req.body;

    logger.info('User registration attempt', { email });

    const result = await authService.register({
      email,
      password,
      fullName,
      role,
      companyName,
    });

    logger.info('User registered successfully', { userId: result.user.id, email });

    return ResponseHandler.created(res, result, 'Registration successful');
  });

  // POST /api/v1/auth/login
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    logger.info('User login attempt', { email });

    const result = await authService.login({ email, password });

    // Handle 2FA Requirement
    if ('require2fa' in result) {
      logger.info('User 2FA required for login', { email });
      return ResponseHandler.success(res, result, '2FA verification required. Please enter your code.');
    }

    logger.info('User logged in successfully', { userId: result.user.id, email });

    return ResponseHandler.success(res, result, 'Login successful');
  });

  /**
   * GET /api/v1/auth/google
   * Initiates Google OAuth flow - redirects to Google
   */
  initiateGoogleAuth = asyncHandler(async (req: Request, res: Response) => {
    const companyName = typeof req.query.companyName === 'string' ? req.query.companyName : undefined;
    const redirectUri = `${config.server.isProduction ? 'https' : 'http'}://${req.get('host')}/api/v1/auth/google/callback`;
    
    // Store companyName in state for callback
    const state = companyName ? Buffer.from(companyName).toString('base64') : undefined;
    
    const authUrl = OAuthService.getGoogleAuthUrl(redirectUri, state);
    
    logger.info('Initiating Google OAuth', { redirectUri });
    res.redirect(authUrl);
  });

  /**
   * GET /api/v1/auth/google/callback
   * Google OAuth callback - handles the redirect from Google
   */
  googleCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, error, state } = req.query;

    if (error) {
      logger.error('Google OAuth error', { error });
      return res.redirect(`${config.frontend.url}/auth/error?error=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      return res.redirect(`${config.frontend.url}/auth/error?error=no_code`);
    }

    try {
      const redirectUri = `${config.server.isProduction ? 'https' : 'http'}://${req.get('host')}/api/v1/auth/google/callback`;
      const companyName = state ? Buffer.from(state as string, 'base64').toString() : undefined;

      const result = await OAuthService.handleGoogleCallback(code as string, redirectUri, companyName);

      if (result.require2fa) {
        // Redirect to 2FA page with email
        return res.redirect(
          `${config.frontend.url}/auth/2fa?email=${encodeURIComponent(result.user.email)}`
        );
      }

      // Redirect to frontend with token
      const tokenParam = encodeURIComponent(result.token);
      return res.redirect(`${config.frontend.url}/auth/callback?token=${tokenParam}&provider=google`);
    } catch (error: any) {
      logger.error('Google OAuth callback error', { error });
      return res.redirect(
        `${config.frontend.url}/auth/error?error=${encodeURIComponent(error.message || 'oauth_failed')}`
      );
    }
  });

  /**
   * POST /api/v1/auth/google
   * Legacy endpoint - accepts accessToken directly (for backward compatibility)
   */
  googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;
    logger.info('Google login attempt (direct token)');

    const result = await authService.loginWithGoogle(accessToken, companyName);

    if ('require2fa' in result) {
      return ResponseHandler.success(res, result, '2FA verification required. Please enter your code.');
    }

    return ResponseHandler.success(res, result, 'Google login successful');
  });

  /* -------------------------------------------------------------------------- */
  /* NEW METHODS FOR UI (GitHub, Forgot Password, Reset Password)               */
  /* -------------------------------------------------------------------------- */

  /**
   * GET /api/v1/auth/github
   * Initiates GitHub OAuth flow - redirects to GitHub
   */
  initiateGitHubAuth = asyncHandler(async (req: Request, res: Response) => {
    const companyName = typeof req.query.companyName === 'string' ? req.query.companyName : undefined;
    const redirectUri = `${config.server.isProduction ? 'https' : 'http'}://${req.get('host')}/api/v1/auth/github/callback`;
    
    // Store companyName in state for callback
    const state = companyName ? Buffer.from(companyName).toString('base64') : undefined;
    
    const authUrl = OAuthService.getGitHubAuthUrl(redirectUri, state);
    
    logger.info('Initiating GitHub OAuth', { redirectUri });
    res.redirect(authUrl);
  });

  /**
   * GET /api/v1/auth/github/callback
   * GitHub OAuth callback - handles the redirect from GitHub
   */
  githubCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, error, state } = req.query;

    if (error) {
      logger.error('GitHub OAuth error', { error });
      return res.redirect(`${config.frontend.url}/auth/error?error=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      return res.redirect(`${config.frontend.url}/auth/error?error=no_code`);
    }

    try {
      const redirectUri = `${config.server.isProduction ? 'https' : 'http'}://${req.get('host')}/api/v1/auth/github/callback`;
      const companyName = state ? Buffer.from(state as string, 'base64').toString() : undefined;

      const result = await OAuthService.handleGitHubCallback(code as string, redirectUri, companyName);

      if (result.require2fa) {
        // Redirect to 2FA page with email
        return res.redirect(
          `${config.frontend.url}/auth/2fa?email=${encodeURIComponent(result.user.email)}`
        );
      }

      // Redirect to frontend with token
      const tokenParam = encodeURIComponent(result.token);
      return res.redirect(`${config.frontend.url}/auth/callback?token=${tokenParam}&provider=github`);
    } catch (error: any) {
      logger.error('GitHub OAuth callback error', { error });
      return res.redirect(
        `${config.frontend.url}/auth/error?error=${encodeURIComponent(error.message || 'oauth_failed')}`
      );
    }
  });

  /**
   * POST /api/v1/auth/github
   * Legacy endpoint - accepts accessToken directly (for backward compatibility)
   */
  githubLogin = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, companyName } = req.body;
    logger.info('GitHub login attempt (direct token)');

    const result = await authService.loginWithGitHub(accessToken, companyName);

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
    return ResponseHandler.success(res, user);
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
}