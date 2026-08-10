/**
 * NATS subject for user creation events.
 * Published by User Service, consumed by Notification Service.
 */
export const SUBJECTS = {
  USER_CREATED: 'users.created',
  NOTIFICATIONS_DLQ: 'notifications.dlq',
} as const;

/**
 * JetStream stream name for user-related events.
 */
export const STREAMS = {
  USER_EVENTS: 'USER_EVENTS',
} as const;

/**
 * Durable consumer name used by the Notification Service.
 */
export const CONSUMERS = {
  NOTIFICATION_SERVICE: 'notification-service-consumer',
} as const;

export const EVENT_TYPES = {
  USER_CREATED: 'user.created',
} as const;
