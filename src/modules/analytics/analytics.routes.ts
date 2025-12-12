import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/project/:projectId
 * @desc    Get project analytics and statistics
 * @access  Private
 */
router.get('/project/:projectId', analyticsController.getProjectAnalytics);

/**
 * @route   GET /api/v1/analytics/project/:projectId/velocity
 * @desc    Get task completion velocity
 * @access  Private
 */
router.get('/project/:projectId/velocity', analyticsController.getTaskVelocity);

/**
 * @route   GET /api/v1/analytics/project/:projectId/team
 * @desc    Get team performance metrics
 * @access  Private
 */
router.get('/project/:projectId/team', analyticsController.getTeamPerformance);

/**
 * @route   GET /api/v1/analytics/user
 * @desc    Get current user's analytics
 * @access  Private
 */
router.get('/user', analyticsController.getUserAnalytics);

export default router;
