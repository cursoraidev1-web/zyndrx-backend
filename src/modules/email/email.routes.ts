import { Router } from 'express';
import { EmailController } from './email.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';
import { sendTestEmailSchema } from './email.validation';

const router = Router();
const emailController = new EmailController();

/**
 * @route   POST /api/v1/email/test
 * @desc    Send a test email
 * @access  Authenticated
 */
router.post(
  '/test',
  authenticate,
  userRateLimiter,
  validate(sendTestEmailSchema),
  emailController.sendTestEmail
);

/**
 * @route   GET /api/v1/email/templates
 * @desc    Get available email templates
 * @access  Authenticated
 */
router.get(
  '/templates',
  authenticate,
  userRateLimiter,
  emailController.getTemplates
);

/**
 * @route   GET /api/v1/email/usage
 * @desc    Get email usage and limits for current company
 * @access  Authenticated
 */
router.get(
  '/usage',
  authenticate,
  userRateLimiter,
  emailController.getEmailUsage
);

export default router;



