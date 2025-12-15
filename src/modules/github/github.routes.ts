import { Router } from 'express';
import { GitHubController } from './github.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  createGitHubIntegrationSchema,
  updateGitHubIntegrationSchema,
  linkCommitToTaskSchema,
} from './github.validation';

const router = Router();
const githubController = new GitHubController();

/**
 * @route   POST /api/v1/github/integrations
 * @desc    Create GitHub integration for a project
 * @access  Private (Project owner/admin)
 */
router.post(
  '/integrations',
  authenticate,
  validateBody(createGitHubIntegrationSchema),
  githubController.createIntegration
);

/**
 * @route   GET /api/v1/github/integrations/:projectId
 * @desc    Get GitHub integration for a project
 * @access  Private (Project members)
 */
router.get(
  '/integrations/:projectId',
  authenticate,
  githubController.getProjectIntegration
);

/**
 * @route   PUT /api/v1/github/integrations/:id
 * @desc    Update GitHub integration
 * @access  Private (Project owner/admin)
 */
router.put(
  '/integrations/:id',
  authenticate,
  validateBody(updateGitHubIntegrationSchema),
  githubController.updateIntegration
);

/**
 * @route   DELETE /api/v1/github/integrations/:id
 * @desc    Delete GitHub integration
 * @access  Private (Project owner/admin)
 */
router.delete('/integrations/:id', authenticate, githubController.deleteIntegration);

/**
 * @route   POST /api/v1/github/webhook/:projectId
 * @desc    Handle GitHub webhook (public endpoint)
 * @access  Public (verified by webhook signature)
 */
router.post('/webhook/:projectId', githubController.handleWebhook);

/**
 * @route   GET /api/v1/github/commits
 * @desc    Get commits with filtering
 * @query   projectId, taskId, page, limit
 * @access  Private (Project members)
 */
router.get('/commits', authenticate, githubController.getCommits);

/**
 * @route   PATCH /api/v1/github/commits/:id/link
 * @desc    Link commit to task
 * @access  Private (Project members)
 */
router.patch(
  '/commits/:id/link',
  authenticate,
  validateBody(linkCommitToTaskSchema),
  githubController.linkCommitToTask
);

export default router;
