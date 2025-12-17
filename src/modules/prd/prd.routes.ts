import { Router } from 'express';
import { PRDController } from './prd.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  createPRDSchema,
  updatePRDSchema,
  updatePRDStatusSchema,
} from './prd.validation';

const router = Router();
const prdController = new PRDController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/prds
 * @desc    Create a new PRD
 * @access  Private (Project members)
 */
router.post('/', validateBody(createPRDSchema), prdController.createPRD);

/**
 * @route   GET /api/v1/prds
 * @desc    Get PRDs with filtering and pagination
 * @query   projectId, status, page, limit
 * @access  Private (Project members)
 */
router.get('/', prdController.getPRDs);

/**
 * @route   GET /api/v1/prds/:id
 * @desc    Get single PRD by ID with version history
 * @access  Private (Project members)
 */
router.get('/:id', prdController.getPRDById);

/**
 * @route   PUT /api/v1/prds/:id
 * @desc    Update PRD content (creates new version)
 * @access  Private (Project members, not for approved PRDs)
 */
router.put('/:id', validateBody(updatePRDSchema), prdController.updatePRD);

/**
 * @route   PATCH /api/v1/prds/:id/status
 * @desc    Update PRD status (submit, approve, reject)
 * @access  Private (Owner/PM for approve/reject)
 */
router.patch(
  '/:id/status',
  validateBody(updatePRDStatusSchema),
  prdController.updatePRDStatus
);

/**
 * @route   DELETE /api/v1/prds/:id
 * @desc    Delete PRD
 * @access  Private (Creator or project owner, not for approved PRDs)
 */
router.delete('/:id', prdController.deletePRD);

/**
 * @route   GET /api/v1/prds/:id/versions
 * @desc    Get PRD version history
 * @access  Private (Project members)
 */
router.get('/:id/versions', prdController.getPRDVersions);

export default router;
