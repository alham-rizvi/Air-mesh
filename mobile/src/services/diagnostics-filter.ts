import type { RoutingEntry } from './types';

export function filterMeshDiagnostics(routes: RoutingEntry[], connectedPeers: string[], query: string): { routes: RoutingEntry[]; connectedPeers: string[] } {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { routes, connectedPeers };
  const matches = (value: string) => value.toLowerCase().includes(normalized);
  return { connectedPeers: connectedPeers.filter(matches), routes: routes.filter((route) => matches(route.destination_device_id) || matches(route.next_hop_device_id)) };
}
