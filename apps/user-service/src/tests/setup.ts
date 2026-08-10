// Set test environment variables before any module loads
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
process.env['NATS_URL'] = 'nats://localhost:4222';
process.env['NATS_STREAM_NAME'] = 'USER_EVENTS';
process.env['JWT_SECRET'] = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env['USER_SERVICE_PORT'] = '3001';
process.env['USER_SERVICE_HOST'] = '0.0.0.0';
process.env['LOG_LEVEL'] = 'silent';
