import { z } from 'zod';
import { PRDStatus } from '../../types/database.types';

/**
 * Validation schemas for PRD module
 * Using Zod for runtime type checking and validation
 */

// PRD Content Schema - flexible JSONB structure
export const prdContentSchema = z.object({
  // Core sections
  overview: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  
  // Requirements
  functionalRequirements: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['must-have', 'should-have', 'nice-to-have']),
  })).optional(),
  
  nonFunctionalRequirements: z.array(z.object({
    type: z.string(),
    description: z.string(),
  })).optional(),
  
  // Technical specs
  technicalSpecs: z.object({
    architecture: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    integrations: z.array(z.string()).optional(),
  }).optional(),
  
  // User stories
  userStories: z.array(z.object({
    id: z.string(),
    role: z.string(),
    goal: z.string(),
    benefit: z.string(),
    acceptanceCriteria: z.array(z.string()),
  })).optional(),
  
  // Timeline
  timeline: z.object({
    estimatedStartDate: z.string().optional(),
    estimatedEndDate: z.string().optional(),
    milestones: z.array(z.object({
      name: z.string(),
      date: z.string(),
      description: z.string(),
    })).optional(),
  }).optional(),
  
  // Design & mockups
  designs: z.array(z.object({
    name: z.string(),
    url: z.string(),
    description: z.string().optional(),
  })).optional(),
  
  // Success metrics
  successMetrics: z.array(z.object({
    metric: z.string(),
    target: z.string(),
    measurement: z.string(),
  })).optional(),
  
  // Risks & assumptions
  risks: z.array(z.object({
    risk: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
  })).optional(),
  
  assumptions: z.array(z.string()).optional(),
  
  // Dependencies
  dependencies: z.array(z.object({
    type: z.enum(['internal', 'external', 'technical']),
    description: z.string(),
    status: z.string(),
  })).optional(),
  
  // Additional notes
  notes: z.string().optional(),
  
  // Allow any additional fields
}).passthrough();

// Create PRD
export const createPRDSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must be less than 200 characters'),
    content: prdContentSchema,
  }),
});

export type CreatePRDInput = z.infer<typeof createPRDSchema>['body'];

// Update PRD
export const updatePRDSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID format'),
  }),
  body: z.object({
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must be less than 200 characters')
      .optional(),
    content: prdContentSchema.optional(),
    changesSummary: z.string()
      .min(3, 'Changes summary must be at least 3 characters')
      .max(500, 'Changes summary must be less than 500 characters')
      .optional(),
  }),
});

export type UpdatePRDInput = z.infer<typeof updatePRDSchema>['body'];

// Update PRD Status
export const updatePRDStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID format'),
  }),
  body: z.object({
    status: z.enum(['draft', 'in_review', 'approved', 'rejected'] as const),
    rejectionReason: z.string()
      .min(10, 'Rejection reason must be at least 10 characters')
      .optional(),
    approvalNotes: z.string()
      .max(1000, 'Approval notes must be less than 1000 characters')
      .optional(),
  }),
});

export type UpdatePRDStatusInput = z.infer<typeof updatePRDStatusSchema>['body'];

// Get PRDs Query
export const getPRDsQuerySchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
    status: z.enum(['draft', 'in_review', 'approved', 'rejected'] as const).optional(),
    createdBy: z.string().uuid('Invalid user ID format').optional(),
    page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('20'),
    sortBy: z.enum(['created_at', 'updated_at', 'title', 'version']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export type GetPRDsQuery = z.infer<typeof getPRDsQuerySchema>['query'];

// Get PRD by ID
export const getPRDByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID format'),
  }),
});

// Delete PRD
export const deletePRDSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID format'),
  }),
});

// Get PRD Versions
export const getPRDVersionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID format'),
  }),
});

// Export PRD
export const exportPRDSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid PRD ID format'),
  }),
  query: z.object({
    format: z.enum(['json', 'markdown', 'pdf']).default('json'),
  }),
});
