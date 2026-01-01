import { z } from 'zod';

/**
 * Validation schema for creating a project
 * Enforces string length limits to prevent DoS attacks and storage bloat
 */
export const createProjectSchema = z.object({
  body: z.object({
    name: z.string()
      .min(3, { message: "Project name must be at least 3 characters" })
      .max(100, { message: "Project name cannot exceed 100 characters" }),
    description: z.string()
      .max(5000, { message: "Description cannot exceed 5,000 characters" })
      .optional(),
    start_date: z.string().datetime({ message: "Invalid date format. Use ISO 8601 format." }).optional(),
    end_date: z.string().datetime({ message: "Invalid date format. Use ISO 8601 format." }).optional(),
    team_name: z.string()
      .max(50, { message: "Team name cannot exceed 50 characters" })
      .optional(),
  }),
});

/**
 * Validation schema for updating a project
 * Enforces string length limits
 */
export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string()
      .min(3, { message: "Project name must be at least 3 characters" })
      .max(100, { message: "Project name cannot exceed 100 characters" })
      .optional(),
    description: z.string()
      .max(5000, { message: "Description cannot exceed 5,000 characters" })
      .optional(),
    start_date: z.string().datetime({ message: "Invalid date format. Use ISO 8601 format." }).optional(),
    end_date: z.string().datetime({ message: "Invalid date format. Use ISO 8601 format." }).optional(),
    status: z.string()
      .max(50, { message: "Status cannot exceed 50 characters" })
      .optional(),
    team_name: z.string()
      .max(50, { message: "Team name cannot exceed 50 characters" })
      .optional(),
  }),
});

export const addProjectMemberSchema = z.object({
  body: z.object({
    user_id: z.string().uuid({ message: "Invalid User ID" }),
    role: z.string().optional().default('developer'),
  }),
});