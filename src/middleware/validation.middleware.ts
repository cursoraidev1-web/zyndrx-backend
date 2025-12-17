import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { AppError } from './error.middleware';

/**
 * Validation middleware factory
 * Creates a middleware function that validates request data against a Zod schema
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data against schema
      // Schema should have structure like: { body: ..., params: ..., query: ... }
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors into readable messages
        const errors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        throw new AppError(
          `Validation failed: ${errors.map((e) => e.message).join(', ')}`,
          400
        );
      }

      next(error);
    }
  };
};

