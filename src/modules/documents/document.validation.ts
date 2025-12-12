import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    prdId: z.string().uuid('Invalid PRD ID').optional(),
    title: z.string().min(1, 'Title is required'),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const getDocumentsByProjectSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    tags: z.string().optional(), // Comma-separated tags
    prdId: z.string().uuid().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});
