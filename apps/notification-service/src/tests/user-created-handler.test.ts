import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUserCreatedMessage } from '../../handlers/user-created-handler.js';
import type { NotificationProvider } from '../../providers/notification-provider.js';
import type { UserCreatedEvent } from '@ms/contracts';
import { StringCodec } from 'nats';

const sc = StringCodec();

function makeEvent(overrides?: Partial<UserCreatedEvent>): UserCreatedEvent {
  return {
    eventId: '550e8400-e29b-41d4-a716-446655440001',
    eventType: 'user.created',
    occurredAt: new Date().toISOString(),
    version: 1,
    data: {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'alice@example.com',
      name: 'Alice',
    },
    ...overrides,
  };
}

function makeMsg(payload: unknown, overrides?: Record<string, unknown>) {
  return {
    data: sc.encode(JSON.stringify(payload)),
    ack: vi.fn(),
    nak: vi.fn(),
    info: {
      redelivered: false,
      streamSequence: 1,
      deliveryCount: 1,
    },
    ...overrides,
  };
}

describe('handleUserCreatedMessage', () => {
  let provider: NotificationProvider;

  beforeEach(() => {
    provider = {
      sendWelcomeNotification: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should process a valid event and ack the message', async () => {
    const event = makeEvent();
    const msg = makeMsg(event);

    await handleUserCreatedMessage(msg as never, provider);

    expect(provider.sendWelcomeNotification).toHaveBeenCalledOnce();
    expect(provider.sendWelcomeNotification).toHaveBeenCalledWith(event);
    expect(msg.ack).toHaveBeenCalledOnce();
    expect(msg.nak).not.toHaveBeenCalled();
  });

  it('should NOT ack when the provider throws (allows JetStream retry)', async () => {
    const event = makeEvent();
    const msg = makeMsg(event);
    vi.mocked(provider.sendWelcomeNotification).mockRejectedValue(new Error('SMTP failure'));

    await handleUserCreatedMessage(msg as never, provider);

    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.nak).toHaveBeenCalledOnce();
  });

  it('should nak without calling provider on invalid event payload', async () => {
    const invalidPayload = { eventType: 'user.created', data: { email: 'not-valid' } };
    const msg = makeMsg(invalidPayload);

    await handleUserCreatedMessage(msg as never, provider);

    expect(provider.sendWelcomeNotification).not.toHaveBeenCalled();
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.nak).toHaveBeenCalledOnce();
  });

  it('should nak on malformed JSON without calling provider', async () => {
    const msg = {
      data: sc.encode('not-json{{{'),
      ack: vi.fn(),
      nak: vi.fn(),
      info: { redelivered: false, streamSequence: 1, deliveryCount: 1 },
    };

    await handleUserCreatedMessage(msg as never, provider);

    expect(provider.sendWelcomeNotification).not.toHaveBeenCalled();
    expect(msg.nak).toHaveBeenCalledOnce();
  });

  it('should never include password in event data', async () => {
    const event = makeEvent();
    const msg = makeMsg(event);

    await handleUserCreatedMessage(msg as never, provider);

    const callArg = vi.mocked(provider.sendWelcomeNotification).mock.calls[0]![0];
    expect(JSON.stringify(callArg)).not.toContain('password');
    expect(JSON.stringify(callArg)).not.toContain('passwordHash');
  });

  it('should handle redelivered messages correctly (retry behavior)', async () => {
    const event = makeEvent();
    const msg = makeMsg(event, {
      info: { redelivered: true, streamSequence: 5, deliveryCount: 3 },
    });

    await handleUserCreatedMessage(msg as never, provider);

    // Even redelivered messages should be processed and acked on success
    expect(msg.ack).toHaveBeenCalledOnce();
    expect(msg.nak).not.toHaveBeenCalled();
  });
});
