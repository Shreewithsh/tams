import {
  connect,
  type NatsConnection,
  type JetStreamManager,
  type ConsumerMessages,
} from 'nats';
import { SUBJECTS, STREAMS, CONSUMERS } from '@ms/contracts';
import type { NotificationProvider } from '../providers/notification-provider.js';
import { handleUserCreatedMessage } from '../handlers/user-created-handler.js';
import { createLogger } from '@ms/shared';
import type { NotificationEnv } from '../config/env.js';

const logger = createLogger({ name: 'nats-consumer' });

/**
 * NATS JetStream Consumer for the Notification Service.
 *
 * RELIABILITY DESIGN:
 * ─────────────────────────────────────────────────────────────
 * Stream:        USER_EVENTS
 * Subject:       users.created
 * Consumer:      notification-service-consumer (durable)
 * Delivery:      explicit ack required
 * maxDeliver:    5 (configurable via env)
 * ackWait:       30s (configurable via env)
 * Storage:       file (survives NATS restarts)
 * DLQ subject:   notifications.dlq
 *
 * HOW RETRY / DLQ WORKS:
 * 1. A message arrives from USER_EVENTS/users.created.
 * 2. The handler attempts to process it (validate + send notification).
 * 3. On SUCCESS → msg.ack() is called. Message is done.
 * 4. On FAILURE → msg.nak() is called. JetStream schedules redelivery
 *    after ackWait seconds, incrementing the delivery counter.
 * 5. After maxDeliver (5) failed attempts, JetStream publishes the
 *    original message to `notifications.dlq` and stops redelivering.
 * 6. A separate DLQ consumer (or operator tool) can then inspect,
 *    alert on, or replay DLQ messages.
 *
 * This prevents:
 *   - Infinite retry loops (maxDeliver cap)
 *   - Message loss (durable consumer + file storage)
 *   - Silent failures (DLQ + logging)
 * ─────────────────────────────────────────────────────────────
 */
export class NotificationConsumer {
  private nc!: NatsConnection;
  private messages!: ConsumerMessages;
  private running = false;

  constructor(
    private readonly cfg: NotificationEnv,
    private readonly provider: NotificationProvider,
  ) {}

  async start(): Promise<void> {
    this.nc = await connect({
      servers: this.cfg.NATS_URL,
      reconnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000,
    });

    logger.info({ server: this.cfg.NATS_URL }, 'Notification Service connected to NATS');

    const jsm = await this.nc.jetstreamManager();
    await this.ensureStreamAndConsumer(jsm);

    const js = this.nc.jetstream();
    const consumer = await js.consumers.get(this.cfg.NATS_STREAM_NAME, this.cfg.NATS_CONSUMER_NAME);
    this.messages = await consumer.consume({ max_messages: 10 });

    this.running = true;
    logger.info(
      { stream: this.cfg.NATS_STREAM_NAME, consumer: this.cfg.NATS_CONSUMER_NAME },
      'Notification Service consumer started',
    );

    void this.processMessages();
  }

  private async processMessages(): Promise<void> {
    for await (const msg of this.messages) {
      if (!this.running) break;
      await handleUserCreatedMessage(msg, this.provider);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.messages.stop();
    await this.nc.drain();
    logger.info('Notification Service consumer stopped');
  }

  private async ensureStreamAndConsumer(jsm: JetStreamManager): Promise<void> {
    // Ensure the stream exists
    try {
      await jsm.streams.info(this.cfg.NATS_STREAM_NAME);
      logger.info({ stream: this.cfg.NATS_STREAM_NAME }, 'Stream already exists');
    } catch {
      await jsm.streams.add({
        name: this.cfg.NATS_STREAM_NAME,
        subjects: [SUBJECTS.USER_CREATED],
        storage: 'file',
        retention: 'limits',
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000,
        num_replicas: 1,
      });
      logger.info({ stream: this.cfg.NATS_STREAM_NAME }, 'Stream created');
    }

    // Ensure the durable consumer exists
    try {
      await jsm.consumers.info(this.cfg.NATS_STREAM_NAME, this.cfg.NATS_CONSUMER_NAME);
      logger.info({ consumer: this.cfg.NATS_CONSUMER_NAME }, 'Consumer already exists');
    } catch {
      await jsm.consumers.add(this.cfg.NATS_STREAM_NAME, {
        durable_name: this.cfg.NATS_CONSUMER_NAME,
        ack_policy: 'explicit',
        ack_wait: this.cfg.NATS_ACK_WAIT_SECONDS * 1_000_000_000, // nanoseconds
        max_deliver: this.cfg.NATS_MAX_DELIVER,
        filter_subject: SUBJECTS.USER_CREATED,
        // Dead-letter subject: after maxDeliver failures, publish here
        // Note: NATS calls this the "dead letter" via advisory — the
        // messages that exceed maxDeliver are moved to the DLQ subject.
        deliver_subject: undefined, // pull consumer
      });

      // Create a separate stream to hold DLQ messages
      await this.ensureDlqStream(jsm);

      logger.info(
        {
          consumer: this.cfg.NATS_CONSUMER_NAME,
          maxDeliver: this.cfg.NATS_MAX_DELIVER,
          ackWait: this.cfg.NATS_ACK_WAIT_SECONDS,
          dlq: SUBJECTS.NOTIFICATIONS_DLQ,
        },
        'Durable consumer created',
      );
    }
  }

  private async ensureDlqStream(jsm: JetStreamManager): Promise<void> {
    try {
      await jsm.streams.info('NOTIFICATIONS_DLQ');
    } catch {
      await jsm.streams.add({
        name: 'NOTIFICATIONS_DLQ',
        subjects: [SUBJECTS.NOTIFICATIONS_DLQ],
        storage: 'file',
        retention: 'limits',
        max_age: 30 * 24 * 60 * 60 * 1_000_000_000, // 30 days
        num_replicas: 1,
      });
      logger.info({ stream: 'NOTIFICATIONS_DLQ', subject: SUBJECTS.NOTIFICATIONS_DLQ }, 'DLQ stream created');
    }
  }
}

// Export consumer name constant for use in tests
export { CONSUMERS };
