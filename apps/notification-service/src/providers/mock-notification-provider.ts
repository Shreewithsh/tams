import type { NotificationProvider } from './notification-provider.js';
import type { UserCreatedEvent } from '@ms/contracts';
import { createLogger } from '@ms/shared';

const logger = createLogger({ name: 'mock-notification-provider' });

/**
 * MockNotificationProvider — simulates sending notifications without any
 * external API calls. Safe to use in all environments including local dev.
 *
 * Replace this with SendGridNotificationProvider, AwsSesNotificationProvider,
 * or TwilioNotificationProvider to send real notifications.
 * The consumer code (JetStream handler) does NOT need to change.
 */
export class MockNotificationProvider implements NotificationProvider {
  async sendWelcomeNotification(event: UserCreatedEvent): Promise<void> {
    // Simulate a small processing delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    logger.info(
      {
        userId: event.data.userId,
        email: event.data.email,
        name: event.data.name,
      },
      '[MOCK] Sending welcome notification email',
    );

    // In production, this would call SendGrid / AWS SES / Twilio etc.
    // Example (SendGrid):
    //   await sgMail.send({
    //     to: event.data.email,
    //     from: 'noreply@example.com',
    //     subject: `Welcome, ${event.data.name}!`,
    //     text: `Your account has been created.`,
    //   });

    logger.info(
      { userId: event.data.userId },
      '[MOCK] Welcome notification sent successfully',
    );
  }
}
