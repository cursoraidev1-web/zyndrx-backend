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
import projectsRoutes from './modules/projects/projects.routes';
import prdRoutes from './modules/prd/prd.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import documentsRoutes from './modules/documents/documents.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import githubRoutes from './modules/github/github.routes';

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

    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

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
    this.app.use(`${apiPrefix}/projects`, projectsRoutes);
    this.app.use(`${apiPrefix}/prds`, prdRoutes);
    this.app.use(`${apiPrefix}/tasks`, tasksRoutes);
    this.app.use(`${apiPrefix}/documents`, documentsRoutes);
    this.app.use(`${apiPrefix}/notifications`, notificationsRoutes);
    this.app.use(`${apiPrefix}/analytics`, analyticsRoutes);
    this.app.use(`${apiPrefix}/github`, githubRoutes);

    // Welcome route
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Welcome to Zyndrx API',
        version: config.server.apiVersion,
        documentation: '/api-docs', // Future: Add Swagger docs
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
