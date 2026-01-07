import dotenv from 'dotenv';
import { z } from 'zod';
 
dotenv.config();
 
// Environment variables validation schema
const envSchema = z.object({
  // Server
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_VERSION: z.string().default('v1'),
 
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
 
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
 
  // Security
  BCRYPT_ROUNDS: z.string().default('10'),
 
  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
 
  // GitHub (optional for MVP)
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_PRIVATE_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Frontend redirect URL (for OAuth callbacks)
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
 
  // Email - Postmark (recommended) or SMTP fallback
  POSTMARK_API_KEY: z.string().optional(), // Postmark Server API Token
  POSTMARK_MESSAGE_STREAM: z.string().optional(), // Postmark Message Stream (e.g., "allzyndrx")
  // Email (SMTP - supports Gmail, SendGrid, Mailgun, AWS SES, etc.)
  SMTP_USER: z.string().optional(), // Gmail: your email, SendGrid: 'apikey', Mailgun: your username
  SMTP_PASSWORD: z.string().optional(), // Gmail: App Password, SendGrid: API key, Mailgun: password
  EMAIL_FROM: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.string()
      .refine(
        (val) => {
          // Allow format: "Name <email@domain.com>" or just "email@domain.com"
          const emailMatch = val.match(/<([^>]+)>/) || [null, val];
          const email = emailMatch[1] || val;
          return z.string().email().safeParse(email).success;
        },
        { message: 'Must be a valid email address or in format "Name <email@domain.com>"' }
      )
      .default('noreply@zyndrx.com')
  ),
  // SMTP Settings (supports any SMTP provider)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_SECURE: z.string().default('false'), // 'true' for SSL (port 465), 'false' for TLS (port 587)
  
  // Legacy Gmail support (for backward compatibility)
  GMAIL_USER: z.string().email().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),

  // Push Notifications (VAPID keys)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().email().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  RATE_LIMIT_PER_USER_PER_MINUTE: z.string().default('60'), // Per-user per-minute limit
});
 
// Validate and parse environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};
 
const env = parseEnv();
 
export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    apiVersion: env.API_VERSION,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
  },
  supabase: {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: env.SUPABASE_ANON_KEY,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  security: {
    bcryptRounds: parseInt(env.BCRYPT_ROUNDS, 10),
  },
  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
  },
  github: {
    webhookSecret: env.GITHUB_WEBHOOK_SECRET,
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_PRIVATE_KEY,
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
  frontend: {
    url: env.FRONTEND_URL,
  },
  email: {
    // Postmark API key (preferred - works immediately, no domain needed)
    postmarkApiKey: env.POSTMARK_API_KEY,
    postmarkMessageStream: env.POSTMARK_MESSAGE_STREAM,
    // Use SMTP_USER/SMTP_PASSWORD if provided, otherwise fall back to GMAIL_USER/GMAIL_APP_PASSWORD for backward compatibility
    smtpUser: env.SMTP_USER || env.GMAIL_USER,
    smtpPassword: env.SMTP_PASSWORD || env.GMAIL_APP_PASSWORD,
    fromAddress: env.EMAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT, 10),
      secure: env.SMTP_SECURE === 'true', // true for 465, false for other ports
    },
  },
  push: {
    vapidPublicKey: env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: env.VAPID_PRIVATE_KEY,
    vapidEmail: env.VAPID_EMAIL,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
} as const;
 
export default config;