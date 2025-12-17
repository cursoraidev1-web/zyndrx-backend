import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';
import { Database } from '../types/database.types';

type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];
 
export interface AuditLogData {
  action: string;           // What happened (create, update, delete)
  resourceType: string;     // What was affected (task, prd, project)
  resourceId: string;       // Which specific item
  metadata?: Record<string, any>; // Extra context
}
 
// CREATE AUDIT LOG
// Call this function anywhere to log an action
export const createAuditLog = async (
  userId: string,
  data: AuditLogData,
  req: Request
): Promise<void> => {
  try {
    const insertData: AuditLogInsert = {
      user_id: userId,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      metadata: data.metadata || null,
      ip_address: req.ip || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
    };
    await ((supabaseAdmin.from('audit_logs') as any).insert(insertData) as any);
  } catch (error) {
    // Don't fail the request if audit log fails
    logger.error('Failed to create audit log', { error, data });
  }
};
 
// AUDIT MIDDLEWARE
// Automatically logs actions based on route
export const auditLog = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;
 
    // Override send to capture when request is successful
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