import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import crypto from 'crypto';
import {
  CreateGitHubIntegrationInput,
  UpdateGitHubIntegrationInput,
  GitHubWebhookPayload,
  LinkCommitToTaskInput,
  GetCommitsQuery,
} from './github.validation';

export class GitHubService {
  /**
   * Create GitHub integration for a project
   */
  async createIntegration(userId: string, data: CreateGitHubIntegrationInput) {
    try {
      // Check if user is project owner or admin
      const hasAccess = await this.checkAdminAccess(data.projectId, userId);
      if (!hasAccess) {
        throw new AppError('Only project owners/admins can create GitHub integrations', 403);
      }

      // Check if integration already exists for this project
      const { data: existing } = await supabaseAdmin
        .from('github_integrations')
        .select('id')
        .eq('project_id', data.projectId)
        .single();

      if (existing) {
        throw new AppError('GitHub integration already exists for this project', 409);
      }

      // Generate webhook secret if not provided
      const webhookSecret = data.webhookSecret || this.generateWebhookSecret();

      // Create integration
      const { data: integration, error } = await supabaseAdmin
        .from('github_integrations')
        .insert({
          project_id: data.projectId,
          repository_url: data.repositoryUrl,
          access_token: data.accessToken,
          webhook_secret: webhookSecret,
          is_active: true,
        })
        .select('*')
        .single();

      if (error || !integration) {
        logger.error('Failed to create GitHub integration', { error });
        throw new AppError('Failed to create GitHub integration', 500);
      }

      logger.info('GitHub integration created', {
        integrationId: integration.id,
        projectId: data.projectId,
        userId,
      });

      return this.formatIntegration(integration);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create GitHub integration error', { error });
      throw new AppError('Failed to create GitHub integration', 500);
    }
  }

  /**
   * Get GitHub integration for a project
   */
  async getProjectIntegration(projectId: string, userId: string) {
    try {
      // Check if user has access to project
      const hasAccess = await this.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      const { data: integration, error } = await supabaseAdmin
        .from('github_integrations')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !integration) {
        throw new AppError('GitHub integration not found', 404);
      }

      return this.formatIntegration(integration, false); // Don't expose sensitive data
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get GitHub integration error', { error });
      throw new AppError('Failed to fetch GitHub integration', 500);
    }
  }

  /**
   * Update GitHub integration
   */
  async updateIntegration(
    integrationId: string,
    userId: string,
    data: UpdateGitHubIntegrationInput
  ) {
    try {
      // Get existing integration
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('github_integrations')
        .select('*, project:projects(owner_id)')
        .eq('id', integrationId)
        .single();

      if (fetchError || !existing) {
        throw new AppError('GitHub integration not found', 404);
      }

      // Check if user is project owner or admin
      const hasAccess = await this.checkAdminAccess(existing.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Only project owners/admins can update GitHub integrations', 403);
      }

      // Update integration
      const { data: integration, error } = await supabaseAdmin
        .from('github_integrations')
        .update({
          repository_url: data.repositoryUrl,
          access_token: data.accessToken,
          webhook_secret: data.webhookSecret,
          is_active: data.isActive,
        })
        .eq('id', integrationId)
        .select('*')
        .single();

      if (error || !integration) {
        logger.error('Failed to update GitHub integration', { error });
        throw new AppError('Failed to update GitHub integration', 500);
      }

      logger.info('GitHub integration updated', {
        integrationId,
        userId,
      });

      return this.formatIntegration(integration);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update GitHub integration error', { error });
      throw new AppError('Failed to update GitHub integration', 500);
    }
  }

  /**
   * Delete GitHub integration
   */
  async deleteIntegration(integrationId: string, userId: string) {
    try {
      // Get existing integration
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('github_integrations')
        .select('*, project:projects(owner_id)')
        .eq('id', integrationId)
        .single();

      if (fetchError || !existing) {
        throw new AppError('GitHub integration not found', 404);
      }

      // Check if user is project owner or admin
      const hasAccess = await this.checkAdminAccess(existing.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Only project owners/admins can delete GitHub integrations', 403);
      }

      const { error } = await supabaseAdmin
        .from('github_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) {
        logger.error('Failed to delete GitHub integration', { error });
        throw new AppError('Failed to delete GitHub integration', 500);
      }

      logger.info('GitHub integration deleted', { integrationId, userId });

      return { message: 'GitHub integration deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete GitHub integration error', { error });
      throw new AppError('Failed to delete GitHub integration', 500);
    }
  }

  /**
   * Handle GitHub webhook (push events)
   */
  async handleWebhook(payload: GitHubWebhookPayload, signature: string, projectId: string) {
    try {
      // Get integration
      const { data: integration, error } = await supabaseAdmin
        .from('github_integrations')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !integration) {
        throw new AppError('GitHub integration not found', 404);
      }

      if (!integration.is_active) {
        throw new AppError('GitHub integration is not active', 400);
      }

      // Verify webhook signature
      if (integration.webhook_secret && signature) {
        const isValid = this.verifyWebhookSignature(
          JSON.stringify(payload),
          signature,
          integration.webhook_secret
        );

        if (!isValid) {
          throw new AppError('Invalid webhook signature', 401);
        }
      }

      // Process commits
      if (payload.commits && payload.commits.length > 0) {
        const commits = await Promise.all(
          payload.commits.map((commit) =>
            this.processCommit(integration.id, commit, payload.repository)
          )
        );

        logger.info('GitHub webhook processed', {
          integrationId: integration.id,
          commitCount: commits.length,
        });

        return {
          message: 'Webhook processed successfully',
          commits: commits.filter((c) => c !== null),
        };
      }

      return { message: 'No commits to process' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Handle webhook error', { error });
      throw new AppError('Failed to process webhook', 500);
    }
  }

  /**
   * Get commits for a project
   */
  async getCommits(userId: string, query: GetCommitsQuery) {
    try {
      let queryBuilder = supabaseAdmin
        .from('github_commits')
        .select(
          `
          *,
          integration:github_integrations!integration_id(id, project_id, repository_url),
          task:tasks(id, title, status)
        `,
          { count: 'exact' }
        );

      // Filter by project
      if (query.projectId) {
        const hasAccess = await this.checkProjectAccess(query.projectId, userId);
        if (!hasAccess) {
          throw new AppError('Project not found or access denied', 404);
        }

        queryBuilder = queryBuilder.eq('integration.project_id', query.projectId);
      }

      // Filter by task
      if (query.taskId) {
        queryBuilder = queryBuilder.eq('task_id', query.taskId);
      }

      // Pagination
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder
        .order('committed_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

      const { data: commits, error, count } = await queryBuilder;

      if (error) {
        logger.error('Failed to fetch commits', { error });
        throw new AppError('Failed to fetch commits', 500);
      }

      return {
        data: commits?.map((c) => this.formatCommit(c)) || [],
        pagination: {
          total: count || 0,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil((count || 0) / query.limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get commits error', { error });
      throw new AppError('Failed to fetch commits', 500);
    }
  }

  /**
   * Link commit to task
   */
  async linkCommitToTask(
    commitId: string,
    userId: string,
    data: LinkCommitToTaskInput
  ) {
    try {
      // Get commit
      const { data: commit, error: commitError } = await supabaseAdmin
        .from('github_commits')
        .select('*, integration:github_integrations(project_id)')
        .eq('id', commitId)
        .single();

      if (commitError || !commit) {
        throw new AppError('Commit not found', 404);
      }

      // Check if user has access to project
      const hasAccess = await this.checkProjectAccess(
        commit.integration.project_id,
        userId
      );
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // Verify task belongs to same project
      const { data: task } = await supabaseAdmin
        .from('tasks')
        .select('project_id')
        .eq('id', data.taskId)
        .single();

      if (!task || task.project_id !== commit.integration.project_id) {
        throw new AppError('Task not found or does not belong to this project', 400);
      }

      // Update commit
      const { data: updatedCommit, error } = await supabaseAdmin
        .from('github_commits')
        .update({ task_id: data.taskId })
        .eq('id', commitId)
        .select('*')
        .single();

      if (error || !updatedCommit) {
        logger.error('Failed to link commit to task', { error });
        throw new AppError('Failed to link commit to task', 500);
      }

      logger.info('Commit linked to task', {
        commitId,
        taskId: data.taskId,
        userId,
      });

      return this.formatCommit(updatedCommit);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Link commit to task error', { error });
      throw new AppError('Failed to link commit to task', 500);
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Process a single commit from webhook
   */
  private async processCommit(
    integrationId: string,
    commit: any,
    repository?: any
  ) {
    try {
      // Check if commit already exists
      const { data: existing } = await supabaseAdmin
        .from('github_commits')
        .select('id')
        .eq('commit_sha', commit.id)
        .single();

      if (existing) {
        return null; // Skip duplicate
      }

      // Extract task ID from commit message (e.g., "feat: add login [TASK-123]")
      const taskId = this.extractTaskIdFromMessage(commit.message);

      // Create commit record
      const { data: newCommit, error } = await supabaseAdmin
        .from('github_commits')
        .insert({
          integration_id: integrationId,
          task_id: taskId,
          commit_sha: commit.id,
          message: commit.message,
          author: commit.author.name,
          committed_at: commit.timestamp,
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to create commit record', { error });
        return null;
      }

      return newCommit;
    } catch (error) {
      logger.error('Process commit error', { error });
      return null;
    }
  }

  /**
   * Extract task ID from commit message
   * Looks for patterns like [TASK-uuid] or #task-uuid
   */
  private extractTaskIdFromMessage(message: string): string | null {
    // UUID pattern
    const uuidPattern =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = message.match(uuidPattern);
    return match ? match[0] : null;
  }

  /**
   * Generate random webhook secret
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify GitHub webhook signature
   */
  private verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  /**
   * Check if user has access to project
   */
  private async checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) return false;
    if (project.owner_id === userId) return true;

    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return !!member;
  }

  /**
   * Check if user is owner or admin
   */
  private async checkAdminAccess(projectId: string, userId: string): Promise<boolean> {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (project?.owner_id === userId) return true;

    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return member?.role === 'admin';
  }

  /**
   * Format integration for response
   */
  private formatIntegration(integration: any, includeSecrets = true) {
    const formatted: any = {
      id: integration.id,
      projectId: integration.project_id,
      repositoryUrl: integration.repository_url,
      isActive: integration.is_active,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    };

    if (includeSecrets) {
      formatted.webhookSecret = integration.webhook_secret;
      formatted.accessToken = integration.access_token ? '***' : null; // Mask token
    }

    return formatted;
  }

  /**
   * Format commit for response
   */
  private formatCommit(commit: any) {
    return {
      id: commit.id,
      integrationId: commit.integration_id,
      taskId: commit.task_id,
      task: commit.task,
      commitSha: commit.commit_sha,
      message: commit.message,
      author: commit.author,
      committedAt: commit.committed_at,
      createdAt: commit.created_at,
    };
  }
}
