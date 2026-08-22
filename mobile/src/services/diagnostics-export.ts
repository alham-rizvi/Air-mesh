import type { OutboxEnvelope, RelayQueueEnvelope } from '../types/security-data';
import type { MeshStatus, RoutingEntry } from './types';
import { buildObservedTopology } from './topology-model';

function redactIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 6) return 'redacted';
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

export type MeshDiagnosticsSnapshot = { generated_at: string; mesh_status: MeshStatus; routes: RoutingEntry[]; connected_peers: string[]; outbox: OutboxEnvelope[]; relay_queue: RelayQueueEnvelope[] };

export function buildRedactedDiagnosticsExport(snapshot: MeshDiagnosticsSnapshot): string {
  const topology = buildObservedTopology(snapshot.routes, snapshot.connected_peers);
  return JSON.stringify({
    schema_version: 1,
    generated_at: snapshot.generated_at,
    privacy: { contains_plaintext: false, contains_ciphertext: false, contains_keys: false, contains_receipt_payloads: false, identifiers: 'partially redacted' },
    mesh_status: snapshot.mesh_status,
    observed_topology: { nodes: topology.nodes.map((node) => ({ id: redactIdentifier(node.id), directly_connected: node.directlyConnected })), edges: topology.edges.map((edge) => ({ from: edge.from === 'self' ? 'self' : redactIdentifier(edge.from), to: redactIdentifier(edge.to), kind: edge.kind })) },
    routes: snapshot.routes.map((route) => ({ destination: redactIdentifier(route.destination_device_id), next_hop: redactIdentifier(route.next_hop_device_id), hop_count: route.hop_count, updated_at: route.updated_at })),
    pending_sender_outbox: snapshot.outbox.map((entry) => ({ message_id: redactIdentifier(entry.message_id), destination: redactIdentifier(entry.destination_id), ttl: entry.ttl, created_at: entry.created_at, last_attempt_at: entry.last_attempt_at, attempt_count: entry.attempt_count, status: entry.status })),
    pending_relay_queue: snapshot.relay_queue.map((entry) => ({ queue_id: redactIdentifier(entry.id), message_id: redactIdentifier(entry.message_id), destination: redactIdentifier(entry.destination_id), next_hop: redactIdentifier(entry.next_hop_id), ttl: entry.ttl, created_at: entry.created_at, last_attempt_at: entry.last_attempt_at, attempt_count: entry.attempt_count, status: entry.status })),
  }, null, 2);
}
