import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabaseAdmin } from '../config/supabase';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';
import { UserRole } from '../types/database.types';

interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHandler.unauthorized(res, 'No token provided');
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Fetch user from database to ensure they still exist and are active
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', decoded.sub)
      .single();

    if (error || !user) {
      logger.warn('User not found for token', { userId: decoded.sub });
      return ResponseHandler.unauthorized(res, 'Invalid token');
    }

    if (!user.is_active) {
      return ResponseHandler.forbidden(res, 'Account is inactive');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return ResponseHandler.unauthorized(res, 'Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      return ResponseHandler.unauthorized(res, 'Token expired');
    }
    logger.error('Authentication error', { error });
    return ResponseHandler.serverError(res, 'Authentication failed');
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'User not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles,
      });
      return ResponseHandler.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', decoded.sub)
      .single();

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
