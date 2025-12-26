import { z } from 'zod';

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  }),
});

export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    role: z.enum(['admin', 'member', 'viewer']).optional().default('member'),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['admin', 'member', 'viewer']),
  }),
});



