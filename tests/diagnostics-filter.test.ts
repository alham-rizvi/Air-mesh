import { describe, expect, it } from 'vitest';
import { filterMeshDiagnostics } from '../mobile/src/services/diagnostics-filter';
import { compareTopologies } from '../mobile/src/services/topology-comparison';

const routes = [{ destination_device_id: 'peer-alpha', next_hop_device_id: 'relay-one', hop_count: 2, updated_at: '2026-08-22T00:00:00.000Z' }, { destination_device_id: 'peer-bravo', next_hop_device_id: 'relay-two', hop_count: 1, updated_at: '2026-08-22T00:00:00.000Z' }];

describe('diagnostics search and topology comparison', () => {
  it('filters only current local peer and route data by destination or next hop', () => {
    expect(filterMeshDiagnostics(routes, ['relay-one', 'relay-two'], 'bravo')).toMatchObject({ connectedPeers: [], routes: [routes[1]] });
    expect(filterMeshDiagnostics(routes, ['relay-one', 'relay-two'], 'relay-one')).toMatchObject({ connectedPeers: ['relay-one'], routes: [routes[0]] });
  });
  it('marks shared and differing redacted topology nodes and edges without mutating either input', () => {
    const difference = compareTopologies({ nodes: [{ id: 'relay-one', directlyConnected: true }, { id: 'peer-alpha', directlyConnected: false }], edges: [{ from: 'self', to: 'relay-one', kind: 'connected' }, { from: 'relay-one', to: 'peer-alpha', kind: 'route' }] }, { nodes: ['rela…ne', 'peer…ha', 'peer…vo'], edges: [{ from: 'self', to: 'rela…ne', kind: 'connected' }, { from: 'rela…ne', to: 'peer…ha', kind: 'route' }] });
    expect(difference).toMatchObject({ sharedNodes: ['rela…ne', 'peer…ha'], importedOnlyNodes: ['peer…vo'], sharedEdges: 2 });
  });
});
