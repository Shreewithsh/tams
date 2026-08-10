import pino from 'pino';

export interface LoggerOptions {
  name: string;
  level?: string;
}

/**
 * Creates a structured pino logger instance.
 * Outputs clean JSON logs.
 */
export function createLogger(options: LoggerOptions): pino.Logger {
  return pino({
    name: options.name,
    level: options.level ?? process.env['LOG_LEVEL'] ?? 'info',
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
