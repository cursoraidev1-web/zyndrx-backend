import { Router } from 'express';
import { subscribe, unsubscribe, unsubscribeAll, getVapidPublicKey } from './push.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// Public endpoint for VAPID public key
router.get('/vapid-public-key', getVapidPublicKey);

// Protected endpoints
router.use(authenticate);
router.use(userRateLimiter);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/unsubscribe-all', unsubscribeAll);

export default router;





