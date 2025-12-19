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

export const googleLoginSchema = z.object({
  body: z.object({
    accessToken: z.string().min(1, 'Access token is required'),
  }),
});
// Verify the code to Enable 2FA
export const verify2FASchema = z.object({
  body: z.object({
    token: z.string().length(6, 'Code must be 6 digits'),
  }),
});

// Login step 2 (Verification)
export const login2FASchema = z.object({
  body: z.object({
    email: z.string().email(),
    token: z.string().length(6, 'Code must be 6 digits'),
  }),
});