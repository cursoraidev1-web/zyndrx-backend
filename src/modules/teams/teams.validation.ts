import { z } from 'zod';

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    // These match your Postgres ENUM 'user_role' exactly
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer']).default('developer')
  }),
});

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invite token is required')
  }),
});