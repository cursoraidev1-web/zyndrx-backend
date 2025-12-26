import { Router } from 'express';
import { createPrd, getPrd, updateStatus } from './prd.controller';
import { createPrdSchema, updatePrdStatusSchema } from './prd.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';// Assuming these exist
import { validate } from '../../middleware/validation.middleware'; // Assuming generic zod validator

const router = Router();

// 1. Create PRD: Accessible by Product Managers & Admins
router.post(
  '/', 
  authenticate, 
  authorize(['product_manager', 'admin']), 
  validate(createPrdSchema), 
  createPrd
);

// 2. Get PRD: Accessible by everyone involved
router.get(
  '/:id', 
  authenticate, 
  getPrd
);

// 3. Approve/Reject PRD: Strictly Admins only
router.patch(
  '/:id/status', 
  authenticate, 
  authorize(['admin']), 
  validate(updatePrdStatusSchema), 
  updateStatus
);

export default router;