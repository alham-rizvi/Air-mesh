import type { ObservedTopology } from './topology-model';
import type { ImportedTopology } from './support-bundle-import';

function redact(value: string): string { return value.length <= 6 ? 'redacted' : `${value.slice(0, 4)}…${value.slice(-2)}`; }
export type TopologyDifference = { sharedNodes: string[]; liveOnlyNodes: string[]; importedOnlyNodes: string[]; sharedEdges: number; liveOnlyEdges: number; importedOnlyEdges: number };

export function compareTopologies(live: ObservedTopology, imported: ImportedTopology): TopologyDifference {
  const liveNodes = new Set(live.nodes.map((node) => redact(node.id))); const importedNodes = new Set(imported.nodes);
  const nodeIntersection = Array.from(liveNodes).filter((node) => importedNodes.has(node));
  const edgeKey = (edge: { from: string; to: string; kind: string }) => `${edge.kind}:${edge.from}:${edge.to}`;
  const liveEdges = new Set(live.edges.map((edge) => edgeKey({ ...edge, from: edge.from === 'self' ? 'self' : redact(edge.from), to: redact(edge.to) })));
  const importedEdges = new Set(imported.edges.map(edgeKey)); const edgeIntersection = Array.from(liveEdges).filter((edge) => importedEdges.has(edge));
  return { sharedNodes: nodeIntersection, liveOnlyNodes: Array.from(liveNodes).filter((node) => !importedNodes.has(node)), importedOnlyNodes: Array.from(importedNodes).filter((node) => !liveNodes.has(node)), sharedEdges: edgeIntersection.length, liveOnlyEdges: liveEdges.size - edgeIntersection.length, importedOnlyEdges: importedEdges.size - edgeIntersection.length };
}
