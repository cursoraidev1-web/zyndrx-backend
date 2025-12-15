import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
  });

  // Send error response
  const errorResponse: any = {
    success: false,
    error: message,
  };

  // Include stack trace in development
  if (config.server.isDevelopment && !isOperational) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
  });
};

// Async error wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
