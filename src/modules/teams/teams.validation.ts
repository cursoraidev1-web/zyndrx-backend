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

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(3, { message: "Team name must be at least 3 characters" }),
    description: z.string().optional(),
    team_lead_id: z.string().uuid().optional(),
  }),
});

export const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    team_lead_id: z.string().uuid().optional(),
  }),
});

export const addTeamMemberSchema = z.object({
  body: z.object({
    user_id: z.string().uuid({ message: "Invalid User ID" }),
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer']).optional().default('developer'),
  }),
});