import type { Device, PeerConnectionState } from './types';

export type WifiDirectSupport = { supported: boolean; wifiDirectFeature: boolean; reason: string };
export type WifiDirectPeerEvent = { deviceId: string; state: PeerConnectionState };

export interface AndroidWifiDirectClient {
  isSupported(): Promise<WifiDirectSupport>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  sendPacket(deviceId: string, payloadBase64: string): Promise<boolean>;
  onDevice(callback: (device: Device) => void): () => void;
  onPacket(callback: (deviceId: string, payload: Uint8Array) => void): () => void;
  onPeerState(callback: (event: WifiDirectPeerEvent) => void): () => void;
  onStatus(callback: (status: { state: string; reason?: string }) => void): () => void;
}

/** Web/Vitest fallback. Metro resolves `wifi-direct-client.native.ts` on a native Android build. */
export function createAndroidWifiDirectClient(): AndroidWifiDirectClient {
  throw new Error('Air-Mesh Wi-Fi Direct is available only in an Android native build.');
}
