/* =====================================================================
 * Unit test — Networks engine (src/core/networks.js)
 * Run: node tests/js/networks-core.test.js
 *
 * (1) CORRECTNESS: degrees, shortest paths, components, PageRank, MST
 *     against hand-checked graphs.
 * (2) PRECONDITIONS: entry points reject an empty edge list and a
 *     shortest-path query with a missing/absent source node. RED first.
 * ===================================================================== */
'use strict';
var N = require('../../src/core/networks.js');

var checks = 0, fails = 0;
function close(g, w, t, m) { checks++; if (Math.abs(g - w) > (t || 1e-6)) { fails++; console.error('FAIL: ' + m + '  got=' + g + ' want=' + w); } else console.log('ok  : ' + m); }
function truthy(c, m) { checks++; if (!c) { fails++; console.error('FAIL: ' + m); } else console.log('ok  : ' + m); }
function throws(fn, m) { checks++; try { fn(); fails++; console.error('FAIL (no throw): ' + m); } catch (e) { console.log('ok  : throws — ' + m); } }

// A small undirected graph:  A-B, A-C, B-C  (triangle)
var tri = N.parseEdges('A B\nA C\nB C');
close(N.degree(tri, false).A, 2, 1e-9, 'degree(A) = 2 in triangle');
truthy(N.nodes(tri).length === 3, 'triangle has 3 nodes');

// Weighted shortest path A->D:  A-B(1)-D(1) = 2  beats  A-C(2)-D(2) = 4
var wg = N.parseEdges('A B 1\nB D 1\nA C 2\nC D 2');
var sp = N.shortestPath(wg, 'A', 'D', false);
close(sp.distance, 2, 1e-9, 'shortest A->D distance = 2');
truthy(sp.path.join('>') === 'A>B>D', 'shortest A->D path = A>B>D');

// Two disconnected edges -> 2 connected components.
close(N.components(N.parseEdges('A B\nC D')).length, 2, 1e-9, 'two components');

// PageRank is a probability distribution: it sums to 1.
var pr = N.pagerank(N.parseEdges('A B\nB C\nC A'));
close(Object.values(pr).reduce(function (s, v) { return s + v; }, 0), 1, 1e-3, 'PageRank sums to 1');

// MST of the weighted triangle picks the two lightest edges.
var mst = N.minimumSpanningTree(N.parseEdges('A B 1\nB C 2\nA C 3'));
close(mst.weight, 3, 1e-9, 'MST weight = 1 + 2 = 3');

// ------------------------------------------------------------ PRECONDITIONS
throws(function () { N.degree([], false); }, 'degree rejects empty edge list');
throws(function () { N.shortestPath([], 'A', 'B', false); }, 'shortestPath rejects empty graph');
throws(function () { N.shortestPath(tri, 'Z', 'A', false); }, 'shortestPath rejects absent source node');

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
if (fails) { console.error(fails + ' FAILED'); process.exit(1); }
