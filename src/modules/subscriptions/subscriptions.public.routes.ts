import { Router } from 'express';
import { SubscriptionController } from './subscriptions.controller';

const router = Router();
const subscriptionController = new SubscriptionController();

/**
 * @route   GET /api/v1/plans
 * @desc    Get available plans (public)
 * @access  Public
 */
router.get('/', subscriptionController.getAvailablePlans);

export default router;



