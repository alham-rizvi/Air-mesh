import { describe, expect, it } from 'vitest';

import { fragmentGattFrame } from '../mobile/src/services/gatt-framing';
import { GattPeripheralTransport, type AndroidGattClient } from '../mobile/src/services/gatt-peripheral-transport';
import type { Device, MeshTransport } from '../mobile/src/services/types';

class CentralStub implements MeshTransport {
  readonly kind = 'ble' as const;
  private listener: ((deviceId: string, payload: Uint8Array) => void) | null = null;
  async startAdvertising(): Promise<void> {}
  async stopAdvertising(): Promise<void> {}
  async startScan(): Promise<Device[]> { return []; }
  async stopScan(): Promise<void> {}
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async send(): Promise<boolean> { return false; }
  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void { this.listener = callback; return () => { this.listener = null; }; }
}

class PeripheralStub implements AndroidGattClient {
  started = false;
  stopped = false;
  sent: { deviceId: string; payloadBase64: string }[] = [];
  private packetListener: ((deviceId: string, payload: Uint8Array) => void) | null = null;
  private peerListener: ((event: { deviceId: string; state: 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'failed'; status?: number }) => void) | null = null;
  async isSupported() { return { supported: true, bluetoothEnabled: true, multipleAdvertisementSupported: true, reason: 'ready' }; }
  async startAdvertising(): Promise<void> { this.started = true; }
  async stopAdvertising(): Promise<void> { this.stopped = true; }
  async sendPacket(deviceId: string, payloadBase64: string): Promise<boolean> { this.sent.push({ deviceId, payloadBase64 }); return true; }
  async disconnectPeer(): Promise<void> {}
  onPacket(callback: (deviceId: string, payload: Uint8Array) => void): () => void { this.packetListener = callback; return () => { this.packetListener = null; }; }
  onPeerState(callback: (event: { deviceId: string; state: 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'failed'; status?: number }) => void): () => void { this.peerListener = callback; return () => { this.peerListener = null; }; }
  emitPacket(deviceId: string, payload: Uint8Array) { this.packetListener?.(deviceId, payload); }
  emitPeer(deviceId: string, state: 'connected' | 'disconnected') { this.peerListener?.({ deviceId, state, status: 0 }); }
}

describe('Android GATT peripheral transport contract', () => {
  it('advertises, reassembles native GATT writes, emits real peer states, and falls back to ATT-safe notifications for server-side peers', async () => {
    const peripheral = new PeripheralStub();
    const transport = new GattPeripheralTransport(new CentralStub(), peripheral);
    const received: { deviceId: string; payload: Uint8Array }[] = [];
    const states: string[] = [];
    transport.onData((deviceId, payload) => received.push({ deviceId, payload }));
    transport.onPeerState?.((event) => states.push(`${event.deviceId}:${event.state}`));

    await transport.startAdvertising();
    expect(peripheral.started).toBe(true);

    peripheral.emitPeer('phone-b', 'connected');
    const inbound = Uint8Array.from({ length: 29 }, (_, index) => index);
    fragmentGattFrame(inbound, 100).slice().reverse().forEach((fragment) => peripheral.emitPacket('phone-b', fragment));
    expect(states).toEqual(['phone-b:connected']);
    expect(received).toEqual([{ deviceId: 'phone-b', payload: inbound }]);

    const outbound = Uint8Array.from({ length: 31 }, (_, index) => index + 7);
    await expect(transport.send('phone-b', outbound)).resolves.toBe(true);
    expect(peripheral.sent.map(({ payloadBase64 }) => Buffer.from(payloadBase64, 'base64').length)).toEqual([20, 20, 9]);

    await transport.disconnect('phone-b');
    await transport.stopAdvertising();
    expect(peripheral.stopped).toBe(true);
  });
});
