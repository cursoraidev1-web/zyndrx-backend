import { Router } from 'express';
import { PRDController } from './prd.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  createPRDSchema,
  updatePRDSchema,
  updatePRDStatusSchema,
  getPRDsQuerySchema,
  getPRDByIdSchema,
  deletePRDSchema,
  getPRDVersionsSchema,
  exportPRDSchema,
} from './prd.validation';

/**
 * PRD Routes
 * All routes require authentication
 */
const router = Router();
const prdController = new PRDController();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/v1/prds
 * @desc    Create a new PRD
 * @access  Private (Project members with PM, admin, or owner role)
 * @body    { projectId, title, content }
 */
router.post(
  '/',
  validate(createPRDSchema),
  auditLog('create', 'prd'),
  prdController.createPRD
);

/**
 * @route   GET /api/v1/prds
 * @desc    Get PRDs with filtering and pagination
 * @access  Private (Returns only PRDs from user's projects)
 * @query   projectId, status, createdBy, page, limit, sortBy, sortOrder
 */
router.get(
  '/',
  validate(getPRDsQuerySchema),
  prdController.getPRDs
);

/**
 * @route   GET /api/v1/prds/:id
 * @desc    Get single PRD by ID with version history
 * @access  Private (Project members only)
 * @query   includeVersions (boolean, default: true)
 */
router.get(
  '/:id',
  validate(getPRDByIdSchema),
  prdController.getPRDById
);

/**
 * @route   PUT /api/v1/prds/:id
 * @desc    Update PRD content (creates new version)
 * @access  Private (Creator, project owner, or admin)
 * @body    { title?, content?, changesSummary? }
 * @note    Cannot edit approved PRDs
 */
router.put(
  '/:id',
  validate(updatePRDSchema),
  auditLog('update', 'prd'),
  prdController.updatePRD
);

/**
 * @route   PATCH /api/v1/prds/:id/status
 * @desc    Update PRD status (submit, approve, reject)
 * @access  Private (Owner/PM for approve/reject, creator for submit)
 * @body    { status, rejectionReason?, approvalNotes? }
 * @workflow draft → in_review → approved/rejected → draft (if rejected)
 */
router.patch(
  '/:id/status',
  validate(updatePRDStatusSchema),
  auditLog('change_status', 'prd'),
  prdController.updatePRDStatus
);

/**
 * @route   DELETE /api/v1/prds/:id
 * @desc    Delete PRD
 * @access  Private (Creator or project owner)
 * @note    Cannot delete approved PRDs
 */
router.delete(
  '/:id',
  validate(deletePRDSchema),
  auditLog('delete', 'prd'),
  prdController.deletePRD
);

/**
 * @route   GET /api/v1/prds/:id/versions
 * @desc    Get PRD version history
 * @access  Private (Project members)
 */
router.get(
  '/:id/versions',
  validate(getPRDVersionsSchema),
  prdController.getPRDVersions
);

/**
 * @route   GET /api/v1/prds/:id/export
 * @desc    Export PRD to different formats (JSON, Markdown)
 * @access  Private (Project members)
 * @query   format (json|markdown|pdf, default: json)
 */
router.get(
  '/:id/export',
  validate(exportPRDSchema),
  prdController.exportPRD
);

/**
 * @route   GET /api/v1/prds/project/:projectId/stats
 * @desc    Get PRD statistics for a project
 * @access  Private (Project members)
 */
router.get(
  '/project/:projectId/stats',
  prdController.getPRDStats
);

export default router;
