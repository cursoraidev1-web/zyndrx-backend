import { Router } from 'express';
import { createComment, getComments, updateComment, deleteComment } from './comments.controller';
import { createCommentSchema, updateCommentSchema } from './comments.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

// GET /api/v1/comments?resource_type=task&resource_id=uuid
router.get('/', getComments);

// POST /api/v1/comments
router.post('/', validate(createCommentSchema), createComment);

// PATCH /api/v1/comments/:id
router.patch('/:id', validate(updateCommentSchema), updateComment);

// DELETE /api/v1/comments/:id
router.delete('/:id', deleteComment);

export default router;

