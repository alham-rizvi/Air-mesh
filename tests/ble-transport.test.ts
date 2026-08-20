import { describe, expect, it, vi } from 'vitest';
import { AIR_MESH_SERVICE_UUID, BlePlxTransport, type BleClientLike } from '../mobile/src/services/ble-transport';

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
});
