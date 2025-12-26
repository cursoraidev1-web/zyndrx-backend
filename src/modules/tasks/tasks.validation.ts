import { z } from 'zod';

// For manually adding a task (hotfix or bug not in PRD)
export const createTaskSchema = z.object({
  body: z.object({
    project_id: z.string().uuid(),
    title: z.string().min(3),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigned_to: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// For moving cards on the board
export const updateTaskSchema = z.object({
  body: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'completed', 'blocked']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigned_to: z.string().uuid().nullable().optional(), // Nullable to unassign
    description: z.string().optional(),
  }),
});