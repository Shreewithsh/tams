import { connect, StorageType, RetentionPolicy, type NatsConnection, type JetStreamClient, type JetStreamManager } from 'nats';
import { createLogger } from '@ms/shared';
import { SUBJECTS, STREAMS } from '@ms/contracts';

const logger = createLogger({ name: 'nats-client' });

export interface NatsClients {
  nc: NatsConnection;
  js: JetStreamClient;
  jsm: JetStreamManager;
}

export async function createNatsConnection(natsUrl: string): Promise<NatsClients> {
  const nc = await connect({
    servers: natsUrl,
    reconnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2000,
    pingInterval: 20000,
  });

  logger.info({ server: natsUrl }, 'Connected to NATS');

  const jsm = await nc.jetstreamManager();
  const js = nc.jetstream();

  await ensureStream(jsm);

  return { nc, js, jsm };
}

async function ensureStream(jsm: JetStreamManager): Promise<void> {
  const streamName = STREAMS.USER_EVENTS;
  const subjects = [SUBJECTS.USER_CREATED];

  try {
    const info = await jsm.streams.info(streamName);
    logger.info({ stream: info.config.name }, 'NATS stream already exists');
  } catch {
    await jsm.streams.add({
      name: streamName,
      subjects,
      storage: StorageType.File,
      retention: RetentionPolicy.Limits,
      max_age: 7 * 24 * 60 * 60 * 1_000_000_000,
      num_replicas: 1,
    });
    logger.info({ stream: streamName, subjects }, 'NATS stream created');
  }
}
