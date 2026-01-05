import { Router } from 'express';
import { FeedbackController } from './feedback.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createFeedbackSchema, updateFeedbackStatusSchema } from './feedback.validation';

const router = Router();
const feedbackController = new FeedbackController();

// All routes require authentication
router.use(authenticate);
router.use(userRateLimiter);

/**
 * @route   POST /api/v1/feedback
 * @desc    Create feedback
 * @access  Private
 */
router.post('/', validate(createFeedbackSchema), feedbackController.createFeedback);

/**
 * @route   GET /api/v1/feedback
 * @desc    Get feedback list
 * @access  Private
 */
router.get('/', feedbackController.getFeedback);

/**
 * @route   GET /api/v1/feedback/:id
 * @desc    Get feedback by ID
 * @access  Private
 */
router.get('/:id', feedbackController.getFeedbackById);

/**
 * @route   PATCH /api/v1/feedback/:id/status
 * @desc    Update feedback status
 * @access  Private
 */
router.patch('/:id/status', validate(updateFeedbackStatusSchema), feedbackController.updateFeedbackStatus);

export default router;

