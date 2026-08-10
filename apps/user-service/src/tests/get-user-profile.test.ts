import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserProfileUseCase } from '../../application/use-cases/get-user-profile.js';
import { UserNotFoundError } from '../../domain/errors.js';
import type { IUserRepository } from '../../infrastructure/repositories/user-repository.js';
import type { User } from '../../domain/user.js';

const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  passwordHash: 'argon2id$hash',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('GetUserProfileUseCase', () => {
  let repo: IUserRepository;
  let useCase: GetUserProfileUseCase;

  beforeEach(() => {
    repo = {
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockUser),
      create: vi.fn(),
    };
    useCase = new GetUserProfileUseCase(repo);
  });

  it('should return a user profile without the password hash', async () => {
    const profile = await useCase.execute(mockUser.id);

    expect(profile.id).toBe(mockUser.id);
    expect(profile.name).toBe(mockUser.name);
    expect(profile.email).toBe(mockUser.email);
    // passwordHash must not appear in the profile
    expect(JSON.stringify(profile)).not.toContain('passwordHash');
    expect(JSON.stringify(profile)).not.toContain('argon2id');
  });

  it('should throw UserNotFoundError when user does not exist', async () => {
    repo = {
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    };
    useCase = new GetUserProfileUseCase(repo);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(UserNotFoundError);
  });
});
