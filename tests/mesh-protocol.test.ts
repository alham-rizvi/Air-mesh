import { describe, expect, it } from 'vitest';
import { chunkFile, reassembleFile } from '../mobile/src/services/file-service';
import { ChunkAssembler, chunkMessage, decrementTtl, mergeRoutingTable } from '../mobile/src/services/protocol';
import type { Device, EncryptedMessage } from '../mobile/src/services/types';
import { AIR_MESH_TOPOLOGY, distanceLabel, sortDiscoveredDevices } from '../mobile/src/services/discovery';
import { MeshService, MockLoopbackTransport } from '../mobile/src/services/mesh-service';

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

  it('classifies and orders discovered peers without inventing presence', () => {
    const devices: Device[] = [
      { id: 'far', name: 'Courier', role: 'courier', rssi: -78 },
      { id: 'near', name: 'Shelter', role: 'shelter', rssi: -48 },
      { id: 'same', name: 'Base', role: 'base', rssi: -48 },
    ];
    expect(distanceLabel(-48)).toBe('Very close');
    expect(distanceLabel(-74)).toBe('In range');
    expect(sortDiscoveredDevices(devices).map((device) => device.id)).toEqual(['same', 'near', 'far']);
    expect(AIR_MESH_TOPOLOGY.map((node) => node.role)).toEqual(['shelter', 'courier', 'base', 'user']);
  });

  it('tracks peer lifecycle and supports Air-Mesh transmission modes', async () => {
    const service = new MeshService(new MockLoopbackTransport(), 'sender');
    await service.connect('receiver');
    expect(service.getPeerConnectionState('receiver')).toBe('connected');
    await expect(service.sendWithMode({ kind: 'p2p', receiverId: 'receiver' }, message)).resolves.toBe(true);
    await expect(service.sendWithMode({ kind: 'mesh', receiverId: 'receiver' }, message)).resolves.toBe(true);
    await expect(service.sendWithMode({ kind: 'broadcast' }, message)).resolves.toBe(true);
    await service.disconnect('receiver');
    expect(service.getPeerConnectionState('receiver')).toBe('disconnected');
  });

  it('delivers an inbound encrypted P2P frame through the registered callback', async () => {
    const service = new MeshService(new MockLoopbackTransport(), 'receiver');
    const received: EncryptedMessage[] = [];
    const unsubscribe = service.onMessageReceived((incoming) => received.push(incoming));
    await service.connect('sender');
    const inbound = { ...message, message_id: 'm-callback', receiver_id: 'receiver' };
    await expect(service.sendEncryptedMessage('sender', inbound)).resolves.toBe(true);
    await Promise.resolve();
    expect(received).toEqual([inbound]);
    unsubscribe();
  });

  it('round-trips file chunks', () => {
    const bytes = new Uint8Array(Array.from({ length: 1400 }, (_, index) => index % 255));
    expect(reassembleFile(chunkFile(bytes, 128))).toEqual(bytes);
  });
});
