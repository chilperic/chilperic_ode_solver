'use strict';
const N = require('../../src/core/networks-reference.js');
let checks = 0, fails = 0;
function close(got, want, tol, message) { checks += 1; if (Math.abs(got - want) > tol) { fails += 1; console.error('FAIL:', message, 'got=', got, 'want=', want); } }
function truthy(value, message) { checks += 1; if (!value) { fails += 1; console.error('FAIL:', message); } }
function throws(fn, message) { checks += 1; try { fn(); fails += 1; console.error('FAIL no throw:', message); } catch (_) {} }

const edges = N.parseEdges('source,target,weight\nA,B,1\nB,C,2\nA,C,5\nC,D,1');
truthy(edges.length === 4, 'header-aware parser');
truthy(N.nodes(edges).join(',') === 'A,B,C,D', 'stable node order');
throws(() => N.parseEdges('A,B,-1'), 'negative edge rejected');
const path = N.shortestPath(edges, 'A', 'D', false);
close(path.distance, 4, 1e-12, 'weighted shortest path distance');
truthy(path.path.join('>') === 'A>B>C>D', 'weighted shortest path nodes');
truthy(path.edgeIndices.length === 3, 'path edge indices');
const comps = N.weakComponents(N.parseEdges('A,B,1\nC,D,1'));
truthy(comps.length === 2, 'weak components');
const directed = N.parseEdges('A,B,1\nB,A,1\nB,C,1\nC,D,1\nD,C,1');
truthy(N.stronglyConnectedComponents(directed).length === 2, 'strong components');
const pr = N.weightedPageRank(N.parseEdges('A,B,1\nB,C,1\nC,A,1'));
close(Object.values(pr.scores).reduce((a,b) => a+b, 0), 1, 1e-10, 'PageRank normalization');
truthy(pr.converged, 'PageRank convergence');
const triangle = N.parseEdges('A,B,1\nB,C,1\nA,C,3');
const mst = N.minimumSpanningTree(triangle);
close(mst.totalWeight, 2, 1e-12, 'MST total weight');
truthy(mst.complete && mst.edges.length === 2, 'MST completeness');
const between = N.weightedBetweenness(N.parseEdges('A,B,1\nB,C,1\nA,C,4'), false);
truthy(between.B > between.A && between.B > between.C, 'middle node has largest betweenness');
const closeness = N.closenessCentrality(N.parseEdges('A,B,1\nB,C,1'), false);
truthy(closeness.B > closeness.A, 'middle node has largest closeness');
const communities = N.labelPropagation(N.parseEdges('A,B,3\nA,C,3\nB,C,3\nD,E,3\nD,F,3\nE,F,3\nC,D,0.1'), false, 50);
truthy(communities.communities.length >= 1, 'community heuristic returns partition');
const resilience = N.resilienceByNodeRemoval(N.parseEdges('H,A,1\nH,B,1\nH,C,1\nA,B,1'), false);
truthy(resilience.removalOrder[0] === 'H', 'hub removed first');
truthy(resilience.steps.length === 5, 'resilience has baseline plus each node');
const summary = N.summary(edges, false, { weightMeaning: 'cost' });
truthy(summary.nodeCount === 4 && summary.edgeCount === 4, 'summary size');
truthy(summary.weightTreatment.includes('weighted path'), 'cost weight treatment explicit');
const strengthSummary = N.summary(edges, true, { weightMeaning: 'strength' });
truthy(strengthSummary.weightTreatment.includes('weighted PageRank'), 'strength weight treatment explicit');
throws(() => N.shortestPath(edges, 'Z', 'D', false), 'absent source rejected');
throws(() => N.weightedBetweenness(N.parseEdges('A,B,0'), false), 'zero-weight betweenness rejected');

console.log((checks - fails) + '/' + checks + ' network reference checks passed');
if (fails) process.exit(1);
