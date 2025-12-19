import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const authService = new AuthService();

export class AuthController {
  
  // POST /api/v1/auth/register
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, role } = req.body;

    logger.info('User registration attempt', { email });

    const result = await authService.register({
      email,
      password,
      fullName,
      role,
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

  // POST /api/v1/auth/google
  googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken } = req.body;

    logger.info('Google login attempt');

    const result = await authService.loginWithGoogle(accessToken);

    // Handle 2FA Requirement (Even for Google!)
    if ('require2fa' in result) {
      logger.info('User 2FA required for Google login', { email: result.email });
      return ResponseHandler.success(res, result, '2FA verification required. Please enter your code.');
    }

    logger.info('User logged in via Google successfully', { userId: result.user.id });

    return ResponseHandler.success(res, result, 'Google login successful');
  });

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
    // With JWT, logout is handled client-side by removing the token
    logger.info('User logged out', { userId: req.user?.id });

    return ResponseHandler.success(res, null, 'Logout successful');
  });

  /* -------------------------------------------------------------------------- */
  /* 2FA ENDPOINTS                                  */
  /* -------------------------------------------------------------------------- */

  // POST /api/v1/auth/2fa/setup
  // Generates the Secret + QR Code URL
  setup2FA = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    
    logger.info('Initiating 2FA setup', { userId: req.user.id });
    
    const result = await authService.generate2FASecret(req.user.id);
    
    return ResponseHandler.success(res, result, 'Scan this QR code with Google Authenticator');
  });

  // POST /api/v1/auth/2fa/enable
  // Verifies the first code and turns 2FA "ON"
  enable2FA = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ResponseHandler.unauthorized(res);
    
    const { token } = req.body;
    
    await authService.enable2FA(req.user.id, token);
    
    logger.info('2FA enabled successfully', { userId: req.user.id });
    
    return ResponseHandler.success(res, { enabled: true }, '2FA enabled successfully');
  });

  // POST /api/v1/auth/2fa/verify
  // Step 2 of Login process
  verify2FALogin = asyncHandler(async (req: Request, res: Response) => {
    const { email, token } = req.body;
    
    logger.info('Verifying 2FA login code', { email });
    
    const result = await authService.loginVerify2FA(email, token);
    
    logger.info('2FA login verified', { userId: result.user.id });
    
    return ResponseHandler.success(res, result, 'Login successful');
  });
}