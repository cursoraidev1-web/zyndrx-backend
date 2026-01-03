import { Router } from 'express';
import { createPrd, getPrd, getPrds, updatePrd, deletePrd, updateStatus, createPrdVersion, getPrdVersions, addPRDSection, updatePRDSection, deletePRDSection, addPRDAssignee, removePRDAssignee } from './prd.controller';
import { createPrdSchema, updatePrdSchema, updatePrdStatusSchema, createPrdVersionSchema } from './prd.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

// 1. List PRDs (with optional project_id query param): Accessible by all authenticated users
router.get(
  '/',
  authenticate,
  getPrds
);

// 2. Create PRD: Accessible by all authenticated users (removed role restriction)
router.post(
  '/', 
  authenticate, 
  validate(createPrdSchema), 
  createPrd
);

// 3. Get PRD by ID: Accessible by everyone involved
router.get(
  '/:id', 
  authenticate, 
  getPrd
);

// 4. Update PRD content: Accessible by creator or admin
router.patch(
  '/:id',
  authenticate,
  validate(updatePrdSchema),
  updatePrd
);

// 5. Delete PRD: Accessible by creator or admin
router.delete(
  '/:id',
  authenticate,
  deletePrd
);

// 6. Approve/Reject PRD: Strictly Admins only
router.patch(
  '/:id/status', 
  authenticate, 
  authorize(['admin']), 
  validate(updatePrdStatusSchema), 
  updateStatus
);

// 7. Create PRD Version
router.post(
  '/:id/versions',
  authenticate,
  validate(createPrdVersionSchema),
  createPrdVersion
);

// 8. Get PRD Versions
router.get(
  '/:id/versions',
  authenticate,
  getPrdVersions
);

// 9. PRD Sections Management
router.post(
  '/:id/sections',
  authenticate,
  addPRDSection
);

router.patch(
  '/:id/sections/:sectionId',
  authenticate,
  updatePRDSection
);

router.delete(
  '/:id/sections/:sectionId',
  authenticate,
  deletePRDSection
);

// 10. PRD Assignees Management
router.post(
  '/:id/assignees',
  authenticate,
  addPRDAssignee
);

router.delete(
  '/:id/assignees/:userId',
  authenticate,
  removePRDAssignee
);

export default router;