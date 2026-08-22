import { describe, expect, it } from 'vitest';
import { database } from '../mobile/src/services/db';
import { MeshService, MockLoopbackTransport } from '../mobile/src/services/mesh-service';
import { chunkMessage, encodeMessage } from '../mobile/src/services/protocol';
import type { EncryptedMessage } from '../mobile/src/services/types';

describe('runtime durable relay queue', () => {
  it('stores an opaque non-recipient envelope until the next-hop connection becomes eligible', async () => {
    await database.initialize();
    const transport = new MockLoopbackTransport();
    const relay = new MeshService(transport, 'relay-runtime');
    relay.updateRoutingTable([{ destination_device_id: 'bob-runtime', next_hop_device_id: 'bob-runtime', hop_count: 1, updated_at: new Date().toISOString() }]);
    const payload: EncryptedMessage = { message_id: 'relay-runtime-message', sender_id: 'alice-runtime', receiver_id: 'bob-runtime', content_type: 'text', content: 'ciphertext-only', timestamp: new Date().toISOString(), ttl: 3 };
    const chunk = chunkMessage(payload)[0];
    const frame = encodeMessage({ ...payload, content: JSON.stringify(chunk) });
    (relay as unknown as { handleIncoming: (id: string, bytes: Uint8Array) => void }).handleIncoming('alice-runtime', frame);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await database.getQueuedRelayEnvelopes()).some((entry) => entry.message_id === payload.message_id && entry.opaque_envelope.includes('ciphertext-only'))).toBe(true);

    await relay.connect('bob-runtime');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await database.getQueuedRelayEnvelopes()).some((entry) => entry.message_id === payload.message_id)).toBe(false);
  });
});
