import { describe, expect, it } from 'vitest';
import { buildRedactedTopologyDifferenceExport } from '../mobile/src/services/topology-difference-export';

describe('topology-difference export', () => {
  it('exports only redacted comparison metadata for offline review', () => {
    const raw = buildRedactedTopologyDifferenceExport({ generatedAt: '2026-08-22T00:00:00.000Z', importedGeneratedAt: '2026-08-21T00:00:00.000Z', difference: { sharedNodes: ['rela…ne'], liveOnlyNodes: ['peer…ha'], importedOnlyNodes: ['peer…vo'], sharedEdges: 1, liveOnlyEdges: 2, importedOnlyEdges: 3 } });
    const parsed = JSON.parse(raw);
    expect(parsed).toMatchObject({ schema_version: 1, privacy: { contains_plaintext: false, contains_ciphertext: false, contains_keys: false }, topology_difference: { current_only_nodes: ['peer…ha'], imported_only_edges: 3 } });
    expect(parsed).not.toHaveProperty('ciphertext');
    expect(parsed).not.toHaveProperty('private_key');
    expect(parsed).not.toHaveProperty('encrypted_payload');
  });
});
