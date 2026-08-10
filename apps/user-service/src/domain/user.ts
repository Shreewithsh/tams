/**
 * Domain model for a User.
 * This is a pure domain object, independent of Prisma or any ORM.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public representation of a user — never includes the password hash.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * Maps a full User domain object to a public UserProfile.
 */
export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}
