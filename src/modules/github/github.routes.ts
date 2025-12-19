import { Router } from 'express';
import { handleWebhook } from './github.controller';

const router = Router();

// POST /api/v1/github/webhook
// No 'authenticate' middleware here! The signature check handles security.
router.post('/webhook', handleWebhook);

export default router;