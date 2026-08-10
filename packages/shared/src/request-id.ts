import { randomUUID } from 'crypto';

/**
 * Generates a UUID v4 for use as a request/correlation ID.
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Extracts the correlation ID from a request header, or generates a new one.
 */
export function resolveCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  const header = headers['x-correlation-id'] ?? headers['x-request-id'];
  if (Array.isArray(header)) {
    return header[0] ?? generateRequestId();
  }
  return header ?? generateRequestId();
}
