import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { registrationRateLimiter } from '../../middleware/rate-limit.middleware';
import { CompanyController } from '../companies/companies.controller';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  oauthSessionSchema,
  updateProfileSchema,
  verify2FASchema,
  login2FASchema,
  forgotPasswordSchema, 
  resetPasswordSchema,
  changePasswordSchema,
  createUserSchema,
  switchCompanySchema
} from './auth.validation';

const router = Router();
const authController = new AuthController();
const companyController = new CompanyController();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public (Rate limited: 3 per 15 minutes per IP)
 */
router.post('/register', registrationRateLimiter, validate(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user (Step 1)
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/oauth/session
 * @desc    Exchange Supabase OAuth session token for JWT token
 * @desc    Called by frontend after successful OAuth login via Supabase signInWithOAuth()
 * @access  Public
 * @body    { accessToken: string, companyName?: string }
 */
router.post('/oauth/session', validate(oauthSessionSchema), authController.exchangeOAuthSession);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Login or Register with Google using Supabase accessToken (legacy endpoint)
 * @desc    This endpoint now uses Supabase session exchange internally
 * @access  Public
 */
router.post('/google', validate(googleLoginSchema), authController.googleLogin);

/**
 * @route   POST /api/v1/auth/github
 * @desc    Login or Register with GitHub using Supabase accessToken (legacy endpoint)
 * @desc    This endpoint now uses Supabase session exchange internally
 * @access  Public
 */
router.post('/github', authController.githubLogin);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token from email
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post('/resend-verification', authController.resendVerification);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private (requires token)
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password (requires current password)
 * @access  Private
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get active sessions for current user
 * @access  Private
 */
router.get('/sessions', authenticate, authController.getActiveSessions);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private 
 */
router.post('/logout', authenticate, authController.logout);

/* -------------------------------------------------------------------------- */
/* 2FA ENDPOINTS                                                              */
/* -------------------------------------------------------------------------- */

/**
 * @route   POST /api/v1/auth/2fa/setup
 * @desc    Step 1: Generate Secret & QR Code URL
 * @access  Private (User must be logged in to turn this on)
 */
router.post('/2fa/setup', authenticate, authController.setup2FA);

/**
 * @route   POST /api/v1/auth/2fa/enable
 * @desc    Step 2: Verify first code and enable 2FA permanently
 * @access  Private
 */
router.post('/2fa/enable', authenticate, validate(verify2FASchema), authController.enable2FA);

/**
 * @route   POST /api/v1/auth/2fa/verify
 * @desc    Login Step 2: Verify code after password/Google login to get final Token
 * @access  Public (Because user doesn't have a token yet)
 */
router.post('/2fa/verify', validate(login2FASchema), authController.verify2FALogin);

/**
 * @route   GET /api/v1/auth/companies
 * @desc    Get user's companies
 * @access  Private
 */
router.get('/companies', authenticate, companyController.getMyCompanies);

/**
 * @route   POST /api/v1/auth/switch-company
 * @desc    Switch active company/workspace
 * @access  Private
 * @body    { company_id: string }
 */
router.post('/switch-company', authenticate, validate(switchCompanySchema), companyController.switchCompany);

/**
 * @route   POST /api/v1/auth/users/:companyId
 * @desc    Create user in company (Admin only)
 * @access  Private (Admin only)
 */
router.post('/users/:companyId', authenticate, validate(createUserSchema), authController.createUser);

export default router;