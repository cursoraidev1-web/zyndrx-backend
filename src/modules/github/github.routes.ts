import { Router } from 'express';
import { GitHubController } from './github.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();
const githubController = new GitHubController();

/**
 * @route   POST /api/v1/github/webhook/:id
 * @desc    Handle GitHub webhook
 * @access  Public (verified by signature)
 */
router.post('/webhook/:id', githubController.handleWebhook);

// All other routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/github/integrations
 * @desc    Create GitHub integration
 * @access  Private (Project owner)
 */
router.post(
  '/integrations',
  auditLog('create', 'github_integration'),
  githubController.createIntegration
);

/**
 * @route   GET /api/v1/github/integrations/project/:projectId
 * @desc    Get project's GitHub integration
 * @access  Private
 */
router.get('/integrations/project/:projectId', githubController.getProjectIntegration);

/**
 * @route   PUT /api/v1/github/integrations/:id
 * @desc    Update GitHub integration
 * @access  Private (Project owner)
 */
router.put(
  '/integrations/:id',
  auditLog('update', 'github_integration'),
  githubController.updateIntegration
);

/**
 * @route   DELETE /api/v1/github/integrations/:id
 * @desc    Delete GitHub integration
 * @access  Private (Project owner)
 */
router.delete(
  '/integrations/:id',
  auditLog('delete', 'github_integration'),
  githubController.deleteIntegration
);

/**
 * @route   GET /api/v1/github/projects/:projectId/commits
 * @desc    Get project commits from GitHub
 * @access  Private
 */
router.get('/projects/:projectId/commits', githubController.getProjectCommits);

export default router;
