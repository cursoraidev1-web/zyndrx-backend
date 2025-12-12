import { Router } from 'express';
import { PRDController } from './prd.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  createPRDSchema,
  updatePRDSchema,
  approvePRDSchema,
  getPRDsByProjectSchema,
} from './prd.validation';

const router = Router();
const prdController = new PRDController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/prds
 * @desc    Create a new PRD
 * @access  Private (Product Managers, Admins)
 */
router.post(
  '/',
  authorize('product_manager', 'admin'),
  validate(createPRDSchema),
  auditLog('create', 'prd'),
  prdController.create
);

/**
 * @route   GET /api/v1/prds/:id
 * @desc    Get PRD by ID
 * @access  Private
 */
router.get('/:id', prdController.getById);

/**
 * @route   GET /api/v1/prds/project/:projectId
 * @desc    Get all PRDs for a project
 * @access  Private
 */
router.get(
  '/project/:projectId',
  validate(getPRDsByProjectSchema),
  prdController.getByProject
);

/**
 * @route   PUT /api/v1/prds/:id
 * @desc    Update a PRD
 * @access  Private (Product Managers, Admins)
 */
router.put(
  '/:id',
  authorize('product_manager', 'admin'),
  validate(updatePRDSchema),
  auditLog('update', 'prd'),
  prdController.update
);

/**
 * @route   POST /api/v1/prds/:id/submit
 * @desc    Submit PRD for review
 * @access  Private (Product Managers, Admins)
 */
router.post(
  '/:id/submit',
  authorize('product_manager', 'admin'),
  auditLog('submit_review', 'prd'),
  prdController.submitForReview
);

/**
 * @route   POST /api/v1/prds/:id/status
 * @desc    Approve or reject a PRD
 * @access  Private (Product Managers, Admins)
 */
router.post(
  '/:id/status',
  authorize('product_manager', 'admin'),
  validate(approvePRDSchema),
  auditLog('change_status', 'prd'),
  prdController.updateStatus
);

/**
 * @route   GET /api/v1/prds/:id/versions
 * @desc    Get version history of a PRD
 * @access  Private
 */
router.get('/:id/versions', prdController.getVersionHistory);

/**
 * @route   DELETE /api/v1/prds/:id
 * @desc    Delete a PRD
 * @access  Private (Creator, Project Owner, Admin)
 */
router.delete('/:id', auditLog('delete', 'prd'), prdController.delete);

export default router;
