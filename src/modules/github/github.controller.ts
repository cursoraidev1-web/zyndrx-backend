import { Request, Response } from 'express';
import { GitHubService } from './github.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const githubService = new GitHubService();

export class GitHubController {
  /**
   * Create GitHub integration for a project
   * POST /api/v1/github/integrations
   */
  createIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const integration = await githubService.createIntegration(req.user.id, req.body);

    logger.info('GitHub integration created', {
      integrationId: integration.id,
      projectId: req.body.projectId,
      userId: req.user.id,
    });

    return ResponseHandler.created(
      res,
      integration,
      'GitHub integration created successfully'
    );
  });

  /**
   * Get GitHub integration for a project
   * GET /api/v1/github/integrations/:projectId
   */
  getProjectIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const integration = await githubService.getProjectIntegration(projectId, req.user.id);

    return ResponseHandler.success(
      res,
      integration,
      'GitHub integration retrieved successfully'
    );
  });

  /**
   * Update GitHub integration
   * PUT /api/v1/github/integrations/:id
   */
  updateIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const integration = await githubService.updateIntegration(id, req.user.id, req.body);

    logger.info('GitHub integration updated', {
      integrationId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(
      res,
      integration,
      'GitHub integration updated successfully'
    );
  });

  /**
   * Delete GitHub integration
   * DELETE /api/v1/github/integrations/:id
   */
  deleteIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const result = await githubService.deleteIntegration(id, req.user.id);

    logger.info('GitHub integration deleted', {
      integrationId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(
      res,
      result,
      'GitHub integration deleted successfully'
    );
  });

  /**
   * Handle GitHub webhook
   * POST /api/v1/github/webhook/:projectId
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const signature = req.headers['x-hub-signature-256'] as string;

    const result = await githubService.handleWebhook(req.body, signature, projectId);

    logger.info('GitHub webhook processed', {
      projectId,
      commitCount: result.commits?.length || 0,
    });

    return ResponseHandler.success(res, result, 'Webhook processed successfully');
  });

  /**
   * Get commits
   * GET /api/v1/github/commits
   */
  getCommits = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await githubService.getCommits(req.user.id, req.query as any);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'Commits retrieved successfully'
    );
  });

  /**
   * Link commit to task
   * PATCH /api/v1/github/commits/:id/link
   */
  linkCommitToTask = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const commit = await githubService.linkCommitToTask(id, req.user.id, req.body);

    logger.info('Commit linked to task', {
      commitId: id,
      taskId: req.body.taskId,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, commit, 'Commit linked to task successfully');
  });
}
