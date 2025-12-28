import { Router } from 'express';
import { getTasks, getAllTasks, getTask, createTask, updateTask, deleteTask } from './tasks.controller';
import { createTaskSchema, updateTaskSchema } from './tasks.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  requestUploadToken,
  saveAttachment,
  getTaskAttachments,
  getAttachmentDownloadUrl,
  deleteAttachment,
} from './task-attachments.controller';
import { uploadTokenSchema, saveAttachmentSchema } from './task-attachments.validation';

const router = Router();

router.use(authenticate);

// List tasks (Pass ?project_id=UUID) or get all tasks for company/user
router.get('/', (req, res, next) => {
  if (req.query.project_id) {
    return getTasks(req, res, next);
  }
  return getAllTasks(req, res, next);
});

// Get single task
router.get('/:id', getTask);

// Manual creation
router.post('/', validate(createTaskSchema), createTask);

// Update (Move card, Assign)
router.patch('/:id', validate(updateTaskSchema), updateTask);

// Delete task
router.delete('/:id', deleteTask);

// Task Attachments
// POST /api/v1/tasks/:taskId/attachments/upload-token
router.post('/:taskId/attachments/upload-token', validate(uploadTokenSchema), requestUploadToken);

// POST /api/v1/tasks/:taskId/attachments
router.post('/:taskId/attachments', validate(saveAttachmentSchema), saveAttachment);

// GET /api/v1/tasks/:taskId/attachments
router.get('/:taskId/attachments', getTaskAttachments);

// GET /api/v1/tasks/attachments/:id/download
router.get('/attachments/:id/download', getAttachmentDownloadUrl);

// DELETE /api/v1/tasks/attachments/:id
router.delete('/attachments/:id', deleteAttachment);

export default router;