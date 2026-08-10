import { connectDatabase, disconnectDatabase } from './infrastructure/database/prisma-client.js';
import { createNatsConnection } from './infrastructure/messaging/nats-client.js';
import { buildServer } from './server.js';
import { createLogger } from '@ms/shared';
import { env } from './config/env.js';

const logger = createLogger({ name: 'user-service:main' });

async function main(): Promise<void> {
  logger.info('Starting User Service...');

  await connectDatabase();

  const { nc, js } = await createNatsConnection(env.NATS_URL);

  const server = await buildServer(js);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    try {
      await server.close();
      await nc.drain();
      await disconnectDatabase();
      logger.info('User Service shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await server.listen({ port: env.USER_SERVICE_PORT, host: env.USER_SERVICE_HOST });
  logger.info({ port: env.USER_SERVICE_PORT, host: env.USER_SERVICE_HOST }, 'User Service is running');
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start User Service');
  process.exit(1);
});
