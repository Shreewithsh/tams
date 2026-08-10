import { type JsMsg, StringCodec } from 'nats';
import { UserCreatedEventSchema } from '@ms/contracts';
import type { NotificationProvider } from '../providers/notification-provider.js';
import { createLogger } from '@ms/shared';

const logger = createLogger({ name: 'user-created-handler' });
const sc = StringCodec();

/**
 * Handles a `users.created` JetStream message.
 *
 * SUCCESS PATH:
 *   1. Decode and JSON-parse the message payload.
 *   2. Validate with Zod schema (UserCreatedEventSchema).
 *   3. Call the NotificationProvider.
 *   4. ACK the message — removes it from the consumer's pending set.
 *
 * FAILURE PATH (any step throws):
 *   - Do NOT ack. JetStream will redeliver after ackWait seconds.
 *   - After maxDeliver attempts, JetStream moves the message to the DLQ
 *     subject (notifications.dlq) via the consumer's DeadLetter config.
 *   - Each failure is logged with full context for observability.
 *
 * RETRY / DLQ FLOW (documented):
 *   - maxDeliver: 5 (configured on the durable consumer)
 *   - ackWait: 30 seconds (configured on the durable consumer)
 *   - On each failed attempt the message is redelivered with an incremented
 *     `num_delivered` counter visible in the message metadata.
 *   - After 5 failed deliveries, JetStream publishes the message to
 *     `notifications.dlq` so a separate process can inspect it.
 *   - We never call ack() on a failed message, which prevents infinite loops
 *     because JetStream's maxDeliver cap applies.
 */
export async function handleUserCreatedMessage(
  msg: JsMsg,
  provider: NotificationProvider,
): Promise<void> {
  const { redelivered, streamSequence, deliveryCount } = msg.info;

  logger.info(
    { seq: streamSequence, redelivered, deliveryCount },
    'Received users.created message',
  );

  let rawText: string;
  try {
    rawText = sc.decode(msg.data);
  } catch (err) {
    // Undecodable payload — nak immediately to let JetStream redeliver / DLQ.
    logger.error({ err, seq: streamSequence }, 'Failed to decode message payload');
    msg.nak();
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    logger.error({ err, seq: streamSequence }, 'Failed to JSON-parse message');
    msg.nak();
    return;
  }

  const validated = UserCreatedEventSchema.safeParse(parsed);
  if (!validated.success) {
    logger.error(
      { seq: streamSequence, issues: validated.error.issues },
      'Event payload failed Zod validation — sending to DLQ via nak',
    );
    // Validation failures are permanent — nak with a delay to avoid tight loops.
    msg.nak(30_000);
    return;
  }

  const event = validated.data;

  try {
    await provider.sendWelcomeNotification(event);
    // ACK ONLY on success — this is the explicit ack model.
    msg.ack();
    logger.info(
      { seq: streamSequence, userId: event.data.userId },
      'Message processed and acknowledged',
    );
  } catch (err) {
    // Processing failed — do NOT ack. JetStream will redeliver.
    logger.error(
      {
        err,
        seq: streamSequence,
        userId: event.data.userId,
        deliveryCount,
      },
      'Notification processing failed — message will be redelivered',
    );
    // nak() with no argument uses the server's default backoff.
    msg.nak();
  }
}
