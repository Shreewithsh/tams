import { createHmac, timingSafeEqual } from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generates a signed HS256 JWT.
 */
export function generateAccessToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds = 7 * 24 * 60 * 60,
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(fullPayload));
  const signingInput = `${header}.${body}`;
  const sig = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${sig}`;
}

/**
 * Verifies and decodes a JWT.
 * Throws if the signature is invalid or the token is expired.
 */
export function verifyToken(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

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
    throw new Error('Invalid JWT signature');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp !== undefined && payload.exp < now) throw new Error('JWT has expired');

  return payload;
}
