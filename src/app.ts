import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limit.middleware';
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

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration (IMPORTANT FOR FRONTEND!)
    this.app.use(
      cors({
        origin: config.cors.allowedOrigins, // Your frontend URLs
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-github-event', 'x-hub-signature-256'], // Added GitHub headers
      })
    );

    // Trust proxy for correct redirect URLs in production
    this.app.set('trust proxy', true);

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
    this.app.get('/health', (req, res) => {
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

    // Welcome route (API Directory)
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Welcome to Zyndrx API',
        version: config.server.apiVersion,
        endpoints: {
          health: '/health',
          auth: `${apiPrefix}/auth`,
          projects: `${apiPrefix}/projects`,
          prds: `${apiPrefix}/prds`,
          tasks: `${apiPrefix}/tasks`,       // <--- ADDED
          github: `${apiPrefix}/github`,     // <--- ADDED
          notifications: `${apiPrefix}/notifications`,
          documents: `${apiPrefix}/documents`,
          analytics: `${apiPrefix}/analytics`,
          teams: `${apiPrefix}/teams`,
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