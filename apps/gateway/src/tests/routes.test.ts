import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../server.js';
import type { FastifyInstance } from 'fastify';

// Mock the UserServiceClient before importing server
vi.mock('../../clients/user-service-client.js', () => {
  return {
    UserServiceClient: vi.fn().mockImplementation(() => ({
      register: vi.fn().mockResolvedValue({
        user: { id: 'uuid-123', name: 'Alice', email: 'alice@example.com', createdAt: new Date().toISOString() },
        accessToken: 'mock.jwt.token',
      }),
      getProfile: vi.fn().mockResolvedValue({
        id: 'uuid-123',
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date().toISOString(),
      }),
    })),
  };
});

describe('Gateway API routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should forward valid registration to User Service and return 201', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          name: 'Alice',
          email: 'alice@example.com',
          password: 'securepassword123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as { accessToken: string; user: { email: string } };
      expect(body.accessToken).toBeDefined();
      expect(body.user.email).toBe('alice@example.com');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { name: 'Alice' }, // missing email and password
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for password too short', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { name: 'Alice', email: 'a@b.com', password: '123' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const response = await server.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /ready', () => {
    it('should return 200 with ready status', async () => {
      const response = await server.inject({ method: 'GET', url: '/ready' });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should return 401 for missing Authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/users/me',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: { authorization: 'Bearer invalid.token.here' },
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
