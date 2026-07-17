#!/usr/bin/env node
'use strict';
const ODE = require('../src/core/ode.js');
const Stats = require('../src/core/statistics.js');
const Linalg = require('../src/core/linalg-reference.js');
const Networks = require('../src/core/networks-reference.js');
const ML = require('../src/core/ml-reference.js');
const Symbolic = require('../src/core/symbolic-reference.js');
const Stochastic = require('../src/core/stochastic.js');
const Optimization = require('../src/core/optimization.js');

const output = {};

const expSolve = ODE.solveWithRhs(
  { t0: 0, t1: 2, y0: [1], vars: ['y'], method: 'rk45', points: 201, rtol: 1e-10, atol: 1e-12 },
  (_t, y) => [y[0]]
);
output.ode = {
  expFinal: expSolve.Y[0][expSolve.Y[0].length - 1],
  accepted: expSolve.diagnostics.accepted,
  rejected: expSolve.diagnostics.rejected,
};

const groupA = [1.2, 1.8, 2.0, 2.6, 3.1, 3.8, 4.0];
const groupB = [2.0, 2.4, 2.9, 3.5, 4.1, 4.8, 5.3, 5.7];
const welch = Stats.welchT(groupA, groupB);
const anova = Stats.anovaOneWay([[1, 2, 3, 4], [2, 3, 4, 5], [7, 8, 9, 10]]);
const corr = Stats.corTest([1, 2, 3, 4, 5, 6], [1.1, 1.9, 3.2, 3.8, 5.1, 5.9]);
const mw = Stats.mannWhitneyU([1, 2, 2, 4, 7], [3, 4, 5, 6, 8]);
output.statistics = {
  welch: { t: welch.t, p: welch.p, df: welch.df },
  anova: { F: anova.F, p: anova.p },
  correlation: { r: corr.r, p: corr.p },
  mannWhitneyApprox: { U: mw.U, p: mw.p, z: mw.z },
};

const A = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
const solve = Linalg.solveLinear(A, [1, 2, 3]);
const eig = Linalg.symmetricEigenDecomposition([[2, 1], [1, 2]]);
const svd = Linalg.singularValueDiagnostics([[3, 0], [0, 1], [0, 0.5]]);
const pca = Linalg.pca([[1, 1.1, 0.9], [2, 2.0, 2.1], [3, 3.2, 2.9], [4, 3.9, 4.1], [5, 5.1, 4.9]]);
output.linalg = {
  solution: solve.solution,
  residualNorm: solve.residualNorm,
  eigenvalues: eig.values,
  singularValues: svd.singularValues,
  pcaExplained: pca.explainedVarianceRatio,
};

const edges = Networks.parseEdges('A,B,1\nB,C,2\nA,C,5\nC,D,1\nB,D,6');
const path = Networks.shortestPath(edges, 'A', 'D', false);
const pagerank = Networks.weightedPageRank(Networks.parseEdges('A,B,1\nB,C,1\nC,A,1\nC,D,1'), true);
const mst = Networks.minimumSpanningTree(Networks.parseEdges('A,B,1\nB,C,2\nA,C,4\nC,D,1\nB,D,5'));
output.networks = {
  shortestDistance: path.distance,
  shortestPath: path.path,
  pagerank: pagerank.scores,
  mstWeight: mst.totalWeight,
};

const Xr = [[0, 0], [1, 2], [2, 1], [3, 4], [4, 3], [5, 5]];
const yr = Xr.map(row => 1.25 + 2.0 * row[0] - 0.5 * row[1]);
const ridge = ML.ridgeFit(Xr, yr, 0.2);
const Xc = [[-2, -1], [-1.4, -1.2], [-1, -0.5], [0.8, 1.0], [1.2, 1.5], [2.0, 1.7]];
const yc = [0, 0, 0, 1, 1, 1];
const logistic = ML.logisticFit(Xc, yc, { lambda: 0.01, learningRate: 0.15, iterations: 5000, tolerance: 1e-11 });
const logisticProb = ML.logisticProb(logistic, Xc);
const mlPca = ML.pca2([[1, 1.1, 2], [2, 2.0, 4], [3, 3.2, 6], [4, 4.1, 8], [5, 5.0, 10], [6, 6.2, 12]]);
output.ml = {
  ridgeCoefficients: ridge.coefficients,
  logisticProbabilities: logisticProb,
  pcaExplained: mlPca.explained,
};

const expression = Symbolic.parse('sin(x)*exp(x) + x^3');
const derivative = Symbolic.differentiate(expression, 'x');
output.symbolic = {
  derivativeText: Symbolic.toString(derivative),
  derivativeAt: [0.2, 0.7, 1.3].map(x => Symbolic.evaluate(derivative, { x })),
};

const birthDeath = {
  stateNames: ['X'],
  initial: [40],
  params: { lambda: 0.18, mu: 0.14 },
  reactions: [
    { name: 'birth', propensity: (x, _t, p) => p.lambda * x[0], change: [1] },
    { name: 'death', propensity: (x, _t, p) => p.mu * x[0], change: [-1] },
  ],
};
const ensemble = Stochastic.simulateEnsemble({ model: birthDeath, t0: 0, t1: 5, points: 21, runs: 1800, seed: 7217, maxEvents: 100000 });
output.stochastic = {
  finalMean: ensemble.summaries[0].final.mean,
  finalSe: ensemble.summaries[0].final.standardError,
  truncatedRuns: ensemble.truncatedRuns,
};

const bowl = {
  variables: [
    { name: 'x', start: -1.5, lower: -5, upper: 5 },
    { name: 'y', start: 2.0, lower: -5, upper: 5 },
  ],
  sense: 'minimize',
  objective: x => (x[0] - 2) ** 2 + (x[1] + 1) ** 2,
  inequalities: [],
  equalities: [],
};
const opt = Optimization.optimise(bowl, { algorithm: 'projected_gradient', maxIterations: 400, gradientTolerance: 1e-10 });
output.optimization = {
  candidate: opt.candidate.x,
  objective: opt.candidate.objective,
  feasible: opt.candidate.feasible,
};

process.stdout.write(JSON.stringify(output));
