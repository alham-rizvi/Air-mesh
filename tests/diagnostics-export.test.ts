import { describe, expect, it } from 'vitest';
import { buildRedactedDiagnosticsExport } from '../mobile/src/services/diagnostics-export';

describe('redacted mesh diagnostics export', () => {
  it('includes troubleshooting topology and queue metadata while excluding ciphertext, plaintext, keys, and receipt material', () => {
    const json = buildRedactedDiagnosticsExport({ generated_at: '2026-08-22T00:00:00.000Z', mesh_status: { relay_count: 1, estimated_range_m: null, connected_devices: 1, transport: 'wifi-direct' }, connected_peers: ['relay-secret-id'], routes: [{ destination_device_id: 'bob-secret-id', next_hop_device_id: 'relay-secret-id', hop_count: 2, updated_at: '2026-08-22T00:00:00.000Z' }], outbox: [{ message_id: 'message-secret-id', chat_id: 'chat-secret-id', destination_id: 'bob-secret-id', encrypted_payload: 'TOP_SECRET_CIPHERTEXT', ttl: 4, created_at: '2026-08-22T00:00:00.000Z', last_attempt_at: null, attempt_count: 2, status: 'queued' }], relay_queue: [{ id: 'relay-queue-secret', message_id: 'message-secret-id', destination_id: 'bob-secret-id', next_hop_id: 'relay-secret-id', opaque_envelope: 'TOP_SECRET_RELAY_PAYLOAD', ttl: 3, created_at: '2026-08-22T00:00:00.000Z', last_attempt_at: null, attempt_count: 1, status: 'queued' }], retry_history: [{ id: 'history-secret', message_id: 'message-secret-id', attempted_at: '2026-08-22T00:00:00.000Z', trigger: 'manual', outcome: 'queued', reason: 'No eligible transport' }] });
    expect(json).toContain('observed_topology');
    expect(json).toContain('attempt_count');
    expect(json).not.toContain('TOP_SECRET_CIPHERTEXT');
    expect(json).not.toContain('TOP_SECRET_RELAY_PAYLOAD');
    expect(json).not.toContain('chat-secret-id');
  });
});
