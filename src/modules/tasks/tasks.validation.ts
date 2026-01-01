import { z } from 'zod';

/**
 * Validation schema for creating a task
 * Enforces string length limits to prevent DoS attacks and storage bloat
 */
export const createTaskSchema = z.object({
  body: z.object({
    project_id: z.string().uuid('Invalid project ID format'),
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title cannot exceed 200 characters'),
    description: z.string()
      .max(10000, 'Description cannot exceed 10,000 characters')
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigned_to: z.string().uuid('Invalid user ID format').optional(),
    tags: z.array(z.string().max(50, 'Each tag cannot exceed 50 characters'))
      .max(20, 'Maximum 20 tags allowed')
      .optional(),
  }),
});

/**
 * Validation schema for updating a task
 * Enforces string length limits and validates enum values
 */
export const updateTaskSchema = z.object({
  body: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'completed', 'blocked']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigned_to: z.string().uuid('Invalid user ID format').nullable().optional(), // Nullable to unassign
    description: z.string()
      .max(10000, 'Description cannot exceed 10,000 characters')
      .optional(),
    tags: z.array(z.string().max(50, 'Each tag cannot exceed 50 characters'))
      .max(20, 'Maximum 20 tags allowed')
      .optional(),
  }),
});