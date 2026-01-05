import { Router } from 'express';
import { 
  saveDocument, 
  getDocuments,
  getDocument,
  updateDocument,
  requestUploadToken,
  getDocumentDownloadUrl,
  deleteDocument
} from './documents.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';
import { 
  uploadTokenSchema, 
  saveDocumentSchema, 
  getDocumentsSchema,
  updateDocumentSchema
} from './documents.validation';

const router = Router();
router.use(authenticate);
router.use(userRateLimiter);

// POST /api/v1/documents/upload-token - Request upload permission
router.post('/upload-token', validate(uploadTokenSchema), requestUploadToken);

// POST /api/v1/documents - Save document metadata after upload
router.post('/', validate(saveDocumentSchema), saveDocument);

// GET /api/v1/documents?project_id=... - Get project documents
router.get('/', validate(getDocumentsSchema), getDocuments);

// GET /api/v1/documents/:id - Get single document
router.get('/:id', getDocument);

// GET /api/v1/documents/:id/download - Get signed download URL
router.get('/:id/download', getDocumentDownloadUrl);

// PATCH /api/v1/documents/:id - Update document metadata
router.patch('/:id', validate(updateDocumentSchema), updateDocument);

// DELETE /api/v1/documents/:id - Delete document
router.delete('/:id', deleteDocument);

export default router;
