import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.js';
import { UserAlreadyExistsError } from '../../domain/errors.js';
import type { IUserRepository } from '../../infrastructure/repositories/user-repository.js';
import type { IEventPublisher } from '../../infrastructure/messaging/event-publisher.js';
import type { User } from '../../domain/user.js';
import * as argon2 from 'argon2';

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

function makeMockRepo(overrides?: Partial<IUserRepository>): IUserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (data) => ({
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    ...overrides,
  };
}

function makeMockPublisher(): IEventPublisher {
  return {
    publishUserCreated: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RegisterUserUseCase', () => {
  let repo: IUserRepository;
  let publisher: IEventPublisher;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    repo = makeMockRepo();
    publisher = makeMockPublisher();
    useCase = new RegisterUserUseCase(repo, publisher, JWT_SECRET);
  });

  it('should register a new user and return an access token', async () => {
    const result = await useCase.execute({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'securepassword123',
    });

    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.name).toBe('Alice');
    expect(result.accessToken).toBeDefined();
    expect(result.accessToken.split('.')).toHaveLength(3); // valid JWT
  });

  it('should hash the password with argon2id (never store plaintext)', async () => {
    const password = 'securepassword123';
    await useCase.execute({ name: 'Alice', email: 'alice@example.com', password });

    const createCall = vi.mocked(repo.create).mock.calls[0];
    expect(createCall).toBeDefined();
    const createArg = createCall![0];
    expect(createArg.passwordHash).not.toBe(password);

    // Verify the hash is a valid argon2 hash
    const isValid = await argon2.verify(createArg.passwordHash, password);
    expect(isValid).toBe(true);
  });

  it('should throw UserAlreadyExistsError for a duplicate email', async () => {
    const existingUser: User = {
      id: 'existing-id',
      name: 'Existing',
      email: 'alice@example.com',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo = makeMockRepo({ findByEmail: vi.fn().mockResolvedValue(existingUser) });
    useCase = new RegisterUserUseCase(repo, publisher, JWT_SECRET);

    await expect(
      useCase.execute({ name: 'Alice', email: 'alice@example.com', password: 'password123' }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it('should publish user.created event after DB commit', async () => {
    await useCase.execute({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(publisher.publishUserCreated).toHaveBeenCalledOnce();

    const eventArg = vi.mocked(publisher.publishUserCreated).mock.calls[0]![0];
    expect(eventArg.eventType).toBe('user.created');
    expect(eventArg.data.email).toBe('alice@example.com');
    expect(eventArg.data.name).toBe('Alice');
    // CRITICAL: password must NEVER appear in the event
    expect(JSON.stringify(eventArg)).not.toContain('password');
    expect(JSON.stringify(eventArg)).not.toContain('passwordHash');
  });

  it('should NOT publish event if DB create fails', async () => {
    repo = makeMockRepo({ create: vi.fn().mockRejectedValue(new Error('DB error')) });
    useCase = new RegisterUserUseCase(repo, publisher, JWT_SECRET);

    await expect(
      useCase.execute({ name: 'Alice', email: 'alice@example.com', password: 'password123' }),
    ).rejects.toThrow('DB error');

    expect(publisher.publishUserCreated).not.toHaveBeenCalled();
  });
});
