import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import fastifyRawBody from 'fastify-raw-body';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import healthRoutes from './routes/v1/health.js';
import authRoutes from './routes/v1/auth.routes.js';
import employeeRoutes from './routes/v1/employees.routes.js';
import clickUpWebhookRoutes from './routes/v1/webhooks/clickup.routes.js';
import teamsWebhookRoutes from './routes/v1/webhooks/teams.routes.js';
import organizationRoutes from './routes/v1/organizations.routes.js';
import dashboardsRoutes from './routes/v1/dashboards.routes.js';
import reportsRoutes from './routes/v1/reports.routes.js';

const fastify = Fastify({
  loggerInstance: logger,
  // Add 431 Request Header Fields Too Large handler support for large tokens
  maxParamLength: 1000
});

async function startServer() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true // In production, this should be restricted to the specific frontend domains
    });
    await fastify.register(helmet, {
      contentSecurityPolicy: false // We need this off to serve Swagger UI
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    // Register raw-body BEFORE other plugins to ensure it captures the raw buffer
    await fastify.register(fastifyRawBody, {
      field: 'rawBody',
      global: false, // We only enable it per-route (e.g. webhooks)
      encoding: 'utf8',
      runFirst: true
    });

    // Configure JWT
    if (!env.JWT_SECRET) {
      logger.fatal('JWT_SECRET is required');
      process.exit(1);
    }

    await fastify.register(fastifyJwt, {
      secret: env.JWT_SECRET,
      sign: {
        expiresIn: '8h'
      }
    });

    // Centralized error handling
    fastify.setErrorHandler(function (error: FastifyError, request, reply) {
      this.log.error(error);
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
        statusCode: error.statusCode || 500,
        reqId: request.id
      });
    });

    // Swagger documentation
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'TaskFlow API',
          description: 'Production-Grade ClickUp + Microsoft Teams Task Management System API',
          version: '1.0.0'
        },
        servers: [
          {
            url: `http://localhost:${env.PORT}`,
            description: 'Local development server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs'
    });

    // Register API v1 routes
    fastify.register(
      async (api) => {
        api.register(healthRoutes);
        api.register(authRoutes, { prefix: '/auth' });
        api.register(employeeRoutes, { prefix: '/employees' });
        api.register(organizationRoutes, { prefix: '/organizations' });
        api.register(dashboardsRoutes, { prefix: '/dashboards' });
        api.register(reportsRoutes, { prefix: '/reports' });
        api.register(clickUpWebhookRoutes, { prefix: '/webhooks/clickup' });
        api.register(teamsWebhookRoutes, { prefix: '/webhooks/teams' });
      },
      { prefix: '/api/v1' }
    );

    // Start server
    await fastify.listen({ port: parseInt(env.PORT, 10), host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
