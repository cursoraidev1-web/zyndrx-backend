import { Request, Response, NextFunction } from 'express';
import { CommentService } from './comments.service';
import { ResponseHandler } from '../../utils/response';

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { resource_type, resource_id, content, parent_id, project_id } = req.body;

    if (!project_id) {
      return ResponseHandler.error(res, 'Project ID is required', 400);
    }

    const comment = await CommentService.createComment({
      user_id: userId,
      project_id,
      resource_type: resource_type || 'task',
      resource_id,
      content,
      parent_id,
    });

    return ResponseHandler.created(res, comment, 'Comment created successfully');
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resource_type, resource_id } = req.query;

    if (!resource_type || !resource_id) {
      return ResponseHandler.error(res, 'Resource type and resource ID are required', 400);
    }

    const comments = await CommentService.getComments(
      resource_type as string,
      resource_id as string
    );

    return ResponseHandler.success(res, comments, 'Comments fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content } = req.body;

    const comment = await CommentService.updateComment(id, userId, content);
    return ResponseHandler.success(res, comment, 'Comment updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await CommentService.deleteComment(id, userId);
    return ResponseHandler.success(res, null, 'Comment deleted successfully');
  } catch (error) {
    next(error);
  }
};



