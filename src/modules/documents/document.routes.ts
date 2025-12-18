import { Router } from 'express';
import { DocumentController } from './document.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  getDocumentsByProjectSchema,
} from './document.validation';

const router = Router();
const documentController = new DocumentController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/documents/upload-url
 * @desc    Get signed upload URL for file
 * @access  Private
 */
router.post('/upload-url', documentController.getUploadUrl);

/**
 * @route   POST /api/v1/documents
 * @desc    Create document record after upload
 * @access  Private
 */
router.post(
  '/',
  validate(uploadDocumentSchema),
  auditLog('upload', 'document'),
  documentController.create
);

/**
 * @route   GET /api/v1/documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
router.get('/:id', documentController.getById);

/**
 * @route   GET /api/v1/documents/project/:projectId
 * @desc    Get all documents for a project
 * @access  Private
 */
router.get(
  '/project/:projectId',
  validate(getDocumentsByProjectSchema),
  documentController.getByProject
);

/**
 * @route   PUT /api/v1/documents/:id
 * @desc    Update document metadata
 * @access  Private
 */
router.put(
  '/:id',
  validate(updateDocumentSchema),
  auditLog('update', 'document'),
  documentController.update
);

/**
 * @route   DELETE /api/v1/documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete('/:id', auditLog('delete', 'document'), documentController.delete);

export default router;
