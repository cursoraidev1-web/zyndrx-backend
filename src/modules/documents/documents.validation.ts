import { z } from 'zod';

// Validation for uploading/creating a document record
export const createDocumentSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  prdId: z.string().uuid('Invalid PRD ID').optional().nullable(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  tags: z.array(z.string()).optional().default([]),
});

// Validation for updating a document
export const updateDocumentSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  tags: z.array(z.string()).optional(),
});

// Validation for query parameters
export const getDocumentsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  prdId: z.string().uuid().optional(),
  fileType: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  search: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type GetDocumentsQuery = z.infer<typeof getDocumentsQuerySchema>;
