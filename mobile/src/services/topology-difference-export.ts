import type { TopologyDifference } from './topology-comparison';

export function buildRedactedTopologyDifferenceExport(input: { generatedAt: string; importedGeneratedAt: string; difference: TopologyDifference }): string {
  return JSON.stringify({
    schema_version: 1,
    generated_at: input.generatedAt,
    comparison: { imported_bundle_generated_at: input.importedGeneratedAt, read_only: true },
    privacy: { contains_plaintext: false, contains_ciphertext: false, contains_keys: false, contains_receipt_payloads: false, identifiers: 'redacted comparison identifiers only' },
    topology_difference: {
      shared_nodes: input.difference.sharedNodes,
      current_only_nodes: input.difference.liveOnlyNodes,
      imported_only_nodes: input.difference.importedOnlyNodes,
      shared_edges: input.difference.sharedEdges,
      current_only_edges: input.difference.liveOnlyEdges,
      imported_only_edges: input.difference.importedOnlyEdges,
    },
  }, null, 2);
}
