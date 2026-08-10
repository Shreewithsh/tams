process.env['NODE_ENV'] = 'test';
process.env['NATS_URL'] = 'nats://localhost:4222';
process.env['NATS_STREAM_NAME'] = 'USER_EVENTS';
process.env['NATS_CONSUMER_NAME'] = 'notification-service-consumer';
process.env['NATS_MAX_DELIVER'] = '5';
process.env['NATS_ACK_WAIT_SECONDS'] = '30';
process.env['LOG_LEVEL'] = 'silent';
