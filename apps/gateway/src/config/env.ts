import { validateEnv, z } from '@ms/config';

const schema = z.object({
  GATEWAY_PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  GATEWAY_HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  USER_SERVICE_URL: z.string().url(),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).default('100'),
  RATE_LIMIT_TIME_WINDOW: z.string().regex(/^\d+$/).transform(Number).default('60000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
});

export type GatewayEnv = z.infer<typeof schema>;
export const env = validateEnv(schema);
