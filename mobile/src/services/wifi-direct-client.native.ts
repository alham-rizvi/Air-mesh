import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { Device, PeerConnectionState } from './types';
import type { AndroidWifiDirectClient, WifiDirectPeerEvent, WifiDirectSupport } from './wifi-direct-client';

type NativeWifiDirectModule = {
  isSupported(): Promise<WifiDirectSupport>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  sendPacket(deviceId: string, payloadBase64: string): Promise<boolean>;
};

function decodeBase64(value: string): Uint8Array { const binary = atob(value); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }

export function createAndroidWifiDirectClient(): AndroidWifiDirectClient {
  if (Platform.OS !== 'android') throw new Error('Air-Mesh Wi-Fi Direct is available only in an Android native build.');
  const nativeModule = NativeModules.AirMeshWifiDirect as NativeWifiDirectModule | undefined;
  if (!nativeModule) throw new Error('Air-Mesh Wi-Fi Direct native bridge is unavailable. Reinstall an APK that includes the native P2P module.');
  const emitter = new NativeEventEmitter(nativeModule as never);
  return {
    isSupported: () => nativeModule.isSupported(),
    startDiscovery: () => nativeModule.startDiscovery(),
    stopDiscovery: () => nativeModule.stopDiscovery(),
    connect: (deviceId) => nativeModule.connect(deviceId),
    disconnect: (deviceId) => nativeModule.disconnect(deviceId),
    sendPacket: (deviceId, payloadBase64) => nativeModule.sendPacket(deviceId, payloadBase64),
    onDevice: (callback) => { const listener = emitter.addListener('airMeshWifiDirectDevice', (device: Device) => callback({ ...device, rssi: device.rssi ?? null })); return () => listener.remove(); },
    onPacket: (callback) => { const listener = emitter.addListener('airMeshWifiDirectPacket', (event: { deviceId: string; payloadBase64: string }) => callback(event.deviceId, decodeBase64(event.payloadBase64))); return () => listener.remove(); },
    onPeerState: (callback) => { const listener = emitter.addListener('airMeshWifiDirectPeerState', (event: WifiDirectPeerEvent) => callback(event)); return () => listener.remove(); },
    onStatus: (callback) => { const listener = emitter.addListener('airMeshWifiDirectStatus', callback); return () => listener.remove(); },
  };
}
