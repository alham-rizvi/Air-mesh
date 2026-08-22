export type ImportedTopology = { nodes: string[]; edges: Array<{ from: string; to: string; kind: 'connected' | 'route' }> };
export type ImportedSupportBundleSummary = { generatedAt: string; transport: string; connectedPeers: number; routes: number; senderQueue: number; relayQueue: number; retryEntries: number };
export type ImportedSupportBundle = { summary: ImportedSupportBundleSummary; topology: ImportedTopology };
type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`); return value as JsonObject; }
function array(value: unknown, label: string): unknown[] { if (!Array.isArray(value)) throw new Error(`${label} must be an array.`); return value; }
function string(value: unknown, label: string): string { if (typeof value !== 'string' || !value) throw new Error(`${label} must be a non-empty string.`); return value; }

/** Validates only the app's intentionally redacted support schema. It has no database or transport side effects. */
export function parseRedactedSupportBundle(raw: string): ImportedSupportBundle {
  if (raw.length > 256_000) throw new Error('Support bundle exceeds the 256 KB import limit.');
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new Error('Support bundle is not valid JSON.'); }
  const root = object(parsed, 'Support bundle');
  const allowed = new Set(['schema_version', 'generated_at', 'privacy', 'mesh_status', 'observed_topology', 'routes', 'pending_sender_outbox', 'pending_relay_queue', 'retry_history']);
  for (const key of Object.keys(root)) if (!allowed.has(key)) throw new Error(`Unsupported support-bundle field: ${key}.`);
  if (root.schema_version !== 1) throw new Error('Unsupported support-bundle schema version.');
  const privacy = object(root.privacy, 'privacy');
  if (privacy.contains_plaintext !== false || privacy.contains_ciphertext !== false || privacy.contains_keys !== false || privacy.contains_receipt_payloads !== false) throw new Error('Support bundle is not redacted and cannot be imported.');
  const status = object(root.mesh_status, 'mesh_status');
  const topology = object(root.observed_topology, 'observed_topology');
  const nodes = array(topology.nodes, 'observed_topology.nodes');
  const edges = array(topology.edges, 'observed_topology.edges');
  const routes = array(root.routes, 'routes'); const outbox = array(root.pending_sender_outbox, 'pending_sender_outbox'); const relay = array(root.pending_relay_queue, 'pending_relay_queue'); const retry = array(root.retry_history, 'retry_history');
  for (const forbidden of ['ciphertext', 'encrypted_payload', 'opaque_envelope', 'receipt_payload', 'private_key', 'content', 'plaintext']) if (raw.includes(`"${forbidden}"`)) throw new Error(`Support bundle contains forbidden sensitive field: ${forbidden}.`);
  const importedNodes = nodes.map((node, index) => string(object(node, `observed_topology.nodes[${index}]`).id, `observed_topology.nodes[${index}].id`));
  const importedEdges: ImportedTopology['edges'] = edges.map((edge, index) => { const value = object(edge, `observed_topology.edges[${index}]`); const rawKind = value.kind; if (rawKind !== 'connected' && rawKind !== 'route') throw new Error('Support bundle contains an unsupported topology edge kind.'); const kind: 'connected' | 'route' = rawKind === 'connected' ? 'connected' : 'route'; return { from: string(value.from, `observed_topology.edges[${index}].from`), to: string(value.to, `observed_topology.edges[${index}].to`), kind }; });
  return { summary: { generatedAt: string(root.generated_at, 'generated_at'), transport: string(status.transport, 'mesh_status.transport'), connectedPeers: nodes.length, routes: routes.length, senderQueue: outbox.length, relayQueue: relay.length, retryEntries: retry.length }, topology: { nodes: importedNodes, edges: importedEdges } };
}
