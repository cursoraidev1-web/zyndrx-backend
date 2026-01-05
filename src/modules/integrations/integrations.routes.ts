import { Router } from 'express';
import {
  getIntegrations,
  getIntegration,
  connectIntegration,
  disconnectIntegration,
  updateIntegrationConfig,
  syncIntegration
} from './integrations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';
import { connectIntegrationSchema, updateIntegrationConfigSchema } from './integrations.validation';

const router = Router();

router.use(authenticate);
router.use(userRateLimiter);

// GET /api/v1/integrations - List all available integrations with connection status
router.get('/', getIntegrations);

// GET /api/v1/integrations/:id - Get single integration details
router.get('/:id', getIntegration);

// POST /api/v1/integrations/connect - Connect an integration (by type)
router.post('/connect', validate(connectIntegrationSchema), connectIntegration);

// POST /api/v1/integrations/:id/connect - Connect an integration (alternative route)
router.post('/:id/connect', validate(connectIntegrationSchema), connectIntegration);

// POST /api/v1/integrations/:id/disconnect - Disconnect an integration (by integration_id)
router.post('/:id/disconnect', disconnectIntegration);

// PATCH /api/v1/integrations/:id/config - Update integration configuration
router.patch('/:id/config', validate(updateIntegrationConfigSchema), updateIntegrationConfig);

// POST /api/v1/integrations/:id/sync - Trigger manual sync
router.post('/:id/sync', syncIntegration);

export default router;

