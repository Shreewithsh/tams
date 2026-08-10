// Set test environment variables before any module loads
process.env['NODE_ENV'] = 'test';
process.env['GATEWAY_PORT'] = '3000';
process.env['GATEWAY_HOST'] = '0.0.0.0';
process.env['JWT_SECRET'] = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env['JWT_EXPIRES_IN'] = '7d';
process.env['USER_SERVICE_URL'] = 'http://user-service:3001';
process.env['RATE_LIMIT_MAX'] = '100';
process.env['RATE_LIMIT_TIME_WINDOW'] = '60000';
process.env['LOG_LEVEL'] = 'silent';
