import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { CompanyController } from '../companies/companies.controller';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  updateProfileSchema,
  verify2FASchema,
  login2FASchema,
  forgotPasswordSchema, 
  resetPasswordSchema   
} from './auth.validation';

const router = Router();
const authController = new AuthController();
const companyController = new CompanyController();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user (Step 1)
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth flow (redirects to Google)
 * @access  Public
 * @query   companyName (optional) - Company name for new signups
 */
router.get('/google', authController.initiateGoogleAuth);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback (handles redirect from Google)
 * @access  Public
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Login or Register with Google using accessToken (legacy/direct token)
 * @access  Public
 */
router.post('/google', validate(googleLoginSchema), authController.googleLogin);

/**
 * @route   GET /api/v1/auth/github
 * @desc    Initiate GitHub OAuth flow (redirects to GitHub)
 * @access  Public
 * @query   companyName (optional) - Company name for new signups
 */
router.get('/github', authController.initiateGitHubAuth);

/**
 * @route   GET /api/v1/auth/github/callback
 * @desc    GitHub OAuth callback (handles redirect from GitHub)
 * @access  Public
 */
router.get('/github/callback', authController.githubCallback);

/**
 * @route   POST /api/v1/auth/github
 * @desc    Login or Register with GitHub using accessToken (legacy/direct token)
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
 */
router.post('/switch-company', authenticate, companyController.switchCompany);

export default router;