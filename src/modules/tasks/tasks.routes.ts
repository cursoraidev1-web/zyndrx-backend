import { Router } from 'express';
import { getTasks, createTask, updateTask } from './tasks.controller';
import { createTaskSchema, updateTaskSchema } from './tasks.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

// List tasks (Pass ?project_id=UUID)
router.get('/', getTasks);

// Manual creation
router.post('/', validate(createTaskSchema), createTask);

// Update (Move card, Assign)
router.patch('/:id', validate(updateTaskSchema), updateTask);

export default router;