import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import logger from '../../utils/logger';

const db = supabase as SupabaseClient<Database>;

export class GithubService {
  
  /**
   * SECURITY: Verify that the request actually came from GitHub.
   * We hash the payload with your secret and compare it to the header.
   */
  static verifySignature(payload: any, signature: string, secret: string): boolean {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payloadString).digest('hex');
    
    // Constant time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }

  /**
   * LOGIC: Process a "Push" event.
   * Scans commit messages for "Closes #TASK_ID" patterns.
   */
  static async handlePushEvent(payload: any) {
    const commits = payload.commits || [];

    for (const commit of commits) {
      const message = commit.message;
      
      // Regex: Looks for "Closes #UUID" or "Fixes #UUID"
      // Example: "Fixed the header button Closes #550e8400-e29b-41d4-a716-446655440000"
      const regex = /(?:close|closes|fix|fixes)\s+#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
      const match = message.match(regex);

      if (match && match[1]) {
        const taskId = match[1];
        await this.closeTask(taskId, commit);
      }
    }
  }

  /**
   * DB ACTION: Move the task to 'qa_ready' and log the commit.
   */
  private static async closeTask(taskId: string, commit: any) {
    // 1. Update Task Status
    const { error } = await (db.from('tasks') as any)
      .update({ 
        status: 'in_review', // or 'qa_ready' based on your enum
        updated_at: new Date().toISOString() 
      })
      .eq('id', taskId);

    if (error) {
      logger.error('Failed to close task from GitHub webhook', { taskId, error: error.message });
      return;
    }

    // 2. Log the Commit (Optional: Store in 'github_commits' table if you created it)
    logger.info('GitHub automation: Task moved to review', { 
      taskId, 
      commitId: commit.id.substring(0, 7) 
    });
    
    // Future: Insert into 'github_commits' table here
  }
  static async handleWebHook(payload: any, eventType: string) {
    if (eventType === 'push') {
      await this.handlePushEvent(payload);
    } 
    else if (eventType === 'pull_request') {
      await this.handlePullRequestEvent(payload);
    }
  }

  private static async handlePullRequestEvent(payload: any) {
    const pr = payload.pull_request;
    // Save to DB
    await (db.from('github_pull_requests') as any).upsert({
      pr_number: pr.number,
      title: pr.title,
      status: pr.state, // 'open' or 'closed'
      author: pr.user.login,
      // project_id: ... (logic to link repo to project)
    }, { onConflict: 'pr_number' });
  }

  /**
   * Sync GitHub repositories for a company
   */
  static async syncRepositories(companyId: string, config: any) {
    try {
      const accessToken = config.access_token;
      if (!accessToken) {
        throw new Error('GitHub access token required');
      }

      // Fetch repositories from GitHub API
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repos = await response.json();

      // Store repositories (if you have a github_repositories table)
      // For now, just log
      logger.info('GitHub repositories synced', {
        companyId,
        count: Array.isArray(repos) ? repos.length : 0,
      });

      return repos;
    } catch (error: any) {
      logger.error('Failed to sync GitHub repositories', {
        error: error.message,
        companyId,
      });
      throw error;
    }
  }

  /**
   * Sync GitHub issues and convert to tasks
   */
  static async syncIssues(projectId: string, companyId: string, config: any) {
    try {
      const accessToken = config.access_token;
      const repository = config.repository; // e.g., "owner/repo"

      if (!accessToken || !repository) {
        logger.warn('GitHub sync missing required config', { projectId, companyId });
        return;
      }

      // Fetch issues from GitHub API
      const response = await fetch(`https://api.github.com/repos/${repository}/issues?state=all`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const issues = await response.json() as any[];

      // Convert GitHub issues to tasks
      for (const issue of issues) {
        // Check if task already exists (by external_id or title)
        const { data: existingTask } = await (db.from('tasks') as any)
          .select('id')
          .eq('project_id', projectId)
          .eq('company_id', companyId)
          .eq('external_id', `github:${issue.number}`)
          .single();

        if (!existingTask) {
          // Create new task from GitHub issue
          await (db.from('tasks') as any).insert({
            project_id: projectId,
            company_id: companyId,
            title: issue.title,
            description: issue.body || '',
            status: issue.state === 'open' ? 'todo' : 'completed',
            external_id: `github:${issue.number}`,
            external_url: issue.html_url,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
          });
        }
      }

      logger.info('GitHub issues synced to tasks', {
        projectId,
        companyId,
        count: issues.length,
      });
    } catch (error: any) {
      logger.error('Failed to sync GitHub issues', {
        error: error.message,
        projectId,
        companyId,
      });
      throw error;
    }
  }

  /**
   * Sync GitHub pull requests
   */
  static async syncPullRequests(projectId: string, companyId: string, config: any) {
    try {
      const accessToken = config.access_token;
      const repository = config.repository;

      if (!accessToken || !repository) {
        logger.warn('GitHub sync missing required config', { projectId, companyId });
        return;
      }

      // Fetch pull requests from GitHub API
      const response = await fetch(`https://api.github.com/repos/${repository}/pulls?state=all`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const pullRequests = await response.json() as any[];

      // Store pull requests (if you have a github_pull_requests table)
      for (const pr of pullRequests) {
        await (db.from('github_pull_requests') as any).upsert({
          pr_number: pr.number,
          title: pr.title,
          status: pr.state,
          author: pr.user.login,
          project_id: projectId,
          company_id: companyId,
          url: pr.html_url,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
        }, { onConflict: 'pr_number' });
      }

      logger.info('GitHub pull requests synced', {
        projectId,
        companyId,
        count: pullRequests.length,
      });
    } catch (error: any) {
      logger.error('Failed to sync GitHub pull requests', {
        error: error.message,
        projectId,
        companyId,
      });
      throw error;
    }
  }
}