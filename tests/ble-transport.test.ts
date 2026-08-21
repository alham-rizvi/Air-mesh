import { describe, expect, it, vi } from 'vitest';
import { AIR_MESH_CHARACTERISTICS, AIR_MESH_SERVICE_UUID, BlePlxTransport, type BleClientLike } from '../mobile/src/services/ble-transport';
import { fragmentGattFrame } from '../mobile/src/services/gatt-framing';

describe('BLE transport boundary', () => {
  it('collects scan callbacks for a bounded window before returning discovered peers', async () => {
    vi.useFakeTimers();
    let listener: Parameters<BleClientLike['startDeviceScan']>[2] | undefined;
    const client: BleClientLike = {
      startDeviceScan: vi.fn((_services, _options, callback) => { listener = callback; }),
      stopDeviceScan: vi.fn(),
      connectToDevice: vi.fn(),
    };
    const transport = new BlePlxTransport(client, 100);
    const pending = transport.startScan();
    await Promise.resolve();
    expect(client.startDeviceScan).toHaveBeenCalledWith([AIR_MESH_SERVICE_UUID], { allowDuplicates: false }, expect.any(Function));
    listener?.(null, {
      id: 'courier-1', localName: 'Courier One', rssi: -61,
      connect: vi.fn(), discoverAllServicesAndCharacteristics: vi.fn(), monitorCharacteristicForService: vi.fn(), writeCharacteristicWithResponseForService: vi.fn(),
    });
    listener?.(null, {
      id: 'courier-1', localName: 'Courier Updated', rssi: -53,
      connect: vi.fn(), discoverAllServicesAndCharacteristics: vi.fn(), monitorCharacteristicForService: vi.fn(), writeCharacteristicWithResponseForService: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toEqual([{ id: 'courier-1', name: 'Courier Updated', role: 'user', rssi: -53 }]);
    expect(client.stopDeviceScan).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('writes ATT-safe fragments and reassembles notifications before exposing a frame to MeshService', async () => {
    let monitor: ((error: Error | null, characteristic: { uuid: string; value?: string | null } | null) => void) | undefined;
    const writes: string[] = [];
    const peripheral = {
      id: 'phone-b',
      connect: vi.fn(async function () { return peripheral; }),
      discoverAllServicesAndCharacteristics: vi.fn(async function () { return peripheral; }),
      monitorCharacteristicForService: vi.fn((_service, _characteristic, callback) => { monitor = callback; return { remove: vi.fn() }; }),
      writeCharacteristicWithResponseForService: vi.fn(async (_service, _characteristic, value) => { writes.push(value); return { uuid: AIR_MESH_CHARACTERISTICS.MESSAGE_OUTBOX }; }),
    };
    const client: BleClientLike = {
      startDeviceScan: vi.fn(),
      stopDeviceScan: vi.fn(),
      connectToDevice: vi.fn(async () => peripheral),
    };
    const transport = new BlePlxTransport(client);
    const received: Uint8Array[] = [];
    transport.onData((_deviceId, payload) => received.push(payload));
    await transport.connect('phone-b');
    await transport.send('phone-b', Uint8Array.from({ length: 31 }, (_, index) => index));
    expect(writes.map((value) => Buffer.from(value, 'base64').length)).toEqual([20, 20, 9]);

    const inbound = Uint8Array.from({ length: 29 }, (_, index) => index + 10);
    fragmentGattFrame(inbound, 200).slice().reverse().forEach((fragment) => {
      monitor?.(null, { uuid: AIR_MESH_CHARACTERISTICS.MESSAGE_INBOX, value: Buffer.from(fragment).toString('base64') });
    });
    expect(received).toEqual([inbound]);
  });
});
