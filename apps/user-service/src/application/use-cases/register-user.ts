import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { createLogger } from '@ms/shared';
import { createUserCreatedEvent } from '@ms/contracts';
import type { IUserRepository } from '../../infrastructure/repositories/user-repository.js';
import type { IEventPublisher } from '../../infrastructure/messaging/event-publisher.js';
import type { RegisterUserInput, RegisterUserResponse } from '../schemas.js';
import { UserAlreadyExistsError } from '../../domain/errors.js';
import { toUserProfile } from '../../domain/user.js';
import { generateAccessToken } from '../../infrastructure/auth/jwt.js';

const logger = createLogger({ name: 'register-user' });

/**
 * RegisterUser use case.
 *
 * Flow:
 * 1. Check for duplicate email.
 * 2. Hash the password with Argon2id — plaintext never leaves this method.
 * 3. Persist the user.
 * 4. Publish `user.created` to NATS JetStream ONLY after the DB commit succeeds.
 * 5. Generate and return a JWT.
 *
 * SECURITY NOTE: The password hash is NEVER included in the published event.
 */
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly jwtSecret: string,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResponse> {
    // 1. Duplicate email check
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new UserAlreadyExistsError(input.email);
    }

    // 2. Hash the password — never store or transmit the plaintext
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MiB
      timeCost: 3,
      parallelism: 4,
    });

    // 3. Persist the user
    const userId = randomUUID();
    const user = await this.userRepository.create({
      id: userId,
      name: input.name,
      email: input.email,
      passwordHash,
    });

    logger.info({ userId: user.id }, 'User registered successfully');

    // 4. Publish event ONLY after successful DB write
    const event = createUserCreatedEvent(
      { userId: user.id, email: user.email, name: user.name },
      randomUUID(),
    );
    await this.eventPublisher.publishUserCreated(event);

    // 5. Generate access token
    const accessToken = generateAccessToken({ sub: user.id, email: user.email }, this.jwtSecret);

    return { user: toUserProfile(user), accessToken };
  }
}
