import { z } from 'zod';

export const inviteUserSchema = z.object({
  body: z.object({
    // Validation for Project ID (UUID format)
    projectId: z.string().uuid('Invalid Project ID format'),
    email: z.string().email('Invalid email address'),
    // Adjusted to match your "roles" usage
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer', 'member', 'viewer']).default('developer'),
  }),
});

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invite token is required'),
  }),
});