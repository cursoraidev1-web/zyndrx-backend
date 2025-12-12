import crypto from 'crypto';
import { supabaseAdmin } from '../../config/supabase';
import { config } from '../../config';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

export interface GitHubWebhookPayload {
  action?: string;
  repository?: {
    full_name: string;
    html_url: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    timestamp: string;
  }>;
  pull_request?: {
    number: number;
    title: string;
    state: string;
    html_url: string;
  };
}

export class GitHubService {
  async createIntegration(projectId: string, userId: string, repositoryUrl: string) {
    // Verify user has access to project
    await this.verifyProjectOwnership(projectId, userId);

    try {
      // Generate webhook secret
      const webhookSecret = crypto.randomBytes(20).toString('hex');

      const { data: integration, error } = await supabaseAdmin
        .from('github_integrations')
        .insert({
          project_id: projectId,
          repository_url: repositoryUrl,
          webhook_secret: webhookSecret,
          is_active: true,
        })
        .select('*')
        .single();

      if (error || !integration) {
        logger.error('Failed to create GitHub integration', { error });
        throw new AppError('Failed to create GitHub integration', 500);
      }

      return {
        id: integration.id,
        projectId: integration.project_id,
        repositoryUrl: integration.repository_url,
        webhookSecret: integration.webhook_secret,
        webhookUrl: `${config.server.apiVersion}/github/webhook/${integration.id}`,
        isActive: integration.is_active,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('GitHub integration creation error', { error });
      throw new AppError('Failed to create GitHub integration', 500);
    }
  }

  async getProjectIntegration(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const { data: integration, error } = await supabaseAdmin
      .from('github_integrations')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      return null;
    }

    return {
      id: integration.id,
      projectId: integration.project_id,
      repositoryUrl: integration.repository_url,
      isActive: integration.is_active,
      createdAt: integration.created_at,
      // Don't return webhook secret for security
    };
  }

  async updateIntegration(
    integrationId: string,
    userId: string,
    data: { repositoryUrl?: string; isActive?: boolean }
  ) {
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('github_integrations')
      .select('project_id')
      .eq('id', integrationId)
      .single();

    if (fetchError || !integration) {
      throw new AppError('Integration not found', 404);
    }

    await this.verifyProjectOwnership(integration.project_id, userId);

    const { data: updated, error } = await supabaseAdmin
      .from('github_integrations')
      .update({
        repository_url: data.repositoryUrl,
        is_active: data.isActive,
      })
      .eq('id', integrationId)
      .select('*')
      .single();

    if (error || !updated) {
      logger.error('Failed to update GitHub integration', { error });
      throw new AppError('Failed to update GitHub integration', 500);
    }

    return {
      id: updated.id,
      projectId: updated.project_id,
      repositoryUrl: updated.repository_url,
      isActive: updated.is_active,
    };
  }

  async deleteIntegration(integrationId: string, userId: string) {
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('github_integrations')
      .select('project_id')
      .eq('id', integrationId)
      .single();

    if (fetchError || !integration) {
      throw new AppError('Integration not found', 404);
    }

    await this.verifyProjectOwnership(integration.project_id, userId);

    const { error } = await supabaseAdmin.from('github_integrations').delete().eq('id', integrationId);

    if (error) {
      logger.error('Failed to delete GitHub integration', { error });
      throw new AppError('Failed to delete GitHub integration', 500);
    }

    return { message: 'Integration deleted successfully' };
  }

  async handleWebhook(integrationId: string, signature: string, payload: GitHubWebhookPayload) {
    // Get integration and verify signature
    const { data: integration, error } = await supabaseAdmin
      .from('github_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (error || !integration) {
      throw new AppError('Integration not found', 404);
    }

    if (!integration.is_active) {
      throw new AppError('Integration is not active', 400);
    }

    // Verify webhook signature
    if (!this.verifySignature(JSON.stringify(payload), signature, integration.webhook_secret)) {
      logger.warn('Invalid webhook signature', { integrationId });
      throw new AppError('Invalid signature', 401);
    }

    // Process commits if present
    if (payload.commits && payload.commits.length > 0) {
      await this.processCommits(integration.id, integration.project_id, payload.commits);
    }

    // Process pull request if present
    if (payload.pull_request) {
      await this.processPullRequest(integration.project_id, payload.pull_request);
    }

    return { message: 'Webhook processed successfully' };
  }

  async getProjectCommits(projectId: string, userId: string, limit = 20) {
    await this.verifyProjectAccess(projectId, userId);

    const { data: integration } = await supabaseAdmin
      .from('github_integrations')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (!integration) {
      return [];
    }

    const { data: commits, error } = await supabaseAdmin
      .from('github_commits')
      .select(
        `
        *,
        task:tasks(id, title)
      `
      )
      .eq('integration_id', integration.id)
      .order('committed_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch commits', { error });
      throw new AppError('Failed to fetch commits', 500);
    }

    return commits || [];
  }

  private async processCommits(
    integrationId: string,
    projectId: string,
    commits: Array<{
      id: string;
      message: string;
      author: { name: string; email: string };
      timestamp: string;
    }>
  ) {
    for (const commit of commits) {
      // Check if commit already exists
      const { data: existing } = await supabaseAdmin
        .from('github_commits')
        .select('id')
        .eq('commit_sha', commit.id)
        .single();

      if (existing) continue;

      // Extract task ID from commit message (e.g., "fix: #TASK-123 - description")
      const taskIdMatch = commit.message.match(/#([a-f0-9-]{36})/i);
      const taskId = taskIdMatch ? taskIdMatch[1] : null;

      // Create commit record
      await supabaseAdmin.from('github_commits').insert({
        integration_id: integrationId,
        task_id: taskId,
        commit_sha: commit.id,
        message: commit.message,
        author: commit.author.name,
        committed_at: commit.timestamp,
      });

      // If linked to a task, create notification
      if (taskId) {
        const { data: task } = await supabaseAdmin
          .from('tasks')
          .select('title, created_by')
          .eq('id', taskId)
          .single();

        if (task) {
          await supabaseAdmin.from('notifications').insert({
            user_id: task.created_by,
            type: 'task_assigned', // Using closest type available
            title: 'New commit linked to task',
            message: `Commit: ${commit.message.substring(0, 100)}`,
            link: `/projects/${projectId}/tasks/${taskId}`,
          });
        }
      }
    }
  }

  private async processPullRequest(projectId: string, pullRequest: any) {
    // Create notification for project owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (project) {
      await supabaseAdmin.from('notifications').insert({
        user_id: project.owner_id,
        type: 'deployment_status',
        title: `Pull Request ${pullRequest.state}`,
        message: `PR #${pullRequest.number}: ${pullRequest.title}`,
        link: pullRequest.html_url,
      });
    }
  }

  private verifySignature(payload: string, signature: string, secret: string): boolean {
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }

  private async verifyProjectAccess(projectId: string, userId: string) {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();

      if (!project || project.owner_id !== userId) {
        throw new AppError('Access denied to this project', 403);
      }
    }
  }

  private async verifyProjectOwnership(projectId: string, userId: string) {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== userId) {
      throw new AppError('Only project owner can manage integrations', 403);
    }
  }
}
