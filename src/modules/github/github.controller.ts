import { Request, Response, NextFunction } from 'express';
import { GithubService } from './github.service';
import { ResponseHandler } from '../../utils/response';

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;
    const payload = req.body;

    // 1. Security Check
    // Ideally, process.env.GITHUB_WEBHOOK_SECRET should be set
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'my_super_secret';
    
    if (!signature || !GithubService.verifySignature(payload, signature, secret)) {
      return ResponseHandler.error(res, 'Invalid signature', 401);
    }

    // 2. Handle Event Type
    if (event === 'push') {
      // Process in background (don't keep GitHub waiting)
      GithubService.handlePushEvent(payload).catch(err => 
        console.error('Webhook processing error:', err)
      );
    } else if (event === 'ping') {
      return ResponseHandler.success(res, { pong: true }, 'Webhook configured successfully');
    }

    // 3. Acknowledge Receipt immediately
    return ResponseHandler.success(res, { received: true });

  } catch (error) {
    next(error);
  }
};