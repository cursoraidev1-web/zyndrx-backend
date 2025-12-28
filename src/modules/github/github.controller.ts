import { Request, Response, NextFunction } from 'express';
import { GithubService } from './github.service';
import { ResponseHandler } from '../../utils/response';
import logger from '../../utils/logger';
import { config } from '../../config';

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;
    const payload = req.body;

    // 1. Security Check
    const secret = config.github.webhookSecret;
    
    if (!secret) {
      logger.warn('GitHub webhook secret not configured');
      return ResponseHandler.error(res, 'Webhook secret not configured', 500);
    }
    
    if (!signature || !GithubService.verifySignature(payload, signature, secret)) {
      logger.warn('Invalid GitHub webhook signature', { event });
      return ResponseHandler.error(res, 'Invalid signature', 401);
    }

    // 2. Handle Event Type
    if (event === 'push') {
      logger.info('Processing GitHub push event', { event });
      // Process in background (don't keep GitHub waiting)
      GithubService.handlePushEvent(payload).catch(err => {
        logger.error('GitHub webhook processing error', {
          event,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
      });
    } else if (event === 'ping') {
      logger.info('GitHub webhook ping received');
      return ResponseHandler.success(res, { pong: true }, 'Webhook configured successfully');
    } else {
      logger.debug('Unhandled GitHub webhook event', { event });
    }

    // 3. Acknowledge Receipt immediately
    return ResponseHandler.success(res, { received: true });

  } catch (error) {
    logger.error('GitHub webhook handler error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    next(error);
  }
};
