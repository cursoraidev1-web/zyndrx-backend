import { Request, Response, NextFunction } from 'express';
import { FeedbackService } from './feedback.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';

export class FeedbackController {
  /**
   * Create feedback
   * POST /api/v1/feedback
   */
  createFeedback = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { type, rating, title, description, email } = req.body;

    const feedback = await FeedbackService.createFeedback({
      userId,
      companyId,
      type: type || 'general',
      rating,
      title,
      description,
      email: email || undefined,
    });

    return ResponseHandler.created(res, feedback, 'Feedback submitted successfully');
  });

  /**
   * Get feedback list
   * GET /api/v1/feedback
   */
  getFeedback = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { type, status, limit, offset } = req.query;

    const feedback = await FeedbackService.getFeedback(userId, companyId, {
      type: type as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return ResponseHandler.success(res, feedback, 'Feedback retrieved successfully');
  });

  /**
   * Get feedback by ID
   * GET /api/v1/feedback/:id
   */
  getFeedbackById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const feedback = await FeedbackService.getFeedbackById(id, userId);

    if (!feedback) {
      return ResponseHandler.error(res, 'Feedback not found', 404);
    }

    return ResponseHandler.success(res, feedback, 'Feedback retrieved successfully');
  });

  /**
   * Update feedback status
   * PATCH /api/v1/feedback/:id/status
   */
  updateFeedbackStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { status } = req.body;

    const feedback = await FeedbackService.updateFeedbackStatus(id, userId, status);

    return ResponseHandler.success(res, feedback, 'Feedback status updated successfully');
  });
}

