import type { Device, DeviceRole, PeerLinkMetrics, PeerLinkStrength } from './types';

export const BOUNDED_BLE_SCAN_WINDOW_MS = 4_500;

export function scanSecondsRemaining(elapsedMs: number, windowMs = BOUNDED_BLE_SCAN_WINDOW_MS): number {
  return Math.max(0, Math.ceil((windowMs - elapsedMs) / 1_000));
}

export type TopologyNode = { id: string; role: DeviceRole; title: string; description: string };

export const AIR_MESH_TOPOLOGY: TopologyNode[] = [
  { id: 'shelter', role: 'shelter', title: 'Shelter device', description: 'Creates local reports and queues messages.' },
  { id: 'courier', role: 'courier', title: 'Courier device', description: 'Carries reports and messages between nearby peers.' },
  { id: 'base', role: 'base', title: 'Base camp', description: 'Receives courier sync through BLE or local HTTP and prioritizes rescue work.' },
  { id: 'relay', role: 'user', title: 'Mesh relay', description: 'Stores and forwards encrypted envelopes when the destination is out of range.' },
];

export function distanceLabel(rssi: number | null): string {
  if (rssi === null) return 'Signal unavailable';
  if (rssi > -55) return 'Very close';
  if (rssi > -70) return 'Nearby';
  if (rssi > -82) return 'In range';
  return 'At edge';
}

/** Returns a coarse BLE path-loss estimate from a real, uncalibrated RSSI reading. */
export function peerLinkMetricsFromBleRssi(rssi: number | null): PeerLinkMetrics {
  if (rssi === null || !Number.isFinite(rssi)) {
    return { transport: 'ble', strength: 'unavailable', rssi_dbm: null, estimated_distance_m: null, source: 'unavailable', detail: 'This connected peer does not expose a current Bluetooth RSSI reading.' };
  }
  const strength: PeerLinkStrength = rssi >= -55 ? 'excellent' : rssi >= -67 ? 'good' : rssi >= -78 ? 'fair' : 'weak';
  const estimated = Math.max(1, Math.round(10 ** ((-59 - rssi) / 27)));
  return {
    transport: 'ble',
    strength,
    rssi_dbm: Math.round(rssi),
    estimated_distance_m: estimated,
    source: 'ble-rssi-uncalibrated',
    detail: 'Estimated from current Bluetooth RSSI using an uncalibrated path-loss model; walls, phones, and orientation can change it substantially.',
  };
}

export function sortDiscoveredDevices(devices: Device[]): Device[] {
  return [...devices].sort((left, right) => (right.rssi ?? Number.NEGATIVE_INFINITY) - (left.rssi ?? Number.NEGATIVE_INFINITY) || left.name.localeCompare(right.name));
}

export function roleLabel(role: DeviceRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
