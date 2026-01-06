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
    themePreference: z.enum(['light', 'dark', 'auto']).optional(),
  }),
});

// AVATAR UPLOAD TOKEN VALIDATION (mirrors documents upload-token pattern)
export const avatarUploadTokenSchema = z.object({
  body: z.object({
    file_name: z.string().min(1, 'File name is required'),
    file_size: z.number().int().positive('File size must be positive'),
    file_type: z.string().min(1, 'File type is required'),
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
    // Can be either a 6-digit TOTP code OR a recovery code (e.g. XXXX-XXXX-XXXX)
    token: z.string().min(6, 'Code is required').max(64, 'Code too long'),
  }),
});

// Disable 2FA (requires either TOTP or recovery code)
export const disable2FASchema = z.object({
  body: z.object({
    token: z.string().min(6, 'Code is required').max(64, 'Code too long'),
  }),
});

// Regenerate recovery codes (requires a valid TOTP)
export const regenerateRecoveryCodesSchema = z.object({
  body: z.object({
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
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    token: z.string().min(1), // Custom reset token from email link
  }),
});

// CHANGE PASSWORD VALIDATION
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
      .refine((pwd) => !pwd.includes(' '), 'Password cannot contain spaces'),
  }),
});

// SWITCH COMPANY VALIDATION
export const switchCompanySchema = z.object({
  body: z.object({
    company_id: z.string().uuid('Invalid company ID format'),
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