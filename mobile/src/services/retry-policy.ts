import type { OutboxEnvelope } from '../types/security-data';
import type { RoutingEntry } from './types';

export const MAX_AUTOMATIC_RETRY_ATTEMPTS = 8;
export const STALE_ROUTE_AFTER_MS = 15 * 60 * 1000;

export type PendingMessageWarning =
  | { kind: 'retry-limit'; title: 'Retry limit reached'; detail: string }
  | { kind: 'stale-route'; title: 'Route is stale'; detail: string }
  | { kind: 'waiting-peer'; title: 'Waiting for peer'; detail: string };

export function routeIsStale(route: RoutingEntry | undefined, at = Date.now()): boolean {
  if (!route) return false;
  const updatedAt = Date.parse(route.updated_at);
  return !Number.isFinite(updatedAt) || at - updatedAt > STALE_ROUTE_AFTER_MS;
}

export function pendingMessageWarning(envelope: OutboxEnvelope, routes: RoutingEntry[], at = Date.now()): PendingMessageWarning | null {
  if (envelope.attempt_count >= MAX_AUTOMATIC_RETRY_ATTEMPTS) {
    return { kind: 'retry-limit', title: 'Retry limit reached', detail: `Automatic retry paused after ${envelope.attempt_count} attempts. Retry manually after checking nearby peers.` };
  }
  const route = routes.find((entry) => entry.destination_device_id === envelope.destination_id);
  if (routeIsStale(route, at)) {
    return { kind: 'stale-route', title: 'Route is stale', detail: `The route via ${route?.next_hop_device_id ?? 'an unknown peer'} has not refreshed recently. Retry waits for a newer route.` };
  }
  if (!route) return { kind: 'waiting-peer', title: 'Waiting for peer', detail: 'No current route is known for this peer. Air-Mesh will retry when an eligible peer or route appears.' };
  return null;
}

export function shouldAttemptEnvelope(envelope: OutboxEnvelope, routes: RoutingEntry[], at = Date.now()): boolean {
  return envelope.attempt_count < MAX_AUTOMATIC_RETRY_ATTEMPTS && !routeIsStale(routes.find((entry) => entry.destination_device_id === envelope.destination_id), at);
}
