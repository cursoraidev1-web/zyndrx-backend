import { z } from 'zod';

export const createFeedbackSchema = z.object({
  body: z.object({
    type: z.enum(['general', 'bug', 'feature', 'issue']).default('general'),
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().min(1, 'Description is required').max(5000, 'Description too long'),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
  }),
});

export const updateFeedbackStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'reviewed', 'resolved', 'closed']),
  }),
});

