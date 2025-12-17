import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import logger from '../utils/logger';
 
interface RateLimitStore {
  [key: string]: {
    count: number;      // Number of requests
    resetTime: number;  // When to reset counter
  };
}
 
const store: RateLimitStore = {};
 
// RATE LIMITER
// Default: 100 requests per 15 minutes per IP
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Identify user by IP address
  const identifier = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
 
  // First request from this IP
  if (!store[identifier]) {
    store[identifier] = {
      count: 1,
      resetTime: now + config.rateLimit.windowMs,
    };
    return next();
  }
 
  const record = store[identifier];
 
  // Time window expired, reset counter
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + config.rateLimit.windowMs;
    return next();
  }
 
  // Check if limit exceeded
  if (record.count >= config.rateLimit.maxRequests) {
    logger.warn('Rate limit exceeded', { ip: identifier, count: record.count });
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((record.resetTime - now) / 1000), // seconds
    });
  }
 
  // Increment counter and allow
  record.count++;
  next();
};
 
// CLEANUP old entries (prevent memory leak)
// Runs every 15 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (now > store[key].resetTime + config.rateLimit.windowMs) {
      delete store[key];
    }
  });
}, config.rateLimit.windowMs);