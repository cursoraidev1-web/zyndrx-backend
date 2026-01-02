import { Request, Response, NextFunction } from 'express';
import { CommentService } from './comments.service';
import { AppError } from '../../middleware/error.middleware';

export class CommentController {
  
  static async createComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as any;
      
      // ✅ FIX: Passed userId and companyId arguments
      const comment = await CommentService.createComment(
        req.body, 
        user.id, 
        user.companyId
      );

      res.status(201).json({
        status: 'success',
        data: { comment }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const { resource_id, resource_type } = req.query;

      if (!resource_id || !resource_type) {
        throw new AppError('Resource ID and Type are required', 400);
      }

      // ✅ FIX: Strict type validation for resource_type
      if (resource_type !== 'task' && resource_type !== 'prd') {
         throw new AppError('Resource type must be task or prd', 400);
      }

      const comments = await CommentService.getComments(
        resource_id as string, 
        resource_type as 'task' | 'prd'
      );

      res.status(200).json({
        status: 'success',
        data: { comments }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const { user } = req as any;

      // ✅ FIX: Passed companyId
      const comment = await CommentService.updateComment(id, user.id, content, user.companyId);

      res.status(200).json({
        status: 'success',
        data: { comment }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { user } = req as any;

      // ✅ FIX: Passed companyId
      await CommentService.deleteComment(id, user.id, user.companyId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}