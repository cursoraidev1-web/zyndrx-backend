import { z } from 'zod';

// Validation for creating a new task
export const createTaskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  prdId: z.string().uuid('Invalid PRD ID').optional().nullable(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: z.string().uuid('Invalid user ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

// Validation for updating a task
export const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'completed', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid('Invalid user ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  orderIndex: z.number().int().optional(),
});

// Validation for bulk update (e.g., reordering tasks)
export const bulkUpdateTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int(),
    })
  ),
});

// Validation for query parameters
export const getTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  prdId: z.string().uuid().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'completed', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'due_date', 'priority', 'order_index']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BulkUpdateTasksInput = z.infer<typeof bulkUpdateTasksSchema>;
export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;
