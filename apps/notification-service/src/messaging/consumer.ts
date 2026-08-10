import {
  connect,
  StorageType,
  RetentionPolicy,
  AckPolicy,
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
        storage: StorageType.File,
        retention: RetentionPolicy.Limits,
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
        ack_policy: AckPolicy.Explicit,
        ack_wait: this.cfg.NATS_ACK_WAIT_SECONDS * 1_000_000_000, // nanoseconds
        max_deliver: this.cfg.NATS_MAX_DELIVER,
        filter_subject: SUBJECTS.USER_CREATED,
        deliver_subject: undefined,
      });

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
        storage: StorageType.File,
        retention: RetentionPolicy.Limits,
        max_age: 30 * 24 * 60 * 60 * 1_000_000_000, // 30 days
        num_replicas: 1,
      });
      logger.info({ stream: 'NOTIFICATIONS_DLQ', subject: SUBJECTS.NOTIFICATIONS_DLQ }, 'DLQ stream created');
    }
  }
}

export { CONSUMERS };
