import type { RoutingEntry } from './types';

export type ObservedTopology = { nodes: Array<{ id: string; directlyConnected: boolean }>; edges: Array<{ from: string; to: string; kind: 'connected' | 'route' }> };

export function buildObservedTopology(routes: RoutingEntry[], connectedPeers: string[]): ObservedTopology {
  const nodeIds = Array.from(new Set([...connectedPeers, ...routes.flatMap((route) => [route.next_hop_device_id, route.destination_device_id])])).filter(Boolean).slice(0, 6);
  const nodeSet = new Set(nodeIds);
  return {
    nodes: nodeIds.map((id) => ({ id, directlyConnected: connectedPeers.includes(id) })),
    edges: [
      ...connectedPeers.filter((id) => nodeSet.has(id)).map((id) => ({ from: 'self', to: id, kind: 'connected' as const })),
      ...routes.filter((route) => nodeSet.has(route.next_hop_device_id) && nodeSet.has(route.destination_device_id) && route.next_hop_device_id !== route.destination_device_id).map((route) => ({ from: route.next_hop_device_id, to: route.destination_device_id, kind: 'route' as const })),
    ],
  };
}
