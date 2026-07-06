const assert = require('assert');
const stats = require('../src/core/statistics.js');
const fit = require('../src/core/fitting.js');
const la = require('../src/core/linalg.js');
const net = require('../src/core/networks.js');
const ml = require('../src/core/ml-lite.js');

assert.strictEqual(stats.mean([1,2,3,4]), 2.5);
assert.ok(Math.abs(stats.sd([1,2,3,4]) - 1.2909944487) < 1e-9);
const ols = stats.ols([1,2,3], [2,4,6]);
assert.ok(Math.abs(ols.slope - 2) < 1e-12);
assert.ok(Math.abs(ols.r2 - 1) < 1e-12);

const pairs = fit.parsePairs('0 1\n1 3\n2 5');
const f = fit.fit(pairs, 'linear');
assert.ok(Math.abs(f.coef[0] - 1) < 1e-9);
assert.ok(Math.abs(f.coef[1] - 2) < 1e-9);

assert.strictEqual(la.determinant([[1,2],[3,4]]), -2);
const sol = la.solve([[2,0],[0,4]],[2,8]);
assert.ok(Math.abs(sol[0]-1)<1e-12 && Math.abs(sol[1]-2)<1e-12);

const edges = net.parseEdges('A B\nB C\nD E');
assert.strictEqual(net.components(edges).length, 2);
assert.strictEqual(net.degree(edges).B, 2);

const km = ml.kmeans([[0,0],[0.1,0],[10,10],[10.2,9.9]], 2, 20);
assert.strictEqual(km.centroids.length, 2);
assert.ok(km.inertia < 1);
console.log('v70.9 numeric cores: ok');
