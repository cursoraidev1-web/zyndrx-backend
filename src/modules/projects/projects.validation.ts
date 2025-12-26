import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3, { message: "Project name must be at least 3 characters" }),
    description: z.string().optional(),
    start_date: z.string().datetime().optional(), // ISO Date string
    end_date: z.string().datetime().optional()
  }),
});