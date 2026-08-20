import type { Device, DeviceRole } from './types';

export type TopologyNode = { id: string; role: DeviceRole; title: string; description: string };

export const AIR_MESH_TOPOLOGY: TopologyNode[] = [
  { id: 'shelter', role: 'shelter', title: 'Shelter device', description: 'Creates local reports and queues messages.' },
  { id: 'courier', role: 'courier', title: 'Courier device', description: 'Carries reports and messages between nearby peers.' },
  { id: 'base', role: 'base', title: 'Base camp', description: 'Receives courier sync through BLE or local HTTP and prioritizes rescue work.' },
  { id: 'relay', role: 'user', title: 'Mesh relay', description: 'Stores and forwards encrypted envelopes when the destination is out of range.' },
];

export function distanceLabel(rssi: number): string {
  if (rssi > -55) return 'Very close';
  if (rssi > -70) return 'Nearby';
  if (rssi > -82) return 'In range';
  return 'At edge';
}

export function sortDiscoveredDevices(devices: Device[]): Device[] {
  return [...devices].sort((left, right) => right.rssi - left.rssi || left.name.localeCompare(right.name));
}

export function roleLabel(role: DeviceRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
