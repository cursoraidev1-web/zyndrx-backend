import { z } from 'zod';

// Validation for creating a notification
export const createNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: z.enum([
    'task_assigned',
    'task_completed',
    'prd_approved',
    'prd_rejected',
    'comment_added',
    'mention',
    'deployment_status',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  link: z.string().optional(),
});

// Validation for marking notifications as read
export const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

// Validation for query parameters
export const getNotificationsQuerySchema = z.object({
  isRead: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  type: z
    .enum([
      'task_assigned',
      'task_completed',
      'prd_approved',
      'prd_rejected',
      'comment_added',
      'mention',
      'deployment_status',
    ])
    .optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
