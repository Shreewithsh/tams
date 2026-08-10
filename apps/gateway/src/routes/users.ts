import type { FastifyInstance } from 'fastify';
import { verifyJwt, extractBearerToken } from '../auth/jwt.js';
import type { UserServiceClient } from '../clients/user-service-client.js';
import { env } from '../config/env.js';

interface UserRoutesOptions {
  userServiceClient: UserServiceClient;
}

export async function userRoutes(
  fastify: FastifyInstance,
  options: UserRoutesOptions,
): Promise<void> {
  /**
   * GET /api/v1/users/me
   *
   * Protected: requires a valid JWT in the Authorization header.
   *
   * IDENTITY PROPAGATION:
   * 1. Gateway extracts the Bearer token from Authorization header.
   * 2. Gateway verifies the JWT signature and expiry.
   * 3. Gateway reads the `sub` claim (userId) from the verified payload.
   * 4. Gateway forwards userId to User Service via X-User-Id header.
   * 5. User Service trusts X-User-Id because it is on an internal network.
   *
   * Client-provided user IDs are never trusted — only the Gateway-forwarded
   * header (derived from the verified JWT) is used.
   */
  fastify.get('/api/v1/users/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = extractBearerToken(authHeader);
    const payload = verifyJwt(token, env.JWT_SECRET);

    const profile = await options.userServiceClient.getProfile(payload.sub, request.id);
    await reply.status(200).send(profile);
  });
}
