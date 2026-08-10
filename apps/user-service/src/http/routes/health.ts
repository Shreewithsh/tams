import type { FastifyInstance } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma-client.js';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, reply) => {
    await reply.status(200).send({ status: 'ok', service: 'user-service' });
  });

  fastify.get('/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await reply.status(200).send({ status: 'ready', service: 'user-service' });
    } catch {
      await reply.status(503).send({ status: 'not ready', service: 'user-service' });
    }
  });
}
