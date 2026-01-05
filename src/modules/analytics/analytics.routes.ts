import { Router } from 'express';
import { getStats, getKPIs, getProjectProgress, getTeamPerformance, getTaskAnalytics } from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();
router.use(authenticate);
router.use(userRateLimiter);

// GET /api/v1/analytics?project_id=... - Get full analytics
router.get('/', getStats);

// GET /api/v1/analytics/kpi?project_id=... - Get KPI cards
router.get('/kpi', getKPIs);

// GET /api/v1/analytics/progress?project_id=... - Get project progress
router.get('/progress', getProjectProgress);

// GET /api/v1/analytics/team-performance?project_id=... - Get team performance
router.get('/team-performance', getTeamPerformance);

// GET /api/v1/analytics/tasks?project_id=... - Get task analytics
router.get('/tasks', getTaskAnalytics);

export default router;