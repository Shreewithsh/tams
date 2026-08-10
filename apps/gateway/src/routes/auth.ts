import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '@ms/shared';
import type { UserServiceClient } from '../clients/user-service-client.js';

const RegisterBodySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

interface AuthRoutesOptions {
  userServiceClient: UserServiceClient;
}

export async function authRoutes(
  fastify: FastifyInstance,
  options: AuthRoutesOptions,
): Promise<void> {
  /**
   * POST /api/v1/auth/register
   *
   * Public endpoint. No JWT required.
   * Validates the body, forwards to User Service, returns 201 + JWT.
   */
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = RegisterBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.issues);
    }

    const result = await options.userServiceClient.register(parsed.data, request.id);

    await reply.status(201).send({
      user: result.user,
      accessToken: result.accessToken,
    });
  });
}
