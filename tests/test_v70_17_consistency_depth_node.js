
const assert = require('assert');
const net = require('../src/core/networks.js');
const la = require('../src/core/linalg.js');
const ml = require('../src/core/ml-lite.js');

function close(a,b,tol=1e-6){assert(Math.abs(a-b)<=tol, `${a} != ${b}`);}

// Networks: shortest path, PageRank, MST, betweenness, resilience
{
  const edges = net.parseEdges(`source,target,weight
A,B,1
B,C,1
A,C,3
C,D,1
B,D,4`);
  assert.deepStrictEqual(net.shortestPath(edges,'A','D',false).path, ['A','B','C','D']);
  close(net.shortestPath(edges,'A','D',false).distance, 3);
  const mst = net.minimumSpanningTree(edges);
  close(mst.weight, 3);
  assert.strictEqual(mst.edges.length, 3);
  const b = net.betweenness(edges,false);
  assert(b.B > 0 || b.C > 0);
  const pr = net.pagerank(edges);
  close(Object.values(pr).reduce((s,x)=>s+x,0), 1, 1e-5);
  const res = net.resilience(edges,false);
  assert(res.impact.length > 0);
}

// Linear algebra: LU, QR, nullspace, PCA
{
  const A = [[2,1],[1,3]];
  const lu = la.luDecomposition(A);
  assert.strictEqual(lu.L.length, 2);
  assert.strictEqual(lu.U.length, 2);
  const qr = la.qrDecomposition([[1,0],[1,1],[0,1]]);
  assert.strictEqual(qr.Q.length, 3);
  assert.strictEqual(qr.R.length, 2);
  const ns = la.nullSpace([[1,2,3],[2,4,6]]);
  assert(ns.length >= 1);
  const pca = la.pcaFromMatrix([[1,2],[2,3],[3,4]]);
  assert(pca.firstComponent.length === 2);
}

// ML: normalization, CV and threshold sweep
{
  const table = ml.parseTable(`x1,x2,label
1,1,0
1.2,1.1,0
0.8,0.9,0
4,4,1
4.2,4.1,1
3.8,3.9,1`);
  const data = ml.pickFeatures(table.rows,[1,2],3);
  const scaled = ml.normalizeFeatures(data.X);
  close(scaled.X.map(r=>r[0]).reduce((s,x)=>s+x,0), 0, 1e-10);
  const cv = ml.knnCrossValidation(scaled.X,data.y,[1,3],3);
  assert.strictEqual(cv.length, 2);
  assert(cv.every(r => r.accuracy >= 0 && r.accuracy <= 1));
  const logit = ml.logisticRegression(scaled.X,data.y,0.2,200);
  const sweep = ml.logisticThresholdSweep(data.y, logit.probs);
  assert(sweep.length >= 10);
}

console.log('v70.17 consistency depth: ok');
