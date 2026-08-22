import { describe, expect, it } from 'vitest';
import { MAX_AUTOMATIC_RETRY_ATTEMPTS, pendingMessageWarning, routeIsStale, shouldAttemptEnvelope } from '../mobile/src/services/retry-policy';
import { MeshService, MockLoopbackTransport } from '../mobile/src/services/mesh-service';
import type { OutboxEnvelope } from '../mobile/src/types/security-data';

const now = Date.now();
const queued = (overrides: Partial<OutboxEnvelope> = {}): OutboxEnvelope => ({ message_id: 'retry-policy-message', chat_id: 'retry-policy-chat', destination_id: 'peer-retry-policy', encrypted_payload: 'ciphertext', ttl: 4, created_at: new Date(now).toISOString(), last_attempt_at: null, attempt_count: 0, status: 'queued', ...overrides });
const freshRoute = { destination_device_id: 'peer-retry-policy', next_hop_device_id: 'relay-retry-policy', hop_count: 1, updated_at: new Date(now).toISOString() };

describe('bounded mesh retry policy', () => {
  it('pauses automatic retry at the configured limit', () => {
    const envelope = queued({ attempt_count: MAX_AUTOMATIC_RETRY_ATTEMPTS });
    expect(pendingMessageWarning(envelope, [freshRoute])).toMatchObject({ kind: 'retry-limit' });
    expect(shouldAttemptEnvelope(envelope, [freshRoute])).toBe(false);
  });

  it('warns on stale authenticated routes and waits when no route exists', () => {
    const stale = { ...freshRoute, updated_at: new Date(now - 16 * 60 * 1000).toISOString() };
    expect(routeIsStale(stale, now)).toBe(true);
    expect(pendingMessageWarning(queued(), [stale], now)).toMatchObject({ kind: 'stale-route' });
    expect(pendingMessageWarning(queued(), [], now)).toMatchObject({ kind: 'waiting-peer' });
  });

  it('emits immediate retry opportunities when a peer connects or routing changes', async () => {
    const mesh = new MeshService(new MockLoopbackTransport(), 'retry-policy-self');
    const events: string[] = [];
    mesh.onRetryOpportunity((event) => events.push(event.kind));
    await mesh.connect('peer-retry-policy');
    mesh.updateRoutingTable([freshRoute]);
    expect(events).toEqual(['peer-connected', 'route-updated']);
  });
});
