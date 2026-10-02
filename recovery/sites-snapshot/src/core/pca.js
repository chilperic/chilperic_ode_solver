/* Foko Lab v72.13 shared PCA core.
 * Pure, deterministic, DOM-independent principal-component analysis for small
 * dense browser datasets. Uses centered or standardized sample covariance and
 * a Jacobi eigensolver for real symmetric matrices.
 */
(function (root) {
  'use strict';

  function fail(message) { throw new Error('PCA: ' + message); }
  function finite(x) { return Number.isFinite(Number(x)); }
  function clone(A) { return A.map(function (row) { return row.slice(); }); }
  function identity(n) { return Array.from({ length: n }, function (_, i) { return Array.from({ length: n }, function (_, j) { return i === j ? 1 : 0; }); }); }
  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i += 1) s += a[i] * b[i]; return s; }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function sampleSd(a, m) { const v = a.reduce(function (s, x) { const d = x - m; return s + d * d; }, 0) / Math.max(1, a.length - 1); return Math.sqrt(Math.max(0, v)); }

  function validateMatrix(X) {
    if (!Array.isArray(X) || X.length < 3 || !Array.isArray(X[0]) || X[0].length < 2) fail('requires at least three rows and two numeric columns.');
    const p = X[0].length;
    X.forEach(function (row, i) {
      if (!Array.isArray(row) || row.length !== p) fail('row ' + i + ' has inconsistent width.');
      row.forEach(function (value, j) { if (!finite(value)) fail('cell [' + i + ',' + j + '] is not finite.'); });
    });
  }

  function jacobiSymmetric(A, options) {
    const M = clone(A); const n = M.length; const V = identity(n);
    const tolerance = Math.max(1e-14, Number(options && options.tolerance) || 1e-11);
    const maxSweeps = Math.max(20, Math.min(2000, Math.floor(Number(options && options.maxSweeps) || 200)));
    let iterations = 0; let converged = false; let maxOff = Infinity;
    for (let sweep = 0; sweep < maxSweeps; sweep += 1) {
      let p = 0; let q = 1; maxOff = 0;
      for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) {
        const a = Math.abs(M[i][j]); if (a > maxOff) { maxOff = a; p = i; q = j; }
      }
      if (maxOff <= tolerance) { converged = true; break; }
      const app = M[p][p]; const aqq = M[q][q]; const apq = M[p][q];
      const phi = 0.5 * Math.atan2(2 * apq, aqq - app); const c = Math.cos(phi); const s = Math.sin(phi);
      for (let k = 0; k < n; k += 1) if (k !== p && k !== q) {
        const mkp = M[k][p]; const mkq = M[k][q];
        M[k][p] = M[p][k] = c * mkp - s * mkq;
        M[k][q] = M[q][k] = s * mkp + c * mkq;
      }
      M[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      M[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      M[p][q] = M[q][p] = 0;
      for (let k = 0; k < n; k += 1) {
        const vkp = V[k][p]; const vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
      }
      iterations += 1;
    }
    const pairs = Array.from({ length: n }, function (_, j) {
      let vector = V.map(function (row) { return row[j]; });
      const norm = Math.sqrt(dot(vector, vector)) || 1; vector = vector.map(function (v) { return v / norm; });
      const firstNonzero = vector.find(function (v) { return Math.abs(v) > 1e-12; });
      if (firstNonzero < 0) vector = vector.map(function (v) { return -v; });
      return { value: M[j][j], vector: vector };
    }).sort(function (a, b) { return b.value - a.value; });
    return { values: pairs.map(function (o) { return o.value; }), vectors: pairs.map(function (o) { return o.vector; }), converged: converged, iterations: iterations, maxOffDiagonal: maxOff };
  }

  function compute(X, options) {
    validateMatrix(X); options = options || {};
    const n = X.length; const p = X[0].length; const standardize = options.standardize !== false;
    const featureNames = Array.isArray(options.featureNames) && options.featureNames.length === p
      ? options.featureNames.map(String) : Array.from({ length: p }, function (_, j) { return 'x' + (j + 1); });
    const columns = Array.from({ length: p }, function (_, j) { return X.map(function (row) { return Number(row[j]); }); });
    const means = columns.map(mean); const rawScales = columns.map(function (col, j) { return sampleSd(col, means[j]); });
    const warnings = []; const scales = rawScales.map(function (s, j) {
      if (s <= 1e-14) { warnings.push('Feature ' + featureNames[j] + ' has near-zero variance and contributes no stable standardized direction.'); return 1; }
      return standardize ? s : 1;
    });
    const Z = X.map(function (row) { return row.map(function (value, j) { return (Number(value) - means[j]) / scales[j]; }); });
    const covariance = Array.from({ length: p }, function () { return Array(p).fill(0); });
    Z.forEach(function (row) { for (let i = 0; i < p; i += 1) for (let j = i; j < p; j += 1) covariance[i][j] += row[i] * row[j] / Math.max(1, n - 1); });
    for (let i = 0; i < p; i += 1) for (let j = 0; j < i; j += 1) covariance[i][j] = covariance[j][i];
    const eig = jacobiSymmetric(covariance, options);
    const eigenvalues = eig.values.map(function (v) { return Math.max(0, v); });
    const total = eigenvalues.reduce(function (s, v) { return s + v; }, 0);
    const explainedVarianceRatio = eigenvalues.map(function (v) { return total > 0 ? v / total : 0; });
    let cumulative = 0; const cumulativeExplained = explainedVarianceRatio.map(function (v) { cumulative += v; return cumulative; });
    const components = eig.vectors;
    const scores = Z.map(function (row) { return components.map(function (vector) { return dot(row, vector); }); });
    if (!eig.converged) warnings.push('Jacobi eigensolver reached its sweep limit; inspect residuals or validate externally.');
    if (n < 5 * p) warnings.push('The row-to-feature ratio is small; principal directions may be unstable.');
    return {
      rows: n, columns: p, standardize: standardize, featureNames: featureNames,
      means: means, scales: scales, rawScales: rawScales, covariance: covariance,
      eigenvalues: eigenvalues, components: components, scores: scores,
      explainedVarianceRatio: explainedVarianceRatio, cumulativeExplained: cumulativeExplained,
      solver: { method: 'Jacobi symmetric eigendecomposition', converged: eig.converged, iterations: eig.iterations, maxOffDiagonal: eig.maxOffDiagonal },
      warnings: warnings
    };
  }

  const api = { compute: compute, jacobiSymmetric: jacobiSymmetric };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoPCA = api;
})(typeof window !== 'undefined' ? window : globalThis);
