import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3, { message: "Project name must be at least 3 characters" }),
    description: z.string().optional(),
    start_date: z.string().datetime().optional(), // ISO Date string
    end_date: z.string().datetime().optional(),
    team_name: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3, { message: "Project name must be at least 3 characters" }).optional(),
    description: z.string().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    status: z.string().optional(),
    team_name: z.string().optional(),
  }),
});

export const addProjectMemberSchema = z.object({
  body: z.object({
    user_id: z.string().uuid({ message: "Invalid User ID" }),
    role: z.string().optional().default('developer'),
  }),
});