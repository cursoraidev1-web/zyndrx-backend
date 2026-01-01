import { Request, Response, NextFunction } from 'express';
import { PushService, PushSubscriptionData } from './push.service';
import { ResponseHandler } from '../../utils/response';
import logger from '../../utils/logger';

export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { endpoint, keys } = req.body;
    const userAgent = req.headers['user-agent'];

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return ResponseHandler.error(res, 'Invalid subscription data', 400);
    }

    const subscription: PushSubscriptionData = {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    };

    await PushService.subscribe(userId, subscription, userAgent);
    return ResponseHandler.success(res, { success: true }, 'Subscribed to push notifications');
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { endpoint } = req.body;

    if (!endpoint) {
      return ResponseHandler.error(res, 'Endpoint is required', 400);
    }

    await PushService.unsubscribe(userId, endpoint);
    return ResponseHandler.success(res, { success: true }, 'Unsubscribed from push notifications');
  } catch (error) {
    next(error);
  }
};

export const unsubscribeAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await PushService.unsubscribeAll(userId);
    return ResponseHandler.success(res, { success: true }, 'Unsubscribed from all push notifications');
  } catch (error) {
    next(error);
  }
};

export const getVapidPublicKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const publicKey = PushService.getVapidPublicKey();
    if (!publicKey) {
      return ResponseHandler.error(res, 'Push notifications not configured', 503);
    }
    return ResponseHandler.success(res, { publicKey });
  } catch (error) {
    next(error);
  }
};

