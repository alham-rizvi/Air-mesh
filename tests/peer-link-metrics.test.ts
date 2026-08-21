import { describe, expect, it, vi } from 'vitest';

import { peerLinkMetricsFromBleRssi } from '../mobile/src/services/discovery';
import { BlePlxTransport, type BleClientLike } from '../mobile/src/services/ble-transport';
import type { AndroidWifiDirectClient } from '../mobile/src/services/wifi-direct-client';
import { WifiDirectTransport } from '../mobile/src/services/wifi-direct-transport';

describe('active peer-link metrics', () => {
  it('derives strength and a clearly uncalibrated distance only from a real BLE RSSI value', () => {
    const measured = peerLinkMetricsFromBleRssi(-66);
    expect(measured).toMatchObject({ transport: 'ble', strength: 'good', rssi_dbm: -66, source: 'ble-rssi-uncalibrated' });
    expect(measured.estimated_distance_m).toBeGreaterThanOrEqual(1);
    expect(measured.detail).toContain('uncalibrated');
    expect(peerLinkMetricsFromBleRssi(null)).toMatchObject({ strength: 'unavailable', estimated_distance_m: null, rssi_dbm: null });
  });

  it('refreshes a connected BLE peripheral RSSI instead of reusing a discovery placeholder', async () => {
    const peripheral = {
      id: 'peer-1', rssi: -90,
      connect: vi.fn(async function () { return peripheral; }),
      discoverAllServicesAndCharacteristics: vi.fn(async function () { return peripheral; }),
      monitorCharacteristicForService: vi.fn(() => ({ remove: vi.fn() })),
      writeCharacteristicWithResponseForService: vi.fn(async () => ({ uuid: 'outbox' })),
      readRSSI: vi.fn(async function () { return { ...peripheral, rssi: -57 }; }),
    };
    const client: BleClientLike = { startDeviceScan: vi.fn(), stopDeviceScan: vi.fn(), connectToDevice: vi.fn(async () => peripheral) };
    const transport = new BlePlxTransport(client);
    await transport.connect('peer-1');
    await expect(transport.getPeerLinkMetrics('peer-1')).resolves.toMatchObject({ strength: 'good', rssi_dbm: -57, source: 'ble-rssi-uncalibrated' });
  });

  it('shows Wi-Fi Direct as connected-but-unmeasured rather than fabricating RSSI or meters', async () => {
    const client: AndroidWifiDirectClient = {
      isSupported: async () => ({ supported: true, wifiDirectFeature: true, reason: 'ready' }), startDiscovery: async () => undefined, stopDiscovery: async () => undefined,
      connect: async () => undefined, disconnect: async () => undefined, sendPacket: async () => true,
      onDevice: () => () => undefined, onPacket: () => () => undefined, onPeerState: () => () => undefined, onStatus: () => () => undefined,
    };
    await expect(new WifiDirectTransport(client).getPeerLinkMetrics()).resolves.toMatchObject({ transport: 'wifi-direct', strength: 'unavailable', rssi_dbm: null, estimated_distance_m: null, source: 'wifi-direct-unavailable' });
  });
});
