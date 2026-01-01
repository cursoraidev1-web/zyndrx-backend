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
}