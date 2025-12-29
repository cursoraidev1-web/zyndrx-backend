import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Skip sanitization for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    // Sanitize string values
    const sanitizeString = (str: string): string => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onerror, etc.)
        .trim();
    };

    // Recursively sanitize object (for mutable objects like body)
    const sanitizeObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      }

      return obj;
    };

    // Sanitize body (mutable - can reassign)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters (read-only - modify values in place using Object.defineProperty)
    if (req.query && typeof req.query === 'object') {
      for (const key in req.query) {
        if (Object.prototype.hasOwnProperty.call(req.query, key)) {
          const value = req.query[key];
          if (typeof value === 'string') {
            const sanitized = sanitizeString(value);
            if (sanitized !== value) {
              // Use defineProperty to modify read-only property
              try {
                Object.defineProperty(req.query, key, {
                  value: sanitized,
                  writable: true,
                  enumerable: true,
                  configurable: true,
                });
              } catch (e) {
                // If we can't modify, that's okay - just log and continue
                logger.debug('Could not sanitize query param', { key, error: e });
              }
            }
          } else if (Array.isArray(value)) {
            // Handle array values
            const sanitizedArray = value.map((item: any) => 
              typeof item === 'string' ? sanitizeString(item) : item
            );
            try {
              Object.defineProperty(req.query, key, {
                value: sanitizedArray,
                writable: true,
                enumerable: true,
                configurable: true,
              });
            } catch (e) {
              logger.debug('Could not sanitize query array param', { key, error: e });
            }
          }
        }
      }
    }

    // Sanitize params (read-only - modify values in place)
    if (req.params && typeof req.params === 'object') {
      for (const key in req.params) {
        if (Object.prototype.hasOwnProperty.call(req.params, key)) {
          const value = req.params[key];
          if (typeof value === 'string') {
            const sanitized = sanitizeString(value);
            if (sanitized !== value) {
              try {
                Object.defineProperty(req.params, key, {
                  value: sanitized,
                  writable: true,
                  enumerable: true,
                  configurable: true,
                });
              } catch (e) {
                logger.debug('Could not sanitize param', { key, error: e });
              }
            }
          }
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Error in sanitize middleware', { error });
    next(error);
  }
};

