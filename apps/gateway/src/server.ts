import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createLogger } from '@ms/shared';
import { env } from './config/env.js';
import { buildErrorHandler } from './middleware/error-handler.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { UserServiceClient } from './clients/user-service-client.js';

const logger = createLogger({ name: 'api-gateway' });

export async function buildServer() {
  const fastify = Fastify({
    logger: false,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
  });

  // Security headers
  await fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: false, // API, not a browser app
  });

  // CORS
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.after / 1000)}s.`,
    }),
  });

  // Shared dependencies
  const userServiceClient = new UserServiceClient(env.USER_SERVICE_URL);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { userServiceClient });
  await fastify.register(userRoutes, { userServiceClient });

  // Global error handler
  fastify.setErrorHandler(buildErrorHandler());

  // Request logging
  fastify.addHook('onRequest', (request, _reply, done) => {
    logger.info(
      { requestId: request.id, method: request.method, url: request.url },
      'Gateway request',
    );
    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'Gateway response',
    );
    done();
  });

  return fastify;
}
