import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.object({
    resource_type: z.string().default('task'),
    resource_id: z.string().uuid({ message: "Invalid Resource ID" }),
    content: z.string().min(1, { message: "Comment content is required" }),
    parent_id: z.string().uuid().optional(),
    project_id: z.string().uuid({ message: "Invalid Project ID" }),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: "Comment content is required" }),
  }),
});


