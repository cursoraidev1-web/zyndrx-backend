import { z } from 'zod';

// PRD content structure validation
const prdContentSchema = z.object({
  overview: z.string().optional(),
  goals: z.array(z.string()).optional(),
  features: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      acceptanceCriteria: z.array(z.string()).optional(),
    })
  ).optional(),
  userStories: z.array(
    z.object({
      id: z.string().optional(),
      asA: z.string(),
      iWant: z.string(),
      soThat: z.string(),
    })
  ).optional(),
  technicalRequirements: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  successMetrics: z.array(z.string()).optional(),
  timeline: z.object({
    estimatedStart: z.string().optional(),
    estimatedEnd: z.string().optional(),
    milestones: z.array(
      z.object({
        name: z.string(),
        date: z.string(),
      })
    ).optional(),
  }).optional(),
});

// Validation for creating a new PRD
export const createPRDSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  content: prdContentSchema,
});

// Validation for updating a PRD
export const updatePRDSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  content: prdContentSchema.optional(),
  changesSummary: z.string().max(500).optional(),
});

// Validation for changing PRD status
export const updatePRDStatusSchema = z.object({
  status: z.enum(['draft', 'in_review', 'approved', 'rejected']),
  rejectionReason: z.string().optional(),
});

// Validation for query parameters
export const getPRDsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'rejected']).optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreatePRDInput = z.infer<typeof createPRDSchema>;
export type UpdatePRDInput = z.infer<typeof updatePRDSchema>;
export type UpdatePRDStatusInput = z.infer<typeof updatePRDStatusSchema>;
export type GetPRDsQuery = z.infer<typeof getPRDsQuerySchema>;
