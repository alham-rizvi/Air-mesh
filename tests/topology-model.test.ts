import { describe, expect, it } from 'vitest';
import { buildObservedTopology } from '../mobile/src/services/topology-model';

describe('observed mesh topology', () => {
  it('derives only local connected peers and route-table endpoints, with direct and routed edges distinguished', () => {
    const topology = buildObservedTopology([{ destination_device_id: 'bob', next_hop_device_id: 'relay', hop_count: 2, updated_at: new Date().toISOString() }], ['relay']);
    expect(topology.nodes).toEqual(expect.arrayContaining([{ id: 'relay', directlyConnected: true }, { id: 'bob', directlyConnected: false }]));
    expect(topology.edges).toEqual(expect.arrayContaining([{ from: 'self', to: 'relay', kind: 'connected' }, { from: 'relay', to: 'bob', kind: 'route' }]));
  });

  it('reports no nodes or edges when no local topology has been observed', () => {
    expect(buildObservedTopology([], [])).toEqual({ nodes: [], edges: [] });
  });
});
