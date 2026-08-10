import { createLogger } from '@ms/shared';
import type { IUserRepository } from '../../infrastructure/repositories/user-repository.js';
import type { UserProfileResponse } from '../schemas.js';
import { UserNotFoundError } from '../../domain/errors.js';
import { toUserProfile } from '../../domain/user.js';

const logger = createLogger({ name: 'get-user-profile' });

export class GetUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      logger.warn({ userId }, 'User profile not found');
      throw new UserNotFoundError(userId);
    }
    return toUserProfile(user);
  }
}
