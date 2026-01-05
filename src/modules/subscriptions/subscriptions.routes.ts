import { Router } from 'express';
import { SubscriptionController } from './subscriptions.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();
const subscriptionController = new SubscriptionController();

// All routes require authentication and are rate limited per user
router.use(authenticate);
router.use(userRateLimiter);

/**
 * @route   GET /api/v1/subscription
 * @desc    Get current subscription
 * @access  Private
 */
router.get('/', subscriptionController.getCurrentSubscription);

/**
 * @route   GET /api/v1/subscription/limits
 * @desc    Check plan limits and usage
 * @access  Private
 */
router.get('/limits', subscriptionController.checkLimits);

/**
 * @route   POST /api/v1/subscription/upgrade
 * @desc    Upgrade subscription
 * @access  Private
 */
router.post('/upgrade', subscriptionController.upgradeSubscription);

/**
 * @route   POST /api/v1/subscription/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/cancel', subscriptionController.cancelSubscription);

export default router;

