import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limit.middleware';
import { sanitizeInput } from './middleware/sanitize.middleware';
import logger from './utils/logger';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import prdRoutes from './modules/prds/prd.routes';
import projectRoutes from './modules/projects/projects.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import githubRoutes from './modules/github/github.routes';
import notifRoutes from './modules/notifications/notifications.routes';
import docRoutes from './modules/documents/documents.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import teamRoutes from './modules/teams/teams.routes';
import companyRoutes from './modules/companies/companies.routes';
import subscriptionRoutes from './modules/subscriptions/subscriptions.routes';
import plansRoutes from './modules/subscriptions/subscriptions.public.routes';
import commentRoutes from './modules/comments/comments.routes';
import handoffRoutes from './modules/handoffs/handoffs.routes';
import activityRoutes from './modules/activity/activity.routes';
import userRoutes from './modules/users/users.routes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    // Trust proxy for correct redirect URLs in production (must be first)
    this.app.set('trust proxy', true);

    // CORS configuration (MUST BE BEFORE OTHER MIDDLEWARE for OPTIONS requests)
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) return callback(null, true);
          
          // Check if origin is in allowed list
          if (config.cors.allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            // In development, allow localhost with any port
            if (config.server.isDevelopment && origin.startsWith('http://localhost:')) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-github-event', 'x-hub-signature-256'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
      })
    );

    // Enhanced security headers with CSP
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for some libraries
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", config.supabase.url],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false, // Allow embedding for OAuth flows
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      })
    );

    // Input sanitization (must be before body parsing, but after CORS)
    this.app.use(sanitizeInput);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    if (config.server.isDevelopment) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(
        morgan('combined', {
          stream: {
            write: (message: string) => logger.info(message.trim()),
          },
        })
      );
    }

    // Rate limiting
    this.app.use(rateLimiter);
  }

  private configureRoutes(): void {
    const apiPrefix = `/api/${config.server.apiVersion}`;

    // Health check endpoint
    this.app.get('/health', (req: express.Request, res: express.Response) => {
      res.status(200).json({
        success: true,
        message: 'Zyndrx API is running',
        timestamp: new Date().toISOString(),
        environment: config.server.nodeEnv,
      });
    });

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/companies`, companyRoutes);
    this.app.use(`${apiPrefix}/projects`, projectRoutes);
    this.app.use(`${apiPrefix}/prds`, prdRoutes);
    this.app.use(`${apiPrefix}/tasks`, taskRoutes);
    this.app.use(`${apiPrefix}/github`, githubRoutes);
    this.app.use(`${apiPrefix}/notifications`, notifRoutes);
    this.app.use(`${apiPrefix}/documents`, docRoutes);
    this.app.use(`${apiPrefix}/analytics`, analyticsRoutes);
    this.app.use(`${apiPrefix}/teams`, teamRoutes);
    this.app.use(`${apiPrefix}/subscription`, subscriptionRoutes);
    this.app.use(`${apiPrefix}/plans`, plansRoutes); // Plans endpoint (public)
    this.app.use(`${apiPrefix}/comments`, commentRoutes);
    this.app.use(`${apiPrefix}/handoffs`, handoffRoutes);
    this.app.use(`${apiPrefix}/activity`, activityRoutes);
    this.app.use(`${apiPrefix}/users`, userRoutes);

    // Welcome route (API Directory)
    this.app.get('/', (req: express.Request, res: express.Response) => {
      res.status(200).json({
        success: true,
        message: 'Welcome to Zyndrx API',
        version: config.server.apiVersion,
        endpoints: {
          health: '/health',
          auth: `${apiPrefix}/auth`,
          companies: `${apiPrefix}/companies`,
          projects: `${apiPrefix}/projects`,
          prds: `${apiPrefix}/prds`,
          tasks: `${apiPrefix}/tasks`,
          github: `${apiPrefix}/github`,
          notifications: `${apiPrefix}/notifications`,
          documents: `${apiPrefix}/documents`,
          analytics: `${apiPrefix}/analytics`,
          teams: `${apiPrefix}/teams`,
          subscription: `${apiPrefix}/subscription`,
          plans: `${apiPrefix}/plans`,
          comments: `${apiPrefix}/comments`,
          handoffs: `${apiPrefix}/handoffs`,
          activity: `${apiPrefix}/activity`,
          users: `${apiPrefix}/users`,
        },
      });
    });
  }

  private configureErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      logger.info(`🚀 Zyndrx API server running on port ${port}`);
      logger.info(`📝 Environment: ${config.server.nodeEnv}`);
      logger.info(`🔗 API: http://localhost:${port}/api/${config.server.apiVersion}`);
    });
  }
}

export default App;