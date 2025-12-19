import { Router } from 'express';
import { getNotifications, markRead, markAllRead } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markRead);
router.patch('/mark-all-read', markAllRead);

export default router;