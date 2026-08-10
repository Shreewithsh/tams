import { z } from 'zod';
import { EVENT_TYPES } from '../constants.js';

/**
 * Zod schema for the `user.created` domain event.
 *
 * SECURITY: The password hash is intentionally excluded.
 * This schema is the canonical contract shared between
 * User Service (publisher) and Notification Service (consumer).
 */
export const UserCreatedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal(EVENT_TYPES.USER_CREATED),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
  data: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1),
  }),
});

export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>;

/**
 * Factory to create a validated UserCreatedEvent.
 */
export function createUserCreatedEvent(
  data: UserCreatedEvent['data'],
  eventId: string,
): UserCreatedEvent {
  return {
    eventId,
    eventType: EVENT_TYPES.USER_CREATED,
    occurredAt: new Date().toISOString(),
    version: 1,
    data,
  };
}
