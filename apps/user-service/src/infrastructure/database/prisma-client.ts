import { PrismaClient } from '@prisma/client';
import { createLogger } from '@ms/shared';
import { env } from '../../config/env.js';

const logger = createLogger({ name: 'prisma' });

/**
 * Singleton Prisma client.
 * Log levels are configured based on NODE_ENV.
 */
export const prisma = new PrismaClient({
  log:
    env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connection established');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}
