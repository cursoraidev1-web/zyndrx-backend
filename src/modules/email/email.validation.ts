import { z } from 'zod';

export const sendTestEmailSchema = z.object({
  body: z.object({
    to: z.string().email('Invalid email address'),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
    html: z.string().min(1, 'HTML content is required'),
  }),
});

export const sendResendTestEmailSchema = z.object({
  body: z.object({
    to: z.string().email('Invalid email address'),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
    html: z.string().optional(),
    text: z.string().optional(),
  }),
});







