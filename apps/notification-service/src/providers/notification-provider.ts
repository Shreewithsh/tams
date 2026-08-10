import type { UserCreatedEvent } from '@ms/contracts';

/**
 * NotificationProvider interface.
 *
 * DESIGN: The Notification Service depends on this interface, not on any
 * specific email/SMS provider. Swapping providers requires only a new
 * class that implements this interface — the consumer logic never changes.
 *
 * Supported providers that can be plugged in:
 *   - MockNotificationProvider  (default, no external calls)
 *   - SendGridNotificationProvider
 *   - AwsSesNotificationProvider
 *   - TwilioNotificationProvider
 */
export interface NotificationProvider {
  sendWelcomeNotification(event: UserCreatedEvent): Promise<void>;
}
