import type { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, reply) => {
    await reply.status(200).send({
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/ready', async (_request, reply) => {
    // Gateway is ready when it can start listening.
    // Deeper readiness (User Service reachability) is handled by compose healthchecks.
    await reply.status(200).send({
      status: 'ready',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    });
  });
}
