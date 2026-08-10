import { validateEnv, z } from '@ms/config';

const schema = z.object({
  USER_SERVICE_PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  USER_SERVICE_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  NATS_URL: z.string().default('nats://localhost:4222'),
  NATS_STREAM_NAME: z.string().default('USER_EVENTS'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
});

export type UserServiceEnv = z.infer<typeof schema>;
export const env = validateEnv(schema);
