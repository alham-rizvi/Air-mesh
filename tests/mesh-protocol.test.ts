import { describe, expect, it } from 'vitest';
import { chunkFile, reassembleFile } from '../mobile/src/services/file-service';
import { ChunkAssembler, chunkMessage, decrementTtl, mergeRoutingTable } from '../mobile/src/services/protocol';
import type { EncryptedMessage } from '../mobile/src/services/types';

describe('Air-Mesh mesh protocol', () => {
  const message: EncryptedMessage = {
    message_id: 'm-1', sender_id: 'sender', receiver_id: 'receiver', content_type: 'text',
    content: 'A'.repeat(1600), timestamp: '2026-08-20T00:00:00Z', ttl: 5,
  };

  it('chunks and reassembles an encrypted message', () => {
    const assembler = new ChunkAssembler();
    const chunks = chunkMessage(message, 128);
    const result = chunks.map((chunk) => assembler.accept(chunk)).filter(Boolean).at(0);
    expect(result).toEqual(message);
    expect(assembler.accept(chunks[0])).toBeNull();
  });

  it('decrements TTL and prefers lower-hop routing entries', () => {
    expect(decrementTtl(message).ttl).toBe(4);
    const merged = mergeRoutingTable([{ destination_device_id: 'receiver', next_hop_device_id: 'old', hop_count: 4, updated_at: 'old' }], [{ destination_device_id: 'receiver', next_hop_device_id: 'new', hop_count: 1, updated_at: 'new' }]);
    expect(merged[0].next_hop_device_id).toBe('new');
    expect(merged[0].hop_count).toBe(2);
  });

  it('round-trips file chunks', () => {
    const bytes = new Uint8Array(Array.from({ length: 1400 }, (_, index) => index % 255));
    expect(reassembleFile(chunkFile(bytes, 128))).toEqual(bytes);
  });
});
