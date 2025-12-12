import { z } from 'zod';

export const createPRDSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    title: z.string().min(5, 'Title must be at least 5 characters'),
    content: z.object({
      overview: z.string().optional(),
      objectives: z.array(z.string()).optional(),
      features: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
          acceptanceCriteria: z.array(z.string()).optional(),
        })
      ).optional(),
      technicalRequirements: z.string().optional(),
      userStories: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          acceptanceCriteria: z.array(z.string()).optional(),
        })
      ).optional(),
      timeline: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        milestones: z.array(
          z.object({
            title: z.string(),
            date: z.string(),
            description: z.string().optional(),
          })
        ).optional(),
      }).optional(),
    }),
  }),
});

export const updatePRDSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID'),
  }),
  body: z.object({
    title: z.string().min(5).optional(),
    content: z.any().optional(),
    changesSummary: z.string().optional(),
  }),
});

export const approvePRDSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    feedback: z.string().optional(),
  }),
});

export const getPRDsByProjectSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    status: z.enum(['draft', 'in_review', 'approved', 'rejected']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});
