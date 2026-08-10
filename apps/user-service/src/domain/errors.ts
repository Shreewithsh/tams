import { ConflictError, NotFoundError } from '@ms/shared';

export class UserAlreadyExistsError extends ConflictError {
  constructor(email: string) {
    super(`A user with email '${email}' already exists`);
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`User with id '${id}'`);
  }
}
