import { request as undiciRequest } from 'undici';
import { createLogger, ServiceUnavailableError, ConflictError, ValidationError } from '@ms/shared';
import { env } from '../config/env.js';

const logger = createLogger({ name: 'user-service-client' });

export interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterUserResult {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  accessToken: string;
}

export interface UserProfileResult {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * HTTP client for calling the internal User Service.
 *
 * ARCHITECTURE NOTE:
 * - Client → Gateway: HTTP/REST (public)
 * - Gateway → User Service: HTTP/REST (internal Docker network only)
 * - User Service → Notification Service: NATS JetStream (never HTTP)
 *
 * The Gateway forwards the authenticated userId via X-User-Id.
 * User Service trusts this header because it is unreachable from outside.
 */
export class UserServiceClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = env.USER_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async register(
    payload: RegisterUserPayload,
    requestId: string,
  ): Promise<RegisterUserResult> {
    try {
      const { statusCode, body } = await undiciRequest(`${this.baseUrl}/users/register`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-request-id': requestId,
        },
        body: JSON.stringify(payload),
      });

      const data = await body.json() as Record<string, unknown>;

      if (statusCode === 409) {
        throw new ConflictError((data['message'] as string) ?? 'User already exists');
      }
      if (statusCode === 400) {
        throw new ValidationError((data['message'] as string) ?? 'Validation failed', data['details']);
      }
      if (statusCode !== 201) {
        logger.error({ statusCode, data }, 'Unexpected response from User Service (register)');
        throw new ServiceUnavailableError('User Service');
      }

      return data as unknown as RegisterUserResult;
    } catch (err) {
      if (err instanceof ConflictError || err instanceof ValidationError) throw err;
      logger.error({ err }, 'Failed to call User Service (register)');
      throw new ServiceUnavailableError('User Service');
    }
  }

  async getProfile(userId: string, requestId: string): Promise<UserProfileResult> {
    try {
      const { statusCode, body } = await undiciRequest(`${this.baseUrl}/users/me`, {
        method: 'GET',
        headers: {
          'x-user-id': userId,
          'x-request-id': requestId,
        },
      });

      const data = await body.json() as Record<string, unknown>;

      if (statusCode === 404) {
        throw new Error('User not found');
      }
      if (statusCode !== 200) {
        logger.error({ statusCode, data }, 'Unexpected response from User Service (profile)');
        throw new ServiceUnavailableError('User Service');
      }

      return data as unknown as UserProfileResult;
    } catch (err) {
      if (err instanceof ServiceUnavailableError) throw err;
      logger.error({ err }, 'Failed to call User Service (profile)');
      throw new ServiceUnavailableError('User Service');
    }
  }
}
