import type { Device, MeshTransport, PeerConnectionState, PeerLinkMetrics } from './types';
import type { AndroidWifiDirectClient } from './wifi-direct-client';

function encodeBase64(value: Uint8Array): string { let binary = ''; value.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); }

/** One-to-one Android Wi-Fi Direct socket transport. It stays local and never uses an internet route. */
export class WifiDirectTransport implements MeshTransport {
  readonly kind = 'wifi-direct' as const;
  private readonly discovered = new Map<string, Device>();
  private deviceListener: ((devices: Device[]) => void) | null = null;
  private finishScan: (() => void) | null = null;

  constructor(private readonly client: AndroidWifiDirectClient, private readonly scanWindowMs = 5_000) {}

  async startAdvertising(): Promise<void> { await this.client.startDiscovery(); }
  async stopAdvertising(): Promise<void> { await this.client.stopDiscovery(); }
  async startScan(): Promise<Device[]> {
    await this.stopScan();
    this.discovered.clear();
    return new Promise((resolve) => {
      let done = false;
      const stop = this.client.onDevice((device) => { this.discovered.set(device.id, device); this.deviceListener?.(Array.from(this.discovered.values())); });
      const finish = () => {
        if (done) return;
        done = true;
        this.finishScan = null;
        stop();
        void this.client.stopDiscovery();
        resolve(Array.from(this.discovered.values()));
      };
      this.finishScan = finish;
      setTimeout(finish, this.scanWindowMs);
      void this.client.startDiscovery().catch(() => finish());
    });
  }
  async stopScan(): Promise<void> { this.finishScan?.(); this.finishScan = null; await this.client.stopDiscovery(); }
  async connect(deviceId: string): Promise<void> { await this.client.connect(deviceId); }
  async disconnect(deviceId: string): Promise<void> { await this.client.disconnect(deviceId); }
  async send(deviceId: string, payload: Uint8Array): Promise<boolean> { return this.client.sendPacket(deviceId, encodeBase64(payload)); }
  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void { return this.client.onPacket(callback); }
  onPeerState(callback: (event: { deviceId: string; state: PeerConnectionState; status?: number }) => void): () => void { return this.client.onPeerState(callback); }
  onDevices(callback: (devices: Device[]) => void): () => void { this.deviceListener = callback; return () => { this.deviceListener = null; }; }
  async getPeerLinkMetrics(): Promise<PeerLinkMetrics> {
    return { transport: 'wifi-direct', strength: 'unavailable', rssi_dbm: null, estimated_distance_m: null, source: 'wifi-direct-unavailable', detail: 'Android Wi-Fi Direct confirms the local socket connection but does not expose a per-peer RSSI or distance reading through this transport.' };
  }
}
