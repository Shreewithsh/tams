import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedError } from '@ms/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Used by the Gateway to authenticate incoming requests.
 *
 * SECURITY: JWTs are never logged. Verification uses timing-safe comparison.
 */
export function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedError('Invalid token format');

  const [header, body, signature] = parts as [string, string, string];
  const signingInput = `${header}.${body}`;

  const expectedSig = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const expBuf = Buffer.from(expectedSig);
  const actBuf = Buffer.from(signature);

  if (expBuf.length !== actBuf.length || !timingSafeEqual(expBuf, actBuf)) {
    throw new UnauthorizedError('Invalid token signature');
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Malformed token payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new UnauthorizedError('Token has expired');

  return payload;
}

/**
 * Extracts the Bearer token from an Authorization header.
 */
export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  return authHeader.slice(7);
}
