import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { config } from '../config';

// CUSTOM ERROR CLASS
// Create errors with specific status codes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true // Is this expected (like 404) or a bug?
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// MAIN ERROR HANDLER
// Catches ALL errors from routes/middleware
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // If it's our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error with full details (for debugging)
  const errorDetails: any = {
    message: err.message,
    name: err.name,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    body: req.body,
    statusCode,
  };

  // Include any additional error properties
  if ((err as any).code) errorDetails.code = (err as any).code;
  if ((err as any).details) errorDetails.details = (err as any).details;
  if ((err as any).hint) errorDetails.hint = (err as any).hint;

  logger.error('Error occurred', errorDetails);

  // Send error response
  const errorResponse: any = {
    success: false,
    error: message,
  };

  // Include stack trace ONLY in development (helps debugging)
  if (config.server.isDevelopment && !isOperational) {
    errorResponse.stack = err.stack;
    // Include additional details in development
    if ((err as any).code) errorResponse.code = (err as any).code;
    if ((err as any).details) errorResponse.details = (err as any).details;
  }

  // Don't send response if it's already been sent
  if (!res.headersSent) {
    res.status(statusCode).json(errorResponse);
  }
};

// 404 HANDLER
// When route doesn't exist
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
  });
};

// ASYNC ERROR WRAPPER
// Catches errors in async functions automatically
// Without this, you'd need try/catch everywhere
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

