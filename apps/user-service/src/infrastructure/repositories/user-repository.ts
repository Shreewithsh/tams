import { PrismaClient } from '@prisma/client';
import type { User } from '../../domain/user.js';

/**
 * Repository interface — the application layer depends on this abstraction,
 * not on Prisma directly. This makes testing trivial via mock implementations.
 */
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}

export interface CreateUserData {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * Prisma-backed implementation of IUserRepository.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
