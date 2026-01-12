import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zyndrx Platform API',
      version: '1.0.0',
      description: 'Project Management & Development Coordination Platform API Documentation',
      contact: {
        name: 'Zyndrx Support',
        email: 'support@zyndrx.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://zyndrx-backend-blgx.onrender.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            fullName: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['admin', 'developer', 'pm', 'qa', 'devops'],
            },
            avatarUrl: {
              type: 'string',
              nullable: true,
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            company_id: {
              type: 'string',
              format: 'uuid',
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
            },
            status: {
              type: 'string',
              enum: ['active', 'archived', 'completed'],
            },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'in_review', 'completed', 'blocked'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            project_id: {
              type: 'string',
              format: 'uuid',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.controller.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
