import { Router } from 'express';
import { CommentController } from './comments.controller';
import { createCommentSchema, updateCommentSchema } from './comments.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

// Use the class methods directly
router.get('/', CommentController.getComments);
router.post('/', validate(createCommentSchema), CommentController.createComment);
router.patch('/:id', validate(updateCommentSchema), CommentController.updateComment);
router.delete('/:id', CommentController.deleteComment);

export default router;