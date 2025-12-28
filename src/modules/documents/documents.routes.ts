import { Router } from 'express';
import { 
  saveDocument, 
  getDocuments, 
  requestUploadToken,
  getDocumentDownloadUrl,
  deleteDocument
} from './documents.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { 
  uploadTokenSchema, 
  saveDocumentSchema, 
  getDocumentsSchema 
} from './documents.validation';

const router = Router();
router.use(authenticate);

// POST /api/v1/documents/upload-token - Request upload permission
router.post('/upload-token', validate(uploadTokenSchema), requestUploadToken);

// POST /api/v1/documents - Save document metadata after upload
router.post('/', validate(saveDocumentSchema), saveDocument);

// GET /api/v1/documents?project_id=... - Get project documents
router.get('/', validate(getDocumentsSchema), getDocuments);

// GET /api/v1/documents/:id/download - Get signed download URL
router.get('/:id/download', getDocumentDownloadUrl);

// DELETE /api/v1/documents/:id - Delete document
router.delete('/:id', deleteDocument);

export default router;
