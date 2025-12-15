import { z } from 'zod';

// Validation for creating/updating GitHub integration
export const createGitHubIntegrationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  repositoryUrl: z.string().url('Invalid repository URL'),
  accessToken: z.string().optional(),
  webhookSecret: z.string().optional(),
});

export const updateGitHubIntegrationSchema = z.object({
  repositoryUrl: z.string().url('Invalid repository URL').optional(),
  accessToken: z.string().optional(),
  webhookSecret: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Validation for webhook payload (GitHub standard)
export const githubWebhookSchema = z.object({
  ref: z.string().optional(),
  commits: z
    .array(
      z.object({
        id: z.string(),
        message: z.string(),
        timestamp: z.string(),
        author: z.object({
          name: z.string(),
          email: z.string().optional(),
          username: z.string().optional(),
        }),
        url: z.string().optional(),
      })
    )
    .optional(),
  repository: z
    .object({
      name: z.string().optional(),
      full_name: z.string().optional(),
      html_url: z.string().optional(),
    })
    .optional(),
});

// Validation for linking commit to task
export const linkCommitToTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
});

// Query parameters
export const getCommitsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateGitHubIntegrationInput = z.infer<typeof createGitHubIntegrationSchema>;
export type UpdateGitHubIntegrationInput = z.infer<typeof updateGitHubIntegrationSchema>;
export type GitHubWebhookPayload = z.infer<typeof githubWebhookSchema>;
export type LinkCommitToTaskInput = z.infer<typeof linkCommitToTaskSchema>;
export type GetCommitsQuery = z.infer<typeof getCommitsQuerySchema>;
