import { Request, Response } from 'express';
import { GitHubService } from './github.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const githubService = new GitHubService();

export class GitHubController {
  createIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId, repositoryUrl } = req.body;

    const integration = await githubService.createIntegration(projectId, req.user.id, repositoryUrl);

    logger.info('GitHub integration created', { integrationId: integration.id, userId: req.user.id });

    return ResponseHandler.created(res, integration, 'GitHub integration created successfully');
  });

  getProjectIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;

    const integration = await githubService.getProjectIntegration(projectId, req.user.id);

    if (!integration) {
      return ResponseHandler.notFound(res, 'No GitHub integration found for this project');
    }

    return ResponseHandler.success(res, integration);
  });

  updateIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const { repositoryUrl, isActive } = req.body;

    const integration = await githubService.updateIntegration(id, req.user.id, {
      repositoryUrl,
      isActive,
    });

    logger.info('GitHub integration updated', { integrationId: id, userId: req.user.id });

    return ResponseHandler.success(res, integration, 'Integration updated successfully');
  });

  deleteIntegration = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;

    await githubService.deleteIntegration(id, req.user.id);

    logger.info('GitHub integration deleted', { integrationId: id, userId: req.user.id });

    return ResponseHandler.success(res, null, 'Integration deleted successfully');
  });

  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = req.body;

    logger.info('GitHub webhook received', { integrationId: id });

    await githubService.handleWebhook(id, signature, payload);

    return ResponseHandler.success(res, null, 'Webhook processed');
  });

  getProjectCommits = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;
    const { limit } = req.query;

    const commits = await githubService.getProjectCommits(
      projectId,
      req.user.id,
      limit ? parseInt(limit as string) : undefined
    );

    return ResponseHandler.success(res, commits);
  });
}
