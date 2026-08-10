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

if (env.NODE_ENV === 'development') {
  // @ts-expect-error — Prisma event types are correctly typed at runtime
  prisma.$on('query', (e: { query: string; duration: number }) => {
    logger.debug({ query: e.query, duration: e.duration }, 'Prisma query');
  });
}

// @ts-expect-error — Prisma event types are correctly typed at runtime
prisma.$on('warn', (e: { message: string }) => {
  logger.warn({ message: e.message }, 'Prisma warning');
});

// @ts-expect-error — Prisma event types are correctly typed at runtime
prisma.$on('error', (e: { message: string }) => {
  logger.error({ message: e.message }, 'Prisma error');
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connection established');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}
