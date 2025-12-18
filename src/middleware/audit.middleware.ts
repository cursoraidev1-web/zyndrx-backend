import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';

export interface AuditLogData {
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

export const createAuditLog = async (
  userId: string,
  data: AuditLogData,
  req: Request
): Promise<void> => {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      metadata: data.metadata || null,
      ip_address: req.ip || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    // Don't fail the request if audit log fails
    logger.error('Failed to create audit log', { error, data });
  }
};

// Middleware to automatically log certain actions
export const auditLog = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;

    res.send = function (data: any) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const resourceId = req.params.id || req.body?.id || 'unknown';

        createAuditLog(
          req.user.id,
          {
            action,
            resourceType,
            resourceId,
            metadata: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
            },
          },
          req
        ).catch((error) => {
          logger.error('Audit log middleware error', { error });
        });
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
};
