import { describe, expect, it } from 'vitest';

import type { AndroidWifiDirectClient } from '../mobile/src/services/wifi-direct-client';
import { WifiDirectTransport } from '../mobile/src/services/wifi-direct-transport';

class WifiDirectStub implements AndroidWifiDirectClient {
  started = false;
  sent: { deviceId: string; payloadBase64: string }[] = [];
  private deviceListener: ((device: { id: string; name: string; role: 'user'; rssi: number }) => void) | null = null;
  private packetListener: ((deviceId: string, payload: Uint8Array) => void) | null = null;
  private peerListener: ((event: { deviceId: string; state: 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'failed' }) => void) | null = null;
  async isSupported() { return { supported: true, wifiDirectFeature: true, reason: 'ready' }; }
  async startDiscovery() { this.started = true; }
  async stopDiscovery() { this.started = false; }
  async connect(deviceId: string) { this.peerListener?.({ deviceId, state: 'connecting' }); this.peerListener?.({ deviceId, state: 'connected' }); }
  async disconnect(deviceId: string) { this.peerListener?.({ deviceId, state: 'disconnected' }); }
  async sendPacket(deviceId: string, payloadBase64: string) { this.sent.push({ deviceId, payloadBase64 }); return true; }
  onDevice(callback: (device: { id: string; name: string; role: 'user'; rssi: number }) => void) { this.deviceListener = callback; return () => { this.deviceListener = null; }; }
  onPacket(callback: (deviceId: string, payload: Uint8Array) => void) { this.packetListener = callback; return () => { this.packetListener = null; }; }
  onPeerState(callback: (event: { deviceId: string; state: 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'failed' }) => void) { this.peerListener = callback; return () => { this.peerListener = null; }; }
  onStatus() { return () => undefined; }
  emitDevice() { this.deviceListener?.({ id: 'aa:bb:cc:dd:ee:ff', name: 'Phone B', role: 'user', rssi: -100 }); }
  emitPacket() { this.packetListener?.('aa:bb:cc:dd:ee:ff', Uint8Array.from([1, 2, 3])); }
}

describe('Wi-Fi Direct transport contract', () => {
  it('uses a local discovery, socket-send, inbound callback, and real peer-state boundary without claiming internet delivery', async () => {
    const client = new WifiDirectStub();
    const transport = new WifiDirectTransport(client, 10);
    const packets: Uint8Array[] = [];
    const states: string[] = [];
    transport.onData((_peer, payload) => packets.push(payload));
    transport.onPeerState?.((event) => states.push(event.state));
    const discovery = transport.startScan();
    await new Promise((resolve) => setTimeout(resolve, 0));
    client.emitDevice();
    await new Promise((resolve) => setTimeout(resolve, 15));
    await expect(discovery).resolves.toEqual([{ id: 'aa:bb:cc:dd:ee:ff', name: 'Phone B', role: 'user', rssi: -100 }]);
    await transport.connect('aa:bb:cc:dd:ee:ff');
    await expect(transport.send('aa:bb:cc:dd:ee:ff', Uint8Array.from([7, 8]))).resolves.toBe(true);
    client.emitPacket();
    await transport.disconnect('aa:bb:cc:dd:ee:ff');
    expect(states).toEqual(['connecting', 'connected', 'disconnected']);
    expect(packets).toEqual([Uint8Array.from([1, 2, 3])]);
    expect(Buffer.from(client.sent[0].payloadBase64, 'base64')).toEqual(Buffer.from([7, 8]));
  });
});
