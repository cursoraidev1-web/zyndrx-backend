import { Router } from 'express';
import { saveDocument, getDocuments } from './documents.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// POST /api/v1/documents (Body: project_id, title, file_url, file_type, file_size)
router.post('/', saveDocument);
// GET /api/v1/documents?project_id=...
router.get('/', getDocuments);

export default router;