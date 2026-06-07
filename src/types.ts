export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface DijkstraStep {
  id: number;
  currentNode: string | null;
  neighborNode: string | null;
  visitedNodes: string[];
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  queue: { nodeId: string; distance: number }[];
  highlightedEdges: string[]; // Edge IDs
  shortestPathEdges: string[]; // Edge IDs (when highlighting final shortest path)
  codeLineKey: string; // Key to highlight in code
  explanation: string; // Explanations in Vietnamese
}

export type CodeLanguage = 'pseudo-c' | 'cpp' | 'python' | 'javascript';

export interface CodeLine {
  key: string;
  text: string;
  indent: number;
}

export interface SavedPreset {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
