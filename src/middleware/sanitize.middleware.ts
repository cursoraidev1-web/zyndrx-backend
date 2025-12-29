import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Recursively sanitize object
    const sanitize = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj === 'string') {
        // Remove potentially dangerous characters
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onerror, etc.)
          .trim();
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key] = sanitize(obj[key]);
          }
        }
        return sanitized;
      }

      return obj;
    };

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitize(req.query) as any;
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitize(req.params) as any;
    }

    next();
  } catch (error) {
    logger.error('Error in sanitize middleware', { error });
    next(error);
  }
};

