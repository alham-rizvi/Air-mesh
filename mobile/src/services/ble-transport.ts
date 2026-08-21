import { BOUNDED_BLE_SCAN_WINDOW_MS } from './discovery';
import { fragmentGattFrame, GattFrameAssembler } from './gatt-framing';
import type { Device, MeshTransport } from './types';

export interface BleCharacteristicLike {
  uuid: string;
  value?: string | null;
}

export interface BlePeripheralLike {
  id: string;
  name?: string | null;
  localName?: string | null;
  rssi?: number | null;
  connect(): Promise<BlePeripheralLike>;
  discoverAllServicesAndCharacteristics(): Promise<BlePeripheralLike>;
  monitorCharacteristicForService(serviceUuid: string, characteristicUuid: string, listener: (error: Error | null, characteristic: BleCharacteristicLike | null) => void): { remove(): void };
  writeCharacteristicWithResponseForService(serviceUuid: string, characteristicUuid: string, value: string): Promise<BleCharacteristicLike>;
}

export interface BleClientLike {
  startDeviceScan(serviceUuids: string[] | null, options: object | null, listener: (error: Error | null, device: BlePeripheralLike | null) => void): void;
  stopDeviceScan(): void;
  connectToDevice(deviceId: string): Promise<BlePeripheralLike>;
  cancelDeviceConnection?(deviceId: string): Promise<unknown>;
}

export const AIR_MESH_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const AIR_MESH_CHARACTERISTICS = {
  DEVICE_INFO: '4fafc202-1fb5-459e-8fcc-c5c9c331914b',
  ROUTING_TABLE: '4fafc203-1fb5-459e-8fcc-c5c9c331914b',
  MESSAGE_OUTBOX: '4fafc204-1fb5-459e-8fcc-c5c9c331914b',
  MESSAGE_INBOX: '4fafc205-1fb5-459e-8fcc-c5c9c331914b',
  SYNC_CONTROL: '4fafc206-1fb5-459e-8fcc-c5c9c331914b',
} as const;

export class BlePlxTransport implements MeshTransport {
  readonly kind = 'ble' as const;
  private readonly devices = new Map<string, BlePeripheralLike>();
  private readonly subscriptions = new Map<string, { remove(): void }>();
  private readonly incomingFrames = new GattFrameAssembler();
  private listener: ((deviceId: string, payload: Uint8Array) => void) | null = null;
  private finishScan: (() => void) | null = null;

  constructor(private readonly client: BleClientLike, private readonly scanWindowMs = BOUNDED_BLE_SCAN_WINDOW_MS) {}

  async startAdvertising(): Promise<void> {
    throw new Error('BLE advertising requires a native peripheral module; react-native-ble-plx provides central scanning only.');
  }

  async stopAdvertising(): Promise<void> {}

  async startScan(): Promise<Device[]> {
    await this.stopScan();
    return new Promise<Device[]>((resolve, reject) => {
      const discovered = new Map<string, Device>();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.finishScan = null;
        this.client.stopDeviceScan();
        resolve(Array.from(discovered.values()));
      };
      const timer = setTimeout(finish, this.scanWindowMs);
      this.finishScan = finish;
      this.client.startDeviceScan([AIR_MESH_SERVICE_UUID], { allowDuplicates: false }, (error, peripheral) => {
        if (error) {
          if (!done) {
            done = true;
            clearTimeout(timer);
            this.finishScan = null;
            this.client.stopDeviceScan();
            reject(error);
          }
          return;
        }
        if (!peripheral) return;
        this.devices.set(peripheral.id, peripheral);
        discovered.set(peripheral.id, {
          id: peripheral.id,
          name: peripheral.localName || peripheral.name || 'Nearby Air-Mesh device',
          role: 'user',
          rssi: peripheral.rssi ?? -100,
        });
      });
    });
  }

  async stopScan(): Promise<void> { this.finishScan?.(); this.finishScan = null; this.client.stopDeviceScan(); }

  async connect(deviceId: string): Promise<void> {
    const peripheral = await (this.devices.get(deviceId) ?? this.client.connectToDevice(deviceId));
    await peripheral.connect();
    await peripheral.discoverAllServicesAndCharacteristics();
    this.devices.set(deviceId, peripheral);
    const subscription = peripheral.monitorCharacteristicForService(AIR_MESH_SERVICE_UUID, AIR_MESH_CHARACTERISTICS.MESSAGE_INBOX, (error, characteristic) => {
      if (error || !characteristic?.value || !this.listener) return;
      const binary = atob(characteristic.value);
      const complete = this.incomingFrames.accept(deviceId, Uint8Array.from(binary, (character) => character.charCodeAt(0)));
      if (complete) this.listener(deviceId, complete);
    });
    this.subscriptions.set(deviceId, subscription);
  }

  async disconnect(deviceId: string): Promise<void> { this.subscriptions.get(deviceId)?.remove(); this.subscriptions.delete(deviceId); await this.client.cancelDeviceConnection?.(deviceId); this.devices.delete(deviceId); }

  async send(deviceId: string, payload: Uint8Array): Promise<boolean> {
    const peripheral = this.devices.get(deviceId);
    if (!peripheral) return false;
    for (const fragment of fragmentGattFrame(payload)) {
      let binary = '';
      fragment.forEach((byte) => { binary += String.fromCharCode(byte); });
      await peripheral.writeCharacteristicWithResponseForService(AIR_MESH_SERVICE_UUID, AIR_MESH_CHARACTERISTICS.MESSAGE_OUTBOX, btoa(binary));
    }
    return true;
  }

  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void { this.listener = callback; return () => { this.listener = null; }; }
}
