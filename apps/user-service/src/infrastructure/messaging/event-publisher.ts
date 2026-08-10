import { type JetStreamClient, StringCodec } from 'nats';
import type { UserCreatedEvent } from '@ms/contracts';
import { SUBJECTS } from '@ms/contracts';
import { createLogger } from '@ms/shared';

const logger = createLogger({ name: 'event-publisher' });
const sc = StringCodec();

/**
 * Messaging abstraction for the User Service.
 * The application layer depends on this interface, not on NATS directly.
 */
export interface IEventPublisher {
  publishUserCreated(event: UserCreatedEvent): Promise<void>;
}

/**
 * NATS JetStream implementation of IEventPublisher.
 */
export class NatsEventPublisher implements IEventPublisher {
  constructor(private readonly js: JetStreamClient) {}

  async publishUserCreated(event: UserCreatedEvent): Promise<void> {
    const payload = JSON.stringify(event);
    const ack = await this.js.publish(SUBJECTS.USER_CREATED, sc.encode(payload));
    logger.info(
      {
        eventId: event.eventId,
        eventType: event.eventType,
        seq: ack.seq,
        subject: SUBJECTS.USER_CREATED,
      },
      'Event published to NATS JetStream',
    );
  }
}
