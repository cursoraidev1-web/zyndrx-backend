import { z } from 'zod';

export const connectIntegrationSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, 'Integration type is required'),
  config: z.record(z.string(), z.any()).optional(),
  project_id: z.string().uuid().optional()
});

export const updateIntegrationConfigSchema = z.object({
  config: z.record(z.string(), z.any())
});

