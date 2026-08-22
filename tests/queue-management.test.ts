import { describe, expect, it } from 'vitest';
import { database } from '../mobile/src/services/db';

describe('mesh queue management', () => {
  it('lists and clears only queued sender and relay envelopes', async () => {
    await database.initialize();
    await database.saveOutboxEnvelope({ message_id: 'queue-clear-sender', chat_id: 'queue-clear-chat', destination_id: 'peer', encrypted_payload: 'ciphertext', ttl: 3, created_at: new Date().toISOString(), last_attempt_at: null, attempt_count: 0, status: 'queued' });
    await database.saveRelayQueueEnvelope({ id: 'queue-clear-relay', message_id: 'queue-clear-relay-message', destination_id: 'peer', next_hop_id: null, opaque_envelope: 'opaque', ttl: 2, created_at: new Date().toISOString(), last_attempt_at: null, attempt_count: 0, status: 'queued' });
    await database.saveRelayQueueEnvelope({ id: 'queue-accepted-relay', message_id: 'queue-accepted-message', destination_id: 'peer', next_hop_id: 'peer', opaque_envelope: 'opaque', ttl: 2, created_at: new Date().toISOString(), last_attempt_at: new Date().toISOString(), attempt_count: 1, status: 'accepted' });

    expect((await database.getQueuedOutboxEnvelopes()).some((entry) => entry.message_id === 'queue-clear-sender')).toBe(true);
    expect((await database.getQueuedRelayEnvelopes()).some((entry) => entry.id === 'queue-clear-relay')).toBe(true);
    expect(await database.clearQueuedOutboxEnvelopes()).toBeGreaterThan(0);
    expect(await database.clearQueuedRelayEnvelopes()).toBeGreaterThan(0);
    expect((await database.getQueuedOutboxEnvelopes()).some((entry) => entry.message_id === 'queue-clear-sender')).toBe(false);
    expect((await database.getQueuedRelayEnvelopes()).some((entry) => entry.id === 'queue-clear-relay')).toBe(false);
  });
});
