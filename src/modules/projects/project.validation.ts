import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters'),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const addMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID'),
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer']),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    memberId: z.string().uuid('Invalid member ID'),
  }),
  body: z.object({
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer']),
  }),
});
