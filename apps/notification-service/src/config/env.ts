import { validateEnv, z } from '@ms/config';

const schema = z.object({
  NATS_URL: z.string().default('nats://localhost:4222'),
  NATS_STREAM_NAME: z.string().default('USER_EVENTS'),
  NATS_CONSUMER_NAME: z.string().default('notification-service-consumer'),
  NATS_MAX_DELIVER: z.string().regex(/^\d+$/).transform(Number).default('5'),
  NATS_ACK_WAIT_SECONDS: z.string().regex(/^\d+$/).transform(Number).default('30'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
});

export type NotificationEnv = z.infer<typeof schema>;
export const env = validateEnv(schema);
