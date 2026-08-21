import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import type { AndroidGattClient, GattPeerEvent } from './gatt-peripheral-transport';

type NativeGattModule = {
  isSupported(): Promise<{ supported: boolean; bluetoothEnabled: boolean; multipleAdvertisementSupported: boolean; reason: string }>;
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  sendPacket(deviceId: string, payloadBase64: string): Promise<boolean>;
  disconnectPeer(deviceId: string): Promise<void>;
};

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function createAndroidGattClient(): AndroidGattClient {
  if (Platform.OS !== 'android') throw new Error('Air-Mesh GATT peripheral is available only in an Android native build.');
  const nativeModule = NativeModules.AirMeshGatt as NativeGattModule | undefined;
  if (!nativeModule) throw new Error('Air-Mesh GATT native bridge is unavailable. Reinstall an APK that includes the native BLE peripheral module.');
  const emitter = new NativeEventEmitter(nativeModule as never);
  return {
    isSupported: () => nativeModule.isSupported(),
    startAdvertising: () => nativeModule.startAdvertising(),
    stopAdvertising: () => nativeModule.stopAdvertising(),
    sendPacket: (deviceId, payloadBase64) => nativeModule.sendPacket(deviceId, payloadBase64),
    disconnectPeer: (deviceId) => nativeModule.disconnectPeer(deviceId),
    onPacket: (callback) => {
      const subscription = emitter.addListener('airMeshGattPacket', (event: { deviceId: string; payloadBase64: string }) => callback(event.deviceId, decodeBase64(event.payloadBase64)));
      return () => subscription.remove();
    },
    onPeerState: (callback) => {
      const subscription = emitter.addListener('airMeshGattPeerState', (event: GattPeerEvent) => callback(event));
      return () => subscription.remove();
    },
  };
}
