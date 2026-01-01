import { z } from 'zod';

/**
 * Validation schema for creating a PRD
 * Enforces string length limits to prevent DoS attacks and storage bloat
 */
export const createPrdSchema = z.object({
  body: z.object({
    project_id: z.string().uuid({ message: "Invalid Project ID" }),
    title: z.string()
      .min(3, { message: "Title must be at least 3 characters" })
      .max(200, { message: "Title cannot exceed 200 characters" }),
    content: z.record(z.string(), z.any()), // JSONB content - size validated at database level
    version: z.number().optional().default(1),
  }),
});

/**
 * Validation schema for updating a PRD
 * Enforces string length limits
 */
export const updatePrdSchema = z.object({
  body: z.object({
    title: z.string()
      .min(3, { message: "Title must be at least 3 characters" })
      .max(200, { message: "Title cannot exceed 200 characters" })
      .optional(),
    content: z.record(z.string(), z.any()).optional(), // JSONB content
  }),
});

export const updatePrdStatusSchema = z.object({
  body: z.object({
    status: z.enum(['draft', 'in_review', 'approved', 'rejected']), 
  }),
});

export const createPrdVersionSchema = z.object({
  body: z.object({
    title: z.string().min(3, { message: "Title must be at least 3 characters" }),
    content: z.record(z.string(), z.any()),
    changes_summary: z.string().optional(),
  }),
});