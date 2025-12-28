import { z } from 'zod';

export const uploadTokenSchema = z.object({
  body: z.object({
    project_id: z.string().uuid({ message: 'Invalid project ID format' }),
    file_name: z.string().min(1, { message: 'File name is required' }).max(255, { message: 'File name too long' }),
    file_size: z.number().int().positive({ message: 'File size must be a positive number' }),
    file_type: z.string().min(1, { message: 'File type is required' }),
  }),
});

export const saveDocumentSchema = z.object({
  body: z.object({
    project_id: z.string().uuid({ message: 'Invalid project ID format' }),
    title: z.string().min(1, { message: 'Title is required' }).max(255, { message: 'Title too long' }),
    file_path: z.string().min(1, { message: 'File path is required' }),
    file_type: z.string().min(1, { message: 'File type is required' }),
    file_size: z.number().int().positive({ message: 'File size must be a positive number' }),
    tags: z.array(z.string()).optional(),
    prd_id: z.string().uuid().optional(),
  }),
});

export const getDocumentsSchema = z.object({
  query: z.object({
    project_id: z.string().uuid({ message: 'Invalid project ID format' }),
  }),
});

