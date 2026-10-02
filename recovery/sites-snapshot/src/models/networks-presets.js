(function (root) {
  'use strict';
  root.FokoNetworksPresets = {
    'undirected-social': {
      title: 'Undirected social graph',
      directed: false,
      operation: 'summary',
      source: 'A', target: 'G',
      edges: 'source,target,weight\nA,B,1\nA,C,1\nB,C,1\nB,D,1\nC,E,1\nD,E,1\nD,F,1\nE,F,1\nF,G,1',
      note: 'A small connected graph for degree, closeness and weighted betweenness diagnostics. Node labels are categorical identifiers.'
    },
    'directed-information': {
      title: 'Directed information flow',
      directed: true,
      operation: 'centrality',
      source: 'Source', target: 'Archive',
      edges: 'source,target,weight\nSource,Filter,4\nSource,Bypass,1\nFilter,Model,3\nBypass,Model,1\nModel,Review,2\nReview,Archive,2\nModel,Archive,1\nArchive,Review,0.5',
      note: 'Directed weighted edges are interpreted as relative flow strengths. PageRank uses outgoing weight proportions, not physical conservation.'
    },
    'transport-path': {
      title: 'Weighted transport network',
      directed: false,
      operation: 'shortest',
      source: 'A', target: 'G',
      edges: 'source,target,weight\nA,B,4\nA,C,2\nB,D,5\nC,D,1\nC,E,7\nD,F,3\nE,F,1\nF,G,2\nD,G,8',
      note: 'Weights are non-negative path costs. The shortest route minimizes their sum; it does not account for uncertainty, capacity or congestion.'
    },
    'two-communities': {
      title: 'Two-community heuristic example',
      directed: false,
      operation: 'communities',
      source: 'A', target: 'H',
      edges: 'source,target,weight\nA,B,3\nA,C,2\nB,C,3\nB,D,2\nC,D,3\nE,F,3\nE,G,2\nF,G,3\nF,H,2\nG,H,3\nD,E,0.25',
      note: 'A weak bridge separates two dense groups. Label propagation is deterministic here but remains a heuristic, not a unique community partition.'
    },
    'mst-design': {
      title: 'Minimum spanning tree design',
      directed: false,
      operation: 'mst',
      source: 'P1', target: 'P6',
      edges: 'source,target,weight\nP1,P2,2\nP1,P3,5\nP2,P3,1\nP2,P4,4\nP3,P4,2\nP3,P5,6\nP4,P5,3\nP4,P6,7\nP5,P6,1',
      note: 'The MST minimizes total listed edge weight for a connected undirected graph. It does not include redundancy, reliability or capacity constraints.'
    },
    'resilience-hub': {
      title: 'Hub-removal resilience stress test',
      directed: false,
      operation: 'resilience',
      source: 'Hub', target: 'L6',
      edges: 'source,target,weight\nHub,L1,1\nHub,L2,1\nHub,L3,1\nHub,L4,1\nHub,L5,1\nHub,L6,1\nL1,L2,0.5\nL3,L4,0.5\nL5,L6,0.5',
      note: 'Nodes are removed in descending initial degree without adaptive re-ranking. The curve is a deterministic scenario, not a probabilistic failure model.'
    },
    'disconnected-directed': {
      title: 'Disconnected directed graph',
      directed: true,
      operation: 'summary',
      source: 'A', target: 'F',
      edges: 'source,target,weight\nA,B,1\nB,C,1\nC,A,1\nD,E,1\nE,F,1',
      note: 'Weak and strongly connected components differ. PageRank still returns a normalized score through damping and dangling-node redistribution.'
    }
  };
}(typeof window !== 'undefined' ? window : globalThis));
