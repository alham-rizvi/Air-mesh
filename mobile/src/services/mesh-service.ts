import { ChunkAssembler, chunkMessage, decodeMessage, decrementTtl, encodeMessage, mergeRoutingTable, shouldForward } from './protocol';
import type { Device, EncryptedMessage, MeshServiceApi, MeshStatus, MeshTransport, MeshTransportKind, PeerConnectionState, RoutingEntry, TransmissionMode } from './types';

export class UnavailableMeshTransport implements MeshTransport {
  readonly kind = 'unavailable' as const;
  async startAdvertising(): Promise<void> {}
  async stopAdvertising(): Promise<void> {}
  async startScan(): Promise<Device[]> { return []; }
  async stopScan(): Promise<void> {}
  async connect(_deviceId: string): Promise<void> { throw new Error('Native mesh transport is unavailable. Install a development build with the BLE adapter.'); }
  async disconnect(_deviceId: string): Promise<void> {}
  async send(_deviceId: string, _payload: Uint8Array): Promise<boolean> { return false; }
  onData(_callback: (deviceId: string, payload: Uint8Array) => void): () => void { return () => undefined; }
}

export class MockLoopbackTransport implements MeshTransport {
  readonly kind = 'mock' as const;
  private listener: ((deviceId: string, payload: Uint8Array) => void) | null = null;
  private readonly connected = new Set<string>();

  async startAdvertising(): Promise<void> {}
  async stopAdvertising(): Promise<void> {}
  async startScan(): Promise<Device[]> { return []; }
  async stopScan(): Promise<void> {}
  async connect(deviceId: string): Promise<void> { this.connected.add(deviceId); }
  async disconnect(deviceId: string): Promise<void> { this.connected.delete(deviceId); }
  async send(deviceId: string, payload: Uint8Array): Promise<boolean> {
    if (!this.connected.has(deviceId)) return false;
    queueMicrotask(() => this.listener?.(deviceId, payload));
    return true;
  }
  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void { this.listener = callback; return () => { this.listener = null; }; }
}

export class MeshService implements MeshServiceApi {
  private readonly assembler = new ChunkAssembler();
  private routing: RoutingEntry[] = [];
  private readonly listeners = new Set<(message: EncryptedMessage) => void>();
  private readonly connectedDevices = new Set<string>();
  private readonly peerStates = new Map<string, PeerConnectionState>();
  private unsubscribeTransport: (() => void) | null = null;

  constructor(private transport: MeshTransport = new UnavailableMeshTransport(), private readonly selfId = 'local-device') {
    this.attachTransport(transport);
  }

  setTransport(transport: MeshTransport): void {
    this.unsubscribeTransport?.();
    this.transport = transport;
    this.attachTransport(transport);
  }

  private attachTransport(transport: MeshTransport): void {
    this.unsubscribeTransport = transport.onData((deviceId, bytes) => this.handleIncoming(deviceId, bytes));
  }

  async startAdvertising(): Promise<void> { await this.transport.startAdvertising(); }
  async stopAdvertising(): Promise<void> { await this.transport.stopAdvertising(); }
  async startScan(): Promise<Device[]> {
    const devices = await this.transport.startScan();
    devices.forEach((device) => this.peerStates.set(device.id, 'discovered'));
    return devices;
  }
  async stopScan(): Promise<void> { await this.transport.stopScan(); }
  async connect(deviceId: string): Promise<void> {
    this.peerStates.set(deviceId, 'connecting');
    try {
      await this.transport.connect(deviceId);
      this.connectedDevices.add(deviceId);
      this.peerStates.set(deviceId, 'connected');
    } catch (error) {
      this.peerStates.set(deviceId, 'failed');
      throw error;
    }
  }
  async disconnect(deviceId: string): Promise<void> {
    await this.transport.disconnect(deviceId);
    this.connectedDevices.delete(deviceId);
    this.peerStates.set(deviceId, 'disconnected');
  }

  async sendEncryptedMessage(deviceId: string, payload: EncryptedMessage): Promise<boolean> {
    if (payload.ttl <= 0) return false;
    const chunks = chunkMessage(payload);
    for (const chunk of chunks) {
      const frame = encodeMessage({ ...payload, content: JSON.stringify(chunk), content_type: 'text' });
      if (!(await this.sendWithRetry(deviceId, frame))) return false;
    }
    return true;
  }

  private async sendWithRetry(deviceId: string, frame: Uint8Array, attempts = 3): Promise<boolean> {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        if (await this.transport.send(deviceId, frame)) return true;
      } catch {
        // A transient radio disconnect is retried without surfacing a fake success.
      }
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
    return false;
  }

  onMessageReceived(callback: (message: EncryptedMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async broadcastMessage(payload: EncryptedMessage): Promise<boolean> {
    const peers = Array.from(this.connectedDevices);
    const results = await Promise.all(peers.map((deviceId) => this.sendEncryptedMessage(deviceId, payload)));
    return peers.length > 0 && results.every(Boolean);
  }

  getPeerConnectionState(deviceId: string): PeerConnectionState | 'unknown' { return this.peerStates.get(deviceId) ?? 'unknown'; }

  async sendWithMode(mode: TransmissionMode, payload: EncryptedMessage): Promise<boolean> {
    if (mode.kind === 'broadcast') return this.broadcastMessage({ ...payload, receiver_id: '*' });
    const receiverId = mode.receiverId ?? payload.receiver_id;
    if (!receiverId || receiverId === '*') return false;
    if (mode.kind === 'p2p') return this.sendEncryptedMessage(receiverId, payload);
    const direct = await this.sendEncryptedMessage(receiverId, payload);
    if (direct) return true;
    const peers = Array.from(this.connectedDevices).filter((peerId) => peerId !== receiverId);
    const results = await Promise.all(peers.map((peerId) => this.sendEncryptedMessage(peerId, payload)));
    return results.some(Boolean);
  }

  async syncReportsFromShelter(_deviceId: string): Promise<never[]> { return []; }

  async syncReportsToBase(reports: import('./types').Report[], baseUrl = 'http://192.168.1.100:3000'): Promise<boolean> {
    if (reports.length === 0) return true;
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reports, audit_logs: [] }) });
      return response.ok;
    } catch { return false; }
  }

  async getRoutingTable(): Promise<RoutingEntry[]> { return this.routing; }

  async getMeshStatus(): Promise<MeshStatus> {
    const transport: MeshTransportKind = this.transport.kind ?? (this.transport instanceof MockLoopbackTransport ? 'mock' : this.transport instanceof UnavailableMeshTransport ? 'unavailable' : 'ble');
    const externalRadio = await this.transport.getExternalRadioStatus?.();
    return {
      relay_count: this.routing.length,
      estimated_range_m: externalRadio?.measured_range_m ?? null,
      connected_devices: this.connectedDevices.size,
      transport,
      ...(externalRadio ? { external_radio: externalRadio } : {}),
    };
  }

  updateRoutingTable(received: RoutingEntry[]): void { this.routing = mergeRoutingTable(this.routing, received); }

  dispose(): void { this.unsubscribeTransport?.(); this.unsubscribeTransport = null; this.listeners.clear(); }

  private handleIncoming(deviceId: string, bytes: Uint8Array): void {
    this.assembler.cleanupExpired();
    try {
      const envelope = decodeMessage(bytes);
      const chunk = JSON.parse(envelope.content) as Parameters<ChunkAssembler['accept']>[0];
      const message = this.assembler.accept(chunk);
      if (!message) return;
      if (message.receiver_id === this.selfId) {
        this.listeners.forEach((listener) => listener(message));
        return;
      }
      if (shouldForward(message, this.routing, this.selfId) && message.ttl > 0) {
        const nextHop = this.routing.find((entry) => entry.destination_device_id === message.receiver_id)?.next_hop_device_id;
        if (nextHop && nextHop !== deviceId) void this.sendEncryptedMessage(nextHop, decrementTtl(message));
      }
    } catch { /* Ignore incomplete or malformed radio frames. */ }
  }
}

export const meshService = new MeshService();
