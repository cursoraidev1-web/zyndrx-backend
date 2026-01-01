import { z } from 'zod';

/**
 * Validation schema for creating a comment
 * Enforces string length limits to prevent DoS attacks and storage bloat
 */
export const createCommentSchema = z.object({
  body: z.object({
    resource_type: z.string()
      .max(50, { message: "Resource type cannot exceed 50 characters" })
      .default('task'),
    resource_id: z.string().uuid({ message: "Invalid Resource ID" }),
    content: z.string()
      .min(1, { message: "Comment content is required" })
      .max(5000, { message: "Comment cannot exceed 5,000 characters" }),
    parent_id: z.string().uuid({ message: "Invalid parent comment ID" }).optional(),
    project_id: z.string().uuid({ message: "Invalid Project ID" }),
  }),
});

/**
 * Validation schema for updating a comment
 * Enforces string length limits
 */
export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, { message: "Comment content is required" })
      .max(5000, { message: "Comment cannot exceed 5,000 characters" }),
  }),
});



