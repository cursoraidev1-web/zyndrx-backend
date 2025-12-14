import { z } from 'zod';
import { UserRole } from '../../types/database.types';

// Validation for creating a new project
export const createProjectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Validation for updating a project
export const updateProjectSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

// Validation for adding a member to project
export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer'] as const),
});

// Validation for removing a member
export const removeMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
