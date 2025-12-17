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
 
    logger.info('User logged in successfully', { userId: result.user.id, email });
 
    return ResponseHandler.success(res, result, 'Login successful');
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
}