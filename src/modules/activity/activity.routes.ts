import { Router } from 'express';
import { getActivityFeed, createActivity } from './activity.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// GET /api/v1/activity?project_id=...&user_id=...&type=...&limit=...
router.get('/', getActivityFeed);

// POST /api/v1/activity - Create activity entry
router.post('/', createActivity);

export default router;



