import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { createLogger } from '@ms/shared';
import { env } from './config/env.js';
import { buildErrorHandler } from './http/middleware/error-handler.js';
import { healthRoutes } from './http/routes/health.js';
import { userRoutes } from './http/routes/users.js';
import { PrismaUserRepository } from './infrastructure/repositories/user-repository.js';
import { NatsEventPublisher } from './infrastructure/messaging/event-publisher.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.js';
import { GetUserProfileUseCase } from './application/use-cases/get-user-profile.js';
import { prisma } from './infrastructure/database/prisma-client.js';
import type { JetStreamClient } from 'nats';

const logger = createLogger({ name: 'user-service' });

export async function buildServer(js: JetStreamClient) {
  const fastify = Fastify({
    logger: false,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
  });

  await fastify.register(helmet, { global: true });
  await fastify.register(cors, { origin: false }); // Internal only

  // Dependency wiring
  const userRepository = new PrismaUserRepository(prisma);
  const eventPublisher = new NatsEventPublisher(js);
  const registerUserUseCase = new RegisterUserUseCase(userRepository, eventPublisher, env.JWT_SECRET);
  const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(userRoutes, { registerUserUseCase, getUserProfileUseCase });

  // Global error handler
  fastify.setErrorHandler(buildErrorHandler());

  // Request/response logging
  fastify.addHook('onRequest', (request, _reply, done) => {
    logger.info(
      { requestId: request.id, method: request.method, url: request.url },
      'Incoming request',
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
      'Request completed',
    );
    done();
  });

  return fastify;
}
