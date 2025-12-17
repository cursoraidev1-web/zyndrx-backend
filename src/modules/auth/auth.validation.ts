import { z } from 'zod';
 
// REGISTRATION VALIDATION
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer']).optional(),
  }),
});
 
// LOGIN VALIDATION
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});
 
// UPDATE PROFILE VALIDATION
export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    avatarUrl: z.string().url().optional(),
  }),
});