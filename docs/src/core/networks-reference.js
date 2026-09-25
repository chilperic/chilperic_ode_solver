(function (root) {
  'use strict';

  const EPS = 1e-12;

  function assertEdges(edges) {
    if (!Array.isArray(edges) || edges.length === 0) throw new Error('Graph must contain at least one edge.');
    edges.forEach(function (edge, i) {
      if (!edge || typeof edge.source !== 'string' || !edge.source.trim() || typeof edge.target !== 'string' || !edge.target.trim()) {
        throw new Error('Edge ' + (i + 1) + ' must define non-empty source and target node labels.');
      }
      if (!Number.isFinite(edge.weight)) throw new Error('Edge ' + (i + 1) + ' weight must be finite.');
      if (edge.weight < 0) throw new Error('Negative edge weights are not supported by the browser reference.');
    });
    return edges;
  }

  function parseEdges(text) {
    const lines = String(text == null ? '' : text).trim().split(/\n+/).filter(function (line) { return line.trim() && !line.trim().startsWith('#'); });
    if (!lines.length) throw new Error('Edge list is empty.');
    let start = 0;
    const first = lines[0].trim().split(/[\s,;\t]+/).map(function (token) { return token.toLowerCase(); });
    if (first[0] === 'source' && first[1] === 'target') start = 1;
    const edges = [];
    for (let i = start; i < lines.length; i += 1) {
      const tokens = lines[i].trim().split(/[\s,;\t]+/).filter(Boolean);
      if (tokens.length < 2 || tokens.length > 3) throw new Error('Edge row ' + (i + 1) + ' must contain source, target and optional weight.');
      const weight = tokens.length === 3 ? Number(tokens[2]) : 1;
      if (!Number.isFinite(weight)) throw new Error('Edge row ' + (i + 1) + ' has a non-finite weight.');
      edges.push({ source: tokens[0], target: tokens[1], weight: weight, index: edges.length });
    }
    return assertEdges(edges);
  }

  function nodes(edges) {
    assertEdges(edges);
    const seen = new Set();
    edges.forEach(function (edge) { seen.add(edge.source); seen.add(edge.target); });
    return Array.from(seen);
  }

  function adjacency(edges, directed) {
    assertEdges(edges);
    const ns = nodes(edges);
    const adj = Object.fromEntries(ns.map(function (node) { return [node, []]; }));
    edges.forEach(function (edge, i) {
      adj[edge.source].push({ node: edge.target, weight: edge.weight, edgeIndex: i });
      if (!directed) adj[edge.target].push({ node: edge.source, weight: edge.weight, edgeIndex: i });
    });
    return adj;
  }

  function reverseAdjacency(edges) {
    const ns = nodes(edges);
    const adj = Object.fromEntries(ns.map(function (node) { return [node, []]; }));
    edges.forEach(function (edge, i) { adj[edge.target].push({ node: edge.source, weight: edge.weight, edgeIndex: i }); });
    return adj;
  }

  function adjacencyMatrix(edges, directed) {
    const ns = nodes(edges);
    const index = Object.fromEntries(ns.map(function (node, i) { return [node, i]; }));
    const matrix = Array.from({ length: ns.length }, function () { return Array(ns.length).fill(0); });
    edges.forEach(function (edge) {
      matrix[index[edge.source]][index[edge.target]] += edge.weight;
      if (!directed) matrix[index[edge.target]][index[edge.source]] += edge.weight;
    });
    return { nodes: ns, matrix: matrix };
  }

  function degreeMetrics(edges, directed) {
    const ns = nodes(edges);
    const outDegree = Object.fromEntries(ns.map(function (node) { return [node, 0]; }));
    const inDegree = Object.fromEntries(ns.map(function (node) { return [node, 0]; }));
    const outStrength = Object.fromEntries(ns.map(function (node) { return [node, 0]; }));
    const inStrength = Object.fromEntries(ns.map(function (node) { return [node, 0]; }));
    edges.forEach(function (edge) {
      outDegree[edge.source] += 1; inDegree[edge.target] += 1;
      outStrength[edge.source] += edge.weight; inStrength[edge.target] += edge.weight;
      if (!directed) {
        outDegree[edge.target] += 1; inDegree[edge.source] += 1;
        outStrength[edge.target] += edge.weight; inStrength[edge.source] += edge.weight;
      }
    });
    const totalDegree = Object.fromEntries(ns.map(function (node) {
      return [node, directed ? outDegree[node] + inDegree[node] : outDegree[node]];
    }));
    const totalStrength = Object.fromEntries(ns.map(function (node) {
      return [node, directed ? outStrength[node] + inStrength[node] : outStrength[node]];
    }));
    return { outDegree: outDegree, inDegree: inDegree, totalDegree: totalDegree, outStrength: outStrength, inStrength: inStrength, totalStrength: totalStrength };
  }

  function dijkstra(edges, source, directed) {
    assertEdges(edges);
    const ns = nodes(edges);
    if (ns.indexOf(source) < 0) throw new Error('Source node "' + source + '" is not present in the graph.');
    if (edges.some(function (edge) { return edge.weight < 0; })) throw new Error('Dijkstra requires non-negative edge weights.');
    const adj = adjacency(edges, directed);
    const distance = Object.fromEntries(ns.map(function (node) { return [node, Infinity]; }));
    const previous = {};
    const previousEdge = {};
    const visited = new Set();
    distance[source] = 0;
    while (visited.size < ns.length) {
      let current = null; let best = Infinity;
      ns.forEach(function (node) {
        if (!visited.has(node) && distance[node] < best) { best = distance[node]; current = node; }
      });
      if (current == null) break;
      visited.add(current);
      adj[current].forEach(function (entry) {
        const candidate = distance[current] + entry.weight;
        if (candidate + EPS < distance[entry.node]) {
          distance[entry.node] = candidate;
          previous[entry.node] = current;
          previousEdge[entry.node] = entry.edgeIndex;
        }
      });
    }
    return { source: source, distance: distance, previous: previous, previousEdge: previousEdge };
  }

  function shortestPath(edges, source, target, directed) {
    const ns = nodes(edges);
    if (ns.indexOf(target) < 0) throw new Error('Target node "' + target + '" is not present in the graph.');
    const search = dijkstra(edges, source, directed);
    if (!Number.isFinite(search.distance[target])) return { source: source, target: target, distance: Infinity, path: [], edgeIndices: [], reachable: false };
    const path = [target]; const edgeIndices = [];
    let current = target;
    while (current !== source) {
      edgeIndices.push(search.previousEdge[current]);
      current = search.previous[current];
      if (current == null) return { source: source, target: target, distance: Infinity, path: [], edgeIndices: [], reachable: false };
      path.push(current);
    }
    path.reverse(); edgeIndices.reverse();
    return { source: source, target: target, distance: search.distance[target], path: path, edgeIndices: edgeIndices, reachable: true };
  }

  function traverse(adj, start) {
    const seen = new Set([start]); const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
      (adj[queue[i]] || []).forEach(function (entry) {
        if (!seen.has(entry.node)) { seen.add(entry.node); queue.push(entry.node); }
      });
    }
    return Array.from(seen);
  }

  function weakComponents(edges) {
    const adj = adjacency(edges, false);
    const remaining = new Set(Object.keys(adj));
    const components = [];
    while (remaining.size) {
      const start = remaining.values().next().value;
      const component = traverse(adj, start);
      component.forEach(function (node) { remaining.delete(node); });
      components.push(component);
    }
    return components;
  }

  function stronglyConnectedComponents(edges) {
    assertEdges(edges);
    const ns = nodes(edges);
    const adj = adjacency(edges, true);
    const rev = reverseAdjacency(edges);
    const visited = new Set(); const order = [];
    function dfs(node) {
      visited.add(node);
      adj[node].forEach(function (entry) { if (!visited.has(entry.node)) dfs(entry.node); });
      order.push(node);
    }
    ns.forEach(function (node) { if (!visited.has(node)) dfs(node); });
    visited.clear();
    const components = [];
    function collect(node, component) {
      visited.add(node); component.push(node);
      rev[node].forEach(function (entry) { if (!visited.has(entry.node)) collect(entry.node, component); });
    }
    order.reverse().forEach(function (node) {
      if (!visited.has(node)) { const component = []; collect(node, component); components.push(component); }
    });
    return components;
  }

  function closenessCentrality(edges, directed) {
    const ns = nodes(edges);
    const scores = {};
    ns.forEach(function (source) {
      const distance = dijkstra(edges, source, directed).distance;
      const reachable = ns.filter(function (node) { return node !== source && Number.isFinite(distance[node]); });
      const total = reachable.reduce(function (sum, node) { return sum + distance[node]; }, 0);
      const reachFraction = ns.length > 1 ? reachable.length / (ns.length - 1) : 0;
      scores[source] = total > 0 ? reachFraction * reachable.length / total : 0;
    });
    return scores;
  }

  function weightedPageRank(edges, options) {
    assertEdges(edges);
    options = options || {};
    const damping = options.damping == null ? 0.85 : Number(options.damping);
    const tolerance = options.tolerance == null ? 1e-12 : Math.abs(Number(options.tolerance));
    const maxIterations = options.maxIterations == null ? 500 : Math.max(1, Math.floor(options.maxIterations));
    if (!(damping > 0 && damping < 1)) throw new Error('PageRank damping must be between 0 and 1.');
    const ns = nodes(edges); const n = ns.length;
    const outgoing = Object.fromEntries(ns.map(function (node) { return [node, []]; }));
    edges.forEach(function (edge) { outgoing[edge.source].push(edge); });
    let rank = Object.fromEntries(ns.map(function (node) { return [node, 1 / n]; }));
    let delta = Infinity; let iterations = 0;
    for (; iterations < maxIterations; iterations += 1) {
      const next = Object.fromEntries(ns.map(function (node) { return [node, (1 - damping) / n]; }));
      ns.forEach(function (source) {
        const links = outgoing[source];
        const totalWeight = links.reduce(function (sum, edge) { return sum + edge.weight; }, 0);
        if (!links.length || totalWeight <= EPS) {
          ns.forEach(function (target) { next[target] += damping * rank[source] / n; });
        } else {
          links.forEach(function (edge) { next[edge.target] += damping * rank[source] * edge.weight / totalWeight; });
        }
      });
      delta = ns.reduce(function (sum, node) { return sum + Math.abs(next[node] - rank[node]); }, 0);
      rank = next;
      if (delta <= tolerance) break;
    }
    return { scores: rank, iterations: iterations + 1, converged: delta <= tolerance, delta: delta, damping: damping, tolerance: tolerance };
  }

  function weightedBetweenness(edges, directed) {
    assertEdges(edges);
    if (edges.some(function (edge) { return edge.weight <= 0; })) throw new Error('Weighted betweenness requires strictly positive edge weights.');
    const ns = nodes(edges); const adj = adjacency(edges, directed);
    const centrality = Object.fromEntries(ns.map(function (node) { return [node, 0]; }));
    ns.forEach(function (source) {
      const stack = [];
      const predecessors = Object.fromEntries(ns.map(function (node) { return [node, []]; }));
      const sigma = Object.fromEntries(ns.map(function (node) { return [node, 0]; }));
      const distance = Object.fromEntries(ns.map(function (node) { return [node, Infinity]; }));
      const visited = new Set(); sigma[source] = 1; distance[source] = 0;
      while (visited.size < ns.length) {
        let v = null; let best = Infinity;
        ns.forEach(function (node) { if (!visited.has(node) && distance[node] < best) { best = distance[node]; v = node; } });
        if (v == null) break;
        visited.add(v); stack.push(v);
        adj[v].forEach(function (entry) {
          const candidate = distance[v] + entry.weight;
          if (candidate + EPS < distance[entry.node]) {
            distance[entry.node] = candidate;
            sigma[entry.node] = sigma[v];
            predecessors[entry.node] = [v];
          } else if (Math.abs(candidate - distance[entry.node]) <= EPS * Math.max(1, candidate)) {
            sigma[entry.node] += sigma[v];
            predecessors[entry.node].push(v);
          }
        });
      }
      const dependency = Object.fromEntries(ns.map(function (node) { return [node, 0]; }));
      while (stack.length) {
        const w = stack.pop();
        predecessors[w].forEach(function (v) {
          if (sigma[w] > 0) dependency[v] += (sigma[v] / sigma[w]) * (1 + dependency[w]);
        });
        if (w !== source) centrality[w] += dependency[w];
      }
    });
    if (!directed) ns.forEach(function (node) { centrality[node] /= 2; });
    return centrality;
  }

  function minimumSpanningTree(edges) {
    assertEdges(edges);
    const ns = nodes(edges);
    const parent = Object.fromEntries(ns.map(function (node) { return [node, node]; }));
    function find(node) { if (parent[node] !== node) parent[node] = find(parent[node]); return parent[node]; }
    function union(a, b) { const ra = find(a); const rb = find(b); if (ra === rb) return false; parent[rb] = ra; return true; }
    const selected = []; let totalWeight = 0;
    edges.slice().sort(function (a, b) { return a.weight - b.weight || a.index - b.index; }).forEach(function (edge) {
      if (union(edge.source, edge.target)) { selected.push(edge); totalWeight += edge.weight; }
    });
    return { edges: selected, totalWeight: totalWeight, complete: selected.length === Math.max(0, ns.length - 1), componentCount: weakComponents(edges).length };
  }

  function labelPropagation(edges, directed, maxIterations) {
    assertEdges(edges);
    const ns = nodes(edges); const adj = adjacency(edges, directed);
    const labels = Object.fromEntries(ns.map(function (node) { return [node, node]; }));
    const limit = maxIterations == null ? 50 : Math.max(1, Math.floor(maxIterations));
    let iterations = 0; let changed = true;
    for (; iterations < limit && changed; iterations += 1) {
      changed = false;
      ns.forEach(function (node) {
        const weights = {};
        adj[node].forEach(function (entry) { weights[labels[entry.node]] = (weights[labels[entry.node]] || 0) + entry.weight; });
        const candidates = Object.entries(weights).sort(function (a, b) { return b[1] - a[1] || String(a[0]).localeCompare(String(b[0])); });
        if (candidates.length && labels[node] !== candidates[0][0]) { labels[node] = candidates[0][0]; changed = true; }
      });
    }
    const communities = {};
    ns.forEach(function (node) { const label = labels[node]; if (!communities[label]) communities[label] = []; communities[label].push(node); });
    return { labels: labels, communities: Object.values(communities), iterations: iterations, converged: !changed, method: 'deterministic weighted label propagation heuristic' };
  }

  function resilienceByNodeRemoval(edges, directed) {
    assertEdges(edges);
    const degrees = degreeMetrics(edges, directed).totalDegree;
    const order = Object.keys(degrees).sort(function (a, b) { return degrees[b] - degrees[a] || a.localeCompare(b); });
    const baseline = weakComponents(edges).length;
    const steps = [{ removed: null, removedCount: 0, remainingNodes: nodes(edges).length, remainingEdges: edges.length, weakComponents: baseline, largestComponent: Math.max.apply(null, weakComponents(edges).map(function (component) { return component.length; })) }];
    let removed = new Set();
    order.forEach(function (node, i) {
      removed.add(node);
      const kept = edges.filter(function (edge) { return !removed.has(edge.source) && !removed.has(edge.target); });
      const remaining = nodes(edges).filter(function (candidate) { return !removed.has(candidate); });
      let components = [];
      if (kept.length) components = weakComponents(kept);
      else components = remaining.map(function (candidate) { return [candidate]; });
      steps.push({ removed: node, removedCount: i + 1, remainingNodes: remaining.length, remainingEdges: kept.length, weakComponents: components.length, largestComponent: components.length ? Math.max.apply(null, components.map(function (component) { return component.length; })) : 0 });
    });
    return { removalOrder: order, steps: steps, strategy: 'descending initial total degree; no adaptive re-ranking' };
  }

  function circularLayout(edges) {
    const ns = nodes(edges);
    const positions = {};
    ns.forEach(function (node, i) {
      const angle = 2 * Math.PI * i / Math.max(1, ns.length) - Math.PI / 2;
      positions[node] = { x: Math.cos(angle), y: Math.sin(angle) };
    });
    return positions;
  }

  function summary(edges, directed, options) {
    assertEdges(edges);
    options = options || {};
    const ns = nodes(edges); const degrees = degreeMetrics(edges, directed);
    const weak = weakComponents(edges);
    const strong = directed ? stronglyConnectedComponents(edges) : weak;
    const possible = directed ? ns.length * Math.max(0, ns.length - 1) : ns.length * Math.max(0, ns.length - 1) / 2;
    const meaning = options.weightMeaning === 'strength' ? 'strength' : 'cost';
    const unitEdges = edges.map(function (edge) { return { source: edge.source, target: edge.target, weight: 1, index: edge.index }; });
    const pageRankEdges = meaning === 'strength' ? edges : unitEdges;
    const pathEdges = meaning === 'cost' ? edges : unitEdges;
    const pageRank = weightedPageRank(pageRankEdges, options);
    const closeness = closenessCentrality(pathEdges, directed);
    const betweenness = weightedBetweenness(pathEdges, directed);
    return {
      nodeCount: ns.length,
      edgeCount: edges.length,
      directed: !!directed,
      density: possible > 0 ? edges.length / possible : 0,
      weakComponents: weak,
      strongComponents: strong,
      degree: degrees,
      closeness: closeness,
      betweenness: betweenness,
      pageRank: pageRank,
      totalWeight: edges.reduce(function (sum, edge) { return sum + edge.weight; }, 0),
      selfLoops: edges.filter(function (edge) { return edge.source === edge.target; }).length,
      weightTreatment: meaning === 'strength' ? 'weighted PageRank and strength; unit-cost closeness/betweenness' : 'weighted path closeness/betweenness; unweighted PageRank'
    };
  }

  const api = {
    parseEdges: parseEdges,
    assertEdges: assertEdges,
    nodes: nodes,
    adjacency: adjacency,
    adjacencyMatrix: adjacencyMatrix,
    degreeMetrics: degreeMetrics,
    dijkstra: dijkstra,
    shortestPath: shortestPath,
    weakComponents: weakComponents,
    stronglyConnectedComponents: stronglyConnectedComponents,
    closenessCentrality: closenessCentrality,
    weightedPageRank: weightedPageRank,
    weightedBetweenness: weightedBetweenness,
    minimumSpanningTree: minimumSpanningTree,
    labelPropagation: labelPropagation,
    resilienceByNodeRemoval: resilienceByNodeRemoval,
    circularLayout: circularLayout,
    summary: summary
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoNetworksReference = api;
}(typeof window !== 'undefined' ? window : globalThis));
