import { z } from 'zod';
 
// REGISTRATION VALIDATION
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
      .refine((pwd) => !pwd.includes(' '), 'Password cannot contain spaces')
      .refine((pwd) => {
        const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', 'password123'];
        const lowerPwd = pwd.toLowerCase();
        return !commonPatterns.some(pattern => lowerPwd.includes(pattern));
      }, 'Password cannot contain common patterns'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    companyName: z.string().min(1, 'Company name is required').max(100, 'Company name too long').optional(),
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer']).optional(),
    invitationToken: z.string().optional(), // For accepting company invitations
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
    accessToken: z.string().min(1, 'Access token is required').optional(),
    code: z.string().optional(), // For code exchange flow
    redirect_uri: z.string().url().optional(), // For code exchange flow
  }),
});

// OAuth Session Exchange Validation (for Supabase OAuth)
export const oauthSessionSchema = z.object({
  body: z.object({
    accessToken: z.string().min(1, 'Supabase access token is required'),
    companyName: z.string().min(1).max(100, 'Company name too long').optional(),
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
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
      .refine((pwd) => !pwd.includes(' '), 'Password cannot contain spaces'),
    accessToken: z.string().min(1), // Supabase sends this via email link
  }),
});

// ADMIN: CREATE USER VALIDATION
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
      .refine((pwd) => !pwd.includes(' '), 'Password cannot contain spaces')
      .refine((pwd) => {
        const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', 'password123'];
        const lowerPwd = pwd.toLowerCase();
        return !commonPatterns.some(pattern => lowerPwd.includes(pattern));
      }, 'Password cannot contain common patterns'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    role: z.enum(['admin', 'product_manager', 'developer', 'qa', 'devops', 'designer']).optional(),
    companyRole: z.enum(['admin', 'member', 'viewer']).optional(),
  }),
  params: z.object({
    companyId: z.string().uuid('Invalid company ID'),
  }),
});