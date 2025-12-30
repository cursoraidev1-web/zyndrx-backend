import { z } from 'zod';

export const createHandoffSchema = z.object({
  body: z.object({
    project_id: z.string().uuid({ message: "Invalid Project ID" }),
    to_user_id: z.string().uuid({ message: "Invalid User ID" }),
    title: z.string().min(3, { message: "Title must be at least 3 characters" }),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    due_date: z.string().datetime().optional(),
  }),
});

export const updateHandoffSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().datetime().optional(),
    status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'completed']).optional(),
  }),
});

export const rejectHandoffSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});



