import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import logger from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Simple in-memory rate limiter (use Redis in production)
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!store[identifier]) {
    store[identifier] = {
      count: 1,
      resetTime: now + config.rateLimit.windowMs,
    };
    return next();
  }

  const record = store[identifier];

  if (now > record.resetTime) {
    // Reset the window
    record.count = 1;
    record.resetTime = now + config.rateLimit.windowMs;
    return next();
  }

  if (record.count >= config.rateLimit.maxRequests) {
    logger.warn('Rate limit exceeded', { ip: identifier, count: record.count });
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
  }

  record.count++;
  next();
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (now > store[key].resetTime + config.rateLimit.windowMs) {
      delete store[key];
    }
  });
}, config.rateLimit.windowMs);
