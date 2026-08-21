import { describe, expect, it } from 'vitest';

import { decrypt, encrypt, generateIdentityKeyPair, pairWithContact } from '../mobile/src/services/cryptoService';
import { database } from '../mobile/src/services/db';
import { MeshService } from '../mobile/src/services/mesh-service';
import type { Device, EncryptedMessage, MeshTransport } from '../mobile/src/services/types';

class SimulatedDuplexTransport implements MeshTransport {
  readonly kind = 'mock' as const;
  private advertising = false;
  private connected = false;
  private listener: ((deviceId: string, payload: Uint8Array) => void) | null = null;

  constructor(
    readonly device: Device,
    private readonly peerId: string,
  ) {}

  peer: SimulatedDuplexTransport | null = null;

  async startAdvertising(): Promise<void> { this.advertising = true; }
  async stopAdvertising(): Promise<void> { this.advertising = false; }
  async startScan(): Promise<Device[]> { return this.peer?.advertising ? [this.peer.device] : []; }
  async stopScan(): Promise<void> {}
  async connect(deviceId: string): Promise<void> {
    if (deviceId !== this.peerId || !this.peer?.advertising) throw new Error('Simulated Air-Mesh GATT peer is unavailable.');
    this.connected = true;
  }
  async disconnect(deviceId: string): Promise<void> {
    if (deviceId === this.peerId) this.connected = false;
  }
  async send(deviceId: string, payload: Uint8Array): Promise<boolean> {
    if (deviceId !== this.peerId || !this.connected || !this.peer?.advertising) return false;
    queueMicrotask(() => this.peer?.listener?.(this.device.id, payload));
    return true;
  }
  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void {
    this.listener = callback;
    return () => { this.listener = null; };
  }
}

function message(messageId: string, sender: string, receiver: string, content: string): EncryptedMessage {
  return {
    message_id: messageId,
    sender_id: sender,
    receiver_id: receiver,
    content_type: 'text',
    content,
    timestamp: '2026-08-20T00:00:00.000Z',
    ttl: 5,
  };
}

describe('deterministic two-device offline handshake simulation', () => {
  it('simulates discovery, trusted pairing, encrypted payload validation, bidirectional delivery, disconnect queueing, and reconnect recovery', async () => {
    await database.initialize();
    const deviceA: Device = { id: 'device-a', name: 'Air-Mesh A', role: 'user', rssi: -46 };
    const deviceB: Device = { id: 'device-b', name: 'Air-Mesh B', role: 'user', rssi: -51 };
    const transportA = new SimulatedDuplexTransport(deviceA, deviceB.id);
    const transportB = new SimulatedDuplexTransport(deviceB, deviceA.id);
    transportA.peer = transportB;
    transportB.peer = transportA;

    const serviceA = new MeshService(transportA, deviceA.id);
    const serviceB = new MeshService(transportB, deviceB.id);
    const receivedByA: EncryptedMessage[] = [];
    const receivedByB: EncryptedMessage[] = [];
    serviceA.onMessageReceived((incoming) => receivedByA.push(incoming));
    serviceB.onMessageReceived((incoming) => receivedByB.push(incoming));

    await transportA.startAdvertising();
    await transportB.startAdvertising();
    await expect(serviceA.startScan()).resolves.toEqual([deviceB]);
    await expect(serviceB.startScan()).resolves.toEqual([deviceA]);
    expect(serviceA.getPeerConnectionState(deviceB.id)).toBe('discovered');
    expect(serviceB.getPeerConnectionState(deviceA.id)).toBe('discovered');

    const identityA = await generateIdentityKeyPair();
    const identityB = await generateIdentityKeyPair();
    const pairedA = await pairWithContact(deviceB.id, 'Air-Mesh B', identityB.publicKey, identityA);
    const pairedB = await pairWithContact(deviceA.id, 'Air-Mesh A', identityA.publicKey, identityB);
    expect(pairedA.shared_secret).toBe(pairedB.shared_secret);

    const sharedSecretA = pairedA.shared_secret!;
    const sharedSecretB = pairedB.shared_secret!;
    const encrypted = await encrypt('two-device offline payload', Uint8Array.from(Buffer.from(sharedSecretA, 'hex')));
    await expect(decrypt(encrypted, Uint8Array.from(Buffer.from(sharedSecretB, 'hex')))).resolves.toBe('two-device offline payload');

    await serviceA.connect(deviceB.id);
    await serviceB.connect(deviceA.id);
    expect(serviceA.getPeerConnectionState(deviceB.id)).toBe('connected');
    expect(serviceB.getPeerConnectionState(deviceA.id)).toBe('connected');

    const fromA = message('sim-a-to-b', deviceA.id, deviceB.id, 'offline message from A');
    const fromB = message('sim-b-to-a', deviceB.id, deviceA.id, 'offline reply from B');
    await expect(serviceA.sendEncryptedMessage(deviceB.id, fromA)).resolves.toBe(true);
    await expect(serviceB.sendEncryptedMessage(deviceA.id, fromB)).resolves.toBe(true);
    await Promise.resolve();
    expect(receivedByA).toEqual([fromB]);
    expect(receivedByB).toEqual([fromA]);

    await serviceA.disconnect(deviceB.id);
    expect(serviceA.getPeerConnectionState(deviceB.id)).toBe('disconnected');
    await expect(serviceA.sendEncryptedMessage(deviceB.id, message('queued-while-offline', deviceA.id, deviceB.id, 'queue me'))).resolves.toBe(false);
    expect(receivedByB).toEqual([fromA]);

    await serviceA.connect(deviceB.id);
    const afterReconnect = message('reconnect-delivery', deviceA.id, deviceB.id, 'delivered after reconnect');
    await expect(serviceA.sendEncryptedMessage(deviceB.id, afterReconnect)).resolves.toBe(true);
    await Promise.resolve();
    expect(receivedByB).toEqual([fromA, afterReconnect]);

    serviceA.dispose();
    serviceB.dispose();
  });
});
