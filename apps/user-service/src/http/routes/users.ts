import type { FastifyInstance } from 'fastify';
import { RegisterUserSchema } from '../../application/schemas.js';
import type { RegisterUserUseCase } from '../../application/use-cases/register-user.js';
import type { GetUserProfileUseCase } from '../../application/use-cases/get-user-profile.js';
import { ValidationError } from '@ms/shared';

interface UserRoutesOptions {
  registerUserUseCase: RegisterUserUseCase;
  getUserProfileUseCase: GetUserProfileUseCase;
}

/**
 * USER IDENTITY PROPAGATION:
 * The API Gateway validates the JWT and extracts the userId from the `sub` claim.
 * It then forwards the userId to the User Service via the `X-User-Id` header.
 * The User Service trusts this header because it is on an internal network
 * and is NOT publicly exposed — only the Gateway can reach it.
 *
 * This means:
 *  - The Gateway owns JWT validation.
 *  - The User Service never sees raw JWTs from clients.
 *  - Client-supplied user IDs are never trusted; only Gateway-forwarded IDs are used.
 */
export async function userRoutes(
  fastify: FastifyInstance,
  options: UserRoutesOptions,
): Promise<void> {
  /**
   * POST /users/register
   * Internal: called by the API Gateway after basic validation.
   */
  fastify.post('/users/register', async (request, reply) => {
    const parsed = RegisterUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid registration payload', parsed.error.issues);
    }

    const result = await options.registerUserUseCase.execute(parsed.data);

    await reply.status(201).send({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        createdAt: result.user.createdAt,
      },
      accessToken: result.accessToken,
    });
  });

  /**
   * GET /users/me
   * The authenticated user's userId is forwarded from the Gateway via X-User-Id.
   */
  fastify.get('/users/me', async (request, reply) => {
    const userId = (request.headers as Record<string, string | undefined>)['x-user-id'];
    if (!userId) {
      throw new ValidationError('X-User-Id header is required');
    }

    const profile = await options.getUserProfileUseCase.execute(userId);
    await reply.status(200).send(profile);
  });
}
