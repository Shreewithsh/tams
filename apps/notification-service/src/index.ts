import { env } from './config/env.js';
import { NotificationConsumer } from './messaging/consumer.js';
import { MockNotificationProvider } from './providers/mock-notification-provider.js';
import { createLogger } from '@ms/shared';

const logger = createLogger({ name: 'notification-service:main' });

async function main(): Promise<void> {
  logger.info('Starting Notification Service...');

  const provider = new MockNotificationProvider();
  const consumer = new NotificationConsumer(env, provider);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    try {
      await consumer.stop();
      logger.info('Notification Service shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await consumer.start();
  logger.info('Notification Service is running and consuming events');
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start Notification Service');
  process.exit(1);
});
