import { fragmentGattFrame, GattFrameAssembler } from './gatt-framing';
import type { Device, MeshTransport, PeerConnectionState, PeerLinkMetrics } from './types';

export type GattPeerEvent = { deviceId: string; state: PeerConnectionState; status?: number };

export interface AndroidGattClient {
  isSupported(): Promise<{ supported: boolean; bluetoothEnabled: boolean; multipleAdvertisementSupported: boolean; reason: string }>;
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  sendPacket(deviceId: string, payloadBase64: string): Promise<boolean>;
  disconnectPeer(deviceId: string): Promise<void>;
  onPacket(callback: (deviceId: string, payload: Uint8Array) => void): () => void;
  onPeerState(callback: (event: GattPeerEvent) => void): () => void;
}

function encodeBase64(value: Uint8Array): string {
  let binary = '';
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

/**
 * Combines the existing react-native-ble-plx central client with the Android GATT
 * peripheral bridge. Incoming server writes and notifications share the same MeshService data callback.
 */
export class GattPeripheralTransport implements MeshTransport {
  readonly kind = 'ble' as const;
  private readonly incomingFrames = new GattFrameAssembler();

  constructor(private readonly central: MeshTransport, private readonly peripheral: AndroidGattClient) {}

  async startAdvertising(): Promise<void> {
    const support = await this.peripheral.isSupported();
    if (!support.supported) throw new Error(support.reason);
    await this.peripheral.startAdvertising();
  }

  async stopAdvertising(): Promise<void> { await this.peripheral.stopAdvertising(); }
  async startScan(): Promise<Device[]> { return this.central.startScan(); }
  async stopScan(): Promise<void> { await this.central.stopScan(); }
  async connect(deviceId: string): Promise<void> { await this.central.connect(deviceId); }
  async disconnect(deviceId: string): Promise<void> {
    await Promise.allSettled([this.central.disconnect(deviceId), this.peripheral.disconnectPeer(deviceId)]);
  }

  async send(deviceId: string, payload: Uint8Array): Promise<boolean> {
    try {
      if (await this.central.send(deviceId, payload)) return true;
    } catch {
      // An incoming GATT-server peer is not known to the central adapter; fall through to notification delivery.
    }
    for (const fragment of fragmentGattFrame(payload)) {
      if (!(await this.peripheral.sendPacket(deviceId, encodeBase64(fragment)))) return false;
    }
    return true;
  }

  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void {
    const stopCentral = this.central.onData(callback);
    const stopPeripheral = this.peripheral.onPacket((deviceId, packet) => {
      const complete = this.incomingFrames.accept(deviceId, packet);
      if (complete) callback(deviceId, complete);
    });
    return () => { stopCentral(); stopPeripheral(); };
  }

  onPeerState(callback: (event: GattPeerEvent) => void): () => void { return this.peripheral.onPeerState(callback); }
  async getPeerLinkMetrics(deviceId: string): Promise<PeerLinkMetrics> {
    if (this.central.getPeerLinkMetrics) return this.central.getPeerLinkMetrics(deviceId);
    return { transport: 'ble', strength: 'unavailable', rssi_dbm: null, estimated_distance_m: null, source: 'unavailable', detail: 'No current signal measurement is available for this GATT-server peer.' };
  }
}
