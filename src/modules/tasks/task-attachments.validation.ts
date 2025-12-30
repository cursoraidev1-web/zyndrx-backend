import { z } from 'zod';

export const uploadTokenSchema = z.object({
  body: z.object({
    task_id: z.string().uuid({ message: 'Invalid task ID format' }),
    file_name: z.string().min(1).max(255),
    file_size: z.number().int().positive(),
    file_type: z.string().min(1),
  }),
});

export const saveAttachmentSchema = z.object({
  body: z.object({
    task_id: z.string().uuid({ message: 'Invalid task ID format' }),
    project_id: z.string().uuid({ message: 'Invalid project ID format' }),
    file_name: z.string().min(1).max(255),
    file_path: z.string().min(1),
    file_url: z.string().url(),
    file_type: z.string().min(1),
    file_size: z.number().int().positive(),
  }),
});



