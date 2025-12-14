import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/me
 * @desc    Get user analytics/dashboard
 * @access  Private
 */
router.get('/me', analyticsController.getUserAnalytics);

/**
 * @route   GET /api/v1/analytics/projects/:projectId
 * @desc    Get project analytics
 * @access  Private (Project members)
 */
router.get('/projects/:projectId', analyticsController.getProjectAnalytics);

export default router;
