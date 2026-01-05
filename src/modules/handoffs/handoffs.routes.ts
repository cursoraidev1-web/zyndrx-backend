import { Router } from 'express';
import {
  createHandoff,
  getHandoff,
  getHandoffs,
  updateHandoff,
  deleteHandoff,
  approveHandoff,
  rejectHandoff,
  getHandoffComments,
  addHandoffComment,
  uploadHandoffAttachment,
} from './handoffs.controller';
import { createHandoffSchema, updateHandoffSchema, rejectHandoffSchema } from './handoffs.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

router.use(authenticate);
router.use(userRateLimiter);

// GET /api/v1/handoffs - List handoffs (with optional filters)
router.get('/', getHandoffs);

// POST /api/v1/handoffs - Create handoff
router.post('/', validate(createHandoffSchema), createHandoff);

// GET /api/v1/handoffs/:id - Get single handoff
router.get('/:id', getHandoff);

// PATCH /api/v1/handoffs/:id - Update handoff
router.patch('/:id', validate(updateHandoffSchema), updateHandoff);

// DELETE /api/v1/handoffs/:id - Delete handoff
router.delete('/:id', deleteHandoff);

// POST /api/v1/handoffs/:id/approve - Approve handoff
router.post('/:id/approve', approveHandoff);

// POST /api/v1/handoffs/:id/reject - Reject handoff
router.post('/:id/reject', validate(rejectHandoffSchema), rejectHandoff);

// GET /api/v1/handoffs/:id/comments - Get handoff comments
router.get('/:id/comments', getHandoffComments);

// POST /api/v1/handoffs/:id/comments - Add handoff comment
router.post('/:id/comments', addHandoffComment);

// POST /api/v1/handoffs/:id/attachments - Upload handoff attachment
router.post('/:id/attachments', uploadHandoffAttachment);

export default router;



