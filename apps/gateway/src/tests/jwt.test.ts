import { describe, it, expect } from 'vitest';
import { verifyJwt, extractBearerToken } from '../../auth/jwt.js';
import { UnauthorizedError } from '@ms/shared';
import { createHmac } from 'crypto';

const SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

function makeToken(
  payload: Record<string, unknown>,
  secret: string = SECRET,
  expOffset = 3600,
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expOffset };
  const b64url = (s: string) =>
    Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(fullPayload));
  const sig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

describe('JWT authentication', () => {
  describe('verifyJwt', () => {
    it('should verify a valid token and return the payload', () => {
      const token = makeToken({ sub: 'user-123', email: 'alice@example.com' });
      const payload = verifyJwt(token, SECRET);
      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('alice@example.com');
    });

    it('should throw UnauthorizedError for a token with wrong secret', () => {
      const token = makeToken({ sub: 'user-123', email: 'a@b.com' }, 'wrong-secret-32-chars-padding');
      expect(() => verifyJwt(token, SECRET)).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for an expired token', () => {
      const token = makeToken({ sub: 'user-123', email: 'a@b.com' }, SECRET, -10);
      expect(() => verifyJwt(token, SECRET)).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for malformed token', () => {
      expect(() => verifyJwt('not.a.valid.jwt.here', SECRET)).toThrow(UnauthorizedError);
      expect(() => verifyJwt('invalid', SECRET)).toThrow(UnauthorizedError);
    });
  });

  describe('extractBearerToken', () => {
    it('should extract the token from a valid Authorization header', () => {
      const token = 'abc.def.ghi';
      expect(extractBearerToken(`Bearer ${token}`)).toBe(token);
    });

    it('should throw UnauthorizedError if header is missing', () => {
      expect(() => extractBearerToken(undefined)).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if header has wrong format', () => {
      expect(() => extractBearerToken('Token abc')).toThrow(UnauthorizedError);
      expect(() => extractBearerToken('abc')).toThrow(UnauthorizedError);
    });
  });
});
