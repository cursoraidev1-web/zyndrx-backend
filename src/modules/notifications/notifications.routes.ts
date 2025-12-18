import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { markAsReadSchema } from './notifications.validation';

const router = Router();
const notificationsController = new NotificationsController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @query   isRead, type, page, limit
 * @access  Private
 */
router.get('/', notificationsController.getUserNotifications);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @route   PATCH /api/v1/notifications/read
 * @desc    Mark specific notifications as read
 * @access  Private
 */
router.patch('/read', validateBody(markAsReadSchema), notificationsController.markAsRead);

/**
 * @route   PATCH /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', notificationsController.markAllAsRead);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', notificationsController.deleteNotification);

export default router;
