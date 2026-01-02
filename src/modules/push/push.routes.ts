import { Router } from 'express';
import { subscribe, unsubscribe, unsubscribeAll, getVapidPublicKey } from './push.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Public endpoint for VAPID public key
router.get('/vapid-public-key', getVapidPublicKey);

// Protected endpoints
router.use(authenticate);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/unsubscribe-all', unsubscribeAll);

export default router;





