import pino from 'pino';

export interface LoggerOptions {
  name: string;
  level?: string;
}

/**
 * Creates a structured pino logger instance.
 * Outputs JSON in production and pretty-prints in development.
 */
export function createLogger(options: LoggerOptions): pino.Logger {
  const isDev = process.env['NODE_ENV'] !== 'production';

  return pino({
    name: options.name,
    level: options.level ?? process.env['LOG_LEVEL'] ?? 'info',
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }),
    redact: {
      paths: ['password', 'passwordHash', 'token', 'authorization', '*.password', '*.token'],
      censor: '[REDACTED]',
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  });
}

export type Logger = pino.Logger;
