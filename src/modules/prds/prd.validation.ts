import { z } from 'zod';

export const createPrdSchema = z.object({
  body: z.object({
    project_id: z.string().uuid({ message: "Invalid Project ID" }),
    title: z.string().min(3, { message: "Title must be at least 3 characters" }),
    content: z.record(z.string(), z.any()), 
    version: z.number().optional().default(1),
  }),
});

export const updatePrdStatusSchema = z.object({
  body: z.object({
    // REMOVE the second argument entirely to stop the error.
    status: z.enum(['draft', 'in_review', 'approved', 'rejected']), 
  }),
});