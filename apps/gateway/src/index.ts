import { buildServer } from './server.js';
import { createLogger } from '@ms/shared';
import { env } from './config/env.js';

const logger = createLogger({ name: 'api-gateway:main' });

async function main(): Promise<void> {
  logger.info('Starting API Gateway...');

  const server = await buildServer();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    try {
      await server.close();
      logger.info('API Gateway shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await server.listen({ port: env.GATEWAY_PORT, host: env.GATEWAY_HOST });
  logger.info({ port: env.GATEWAY_PORT, host: env.GATEWAY_HOST }, 'API Gateway is running');
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start API Gateway');
  process.exit(1);
});
