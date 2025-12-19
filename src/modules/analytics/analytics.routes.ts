import { Router } from 'express';
import { getStats } from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// GET /api/v1/analytics?project_id=...
router.get('/', getStats);

export default router;