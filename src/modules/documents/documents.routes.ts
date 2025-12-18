import { Router } from 'express';
import { DocumentsController } from './documents.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  createDocumentSchema,
  updateDocumentSchema,
} from './documents.validation';

const router = Router();
const documentsController = new DocumentsController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/documents
 * @desc    Create a document record (after uploading file to storage)
 * @access  Private (Project members)
 */
router.post('/', validateBody(createDocumentSchema), documentsController.createDocument);

/**
 * @route   GET /api/v1/documents
 * @desc    Get documents with filtering and pagination
 * @query   projectId, prdId, fileType, tags, search, page, limit
 * @access  Private (Project members)
 */
router.get('/', documentsController.getDocuments);

/**
 * @route   GET /api/v1/documents/:id
 * @desc    Get single document by ID
 * @access  Private (Project members)
 */
router.get('/:id', documentsController.getDocumentById);

/**
 * @route   PUT /api/v1/documents/:id
 * @desc    Update document metadata (title, tags)
 * @access  Private (Project members)
 */
router.put('/:id', validateBody(updateDocumentSchema), documentsController.updateDocument);

/**
 * @route   DELETE /api/v1/documents/:id
 * @desc    Delete document
 * @access  Private (Uploader or project owner)
 */
router.delete('/:id', documentsController.deleteDocument);

export default router;
