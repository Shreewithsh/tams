import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { isAppError, createLogger } from '@ms/shared';
import { ZodError } from 'zod';

const logger = createLogger({ name: 'error-handler' });

export function buildErrorHandler() {
  return function errorHandler(
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    const requestId = request.id;

    if (error instanceof ZodError) {
      void reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues,
        requestId,
      });
      return;
    }

    if (isAppError(error)) {
      if (error.isOperational) {
        logger.warn({ requestId, code: error.code, statusCode: error.statusCode }, error.message);
      } else {
        logger.error({ requestId, err: error }, 'Non-operational application error');
      }
      void reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        code: error.code,
        message: error.message,
        requestId,
      });
      return;
    }

    // Unhandled/unexpected error — do not expose internals to clients.
    logger.error({ requestId, err: error }, 'Unhandled error');
    void reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    });
  };
}
