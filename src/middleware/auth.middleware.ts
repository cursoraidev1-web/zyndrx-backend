import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './error.middleware';
import { UserRole } from '../types/database.types';

// Extend Express Request type to include user (already done in types/express.d.ts)
// This middleware populates req.user from JWT token

interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user info to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Attach user info to request object
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401);
    }
    next(error);
  }
};
