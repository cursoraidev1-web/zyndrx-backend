import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    prdId: z.string().uuid('Invalid PRD ID').optional(),
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    assignedTo: z.string().uuid('Invalid user ID').optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'in_review', 'completed', 'blocked']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignedTo: z.string().uuid('Invalid user ID').nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
  }),
});

export const getTasksByProjectSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'completed', 'blocked']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignedTo: z.string().uuid().optional(),
    prdId: z.string().uuid().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

export const assignTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    assignedTo: z.string().uuid('Invalid user ID'),
  }),
});

export const updateTaskStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'completed', 'blocked']),
  }),
});
