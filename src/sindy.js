/* sindy.js — Sparse Identification of Nonlinear Dynamics (SINDy) engine.
 *
 * Extracted from the inline (untested) math in sciml-lab.js so the numerics can
 * be proven correct in isolation. Recovers a sparse, interpretable ODE
 *     Xdot = Theta(X) @ Xi
 * from trajectory data by sequential thresholded least squares (STLSQ).
 * Reference: Brunton, Proctor & Kutz, PNAS 2016.
 *
 * Design
 * ------
 * - Behavior-preserving: the candidate library is the same CHECKBOX FEATURE SET
 *   the lab exposes (constant, linear, per-variable quadratic, pairwise
 *   interactions, per-variable cubic, trig), emitted in the exact column order
 *       [constant] [linear] [quadratic] [interactions] [cubic] [trig]
 *   because the coefficient table and library heatmap index Theta by position.
 * - Self-contained linear algebra (transpose, matmul, ridge normal-equations via
 *   Gaussian elimination with partial pivoting): deterministic, no mathjs
 *   dependency, fully testable in Node.
 * - Pure functions, no DOM. Exposed as window.FokoSINDy.
 * - Pre-conditions asserted at the top of every public function; malformed input
 *   throws a named Error rather than returning garbage.
 */
(function () {
  'use strict';

  function assert(cond, msg) { if (!cond) throw new Error('SINDy: ' + msg); }

  // Validate X is a non-empty rectangular finite matrix -> {nSamples,nVars}.
  function validateMatrix(X, label) {
    label = label || 'X';
    assert(Array.isArray(X), label + ' must be an array of rows.');
    assert(X.length > 0, label + ' is empty (no samples).');
    const nVars = X[0].length;
    assert(nVars > 0, label + ' rows are empty (no variables).');
    for (let i = 0; i < X.length; i++) {
      assert(Array.isArray(X[i]) && X[i].length === nVars,
        label + ' must be rectangular: row ' + i + ' has length ' +
        (X[i] ? X[i].length : 'undefined') + ', expected ' + nVars + '.');
      for (let j = 0; j < nVars; j++) {
        assert(Number.isFinite(X[i][j]), label + '[' + i + '][' + j + '] is not finite.');
      }
    }
    return { nSamples: X.length, nVars: nVars };
  }

  // ==========================================================================
  // Candidate library (checkbox feature set)
  // ==========================================================================
  /**
   * buildLibrary(X, spec) -> { Theta, names }
   *   spec.constant, spec.linear, spec.quadratic, spec.interactions,
   *   spec.cubic, spec.trig : booleans
   *   spec.varNames : names for readable columns (default x0,x1,...)
   * Column order is fixed: constant, linear, quadratic (squares), interactions
   * (i<j), cubic (cubes), trig (sin then cos per var).
   */
  function buildLibrary(X, spec) {
    spec = spec || {};
    const { nVars } = validateMatrix(X, 'X');
    const varNames = spec.varNames || Array.from({ length: nVars }, (_, i) => 'x' + i);
    assert(varNames.length === nVars,
      'varNames length ' + varNames.length + ' != nVars ' + nVars + '.');

    // Each feature is {name, fn(row)->value}. Order below is the contract.
    const feats = [];
    if (spec.constant) feats.push({ name: '1', fn: () => 1 });
    if (spec.linear) varNames.forEach((v, i) => feats.push({ name: v, fn: r => r[i] }));
    if (spec.quadratic) varNames.forEach((v, i) => feats.push({ name: v + '^2', fn: r => r[i] * r[i] }));
    if (spec.interactions)
      for (let i = 0; i < nVars; i++)
        for (let j = i + 1; j < nVars; j++)
          // bind i,j per iteration so each closure captures its own pair
          feats.push(((a, b) => ({ name: varNames[a] + '*' + varNames[b], fn: r => r[a] * r[b] }))(i, j));
    if (spec.cubic) varNames.forEach((v, i) => feats.push({ name: v + '^3', fn: r => r[i] * r[i] * r[i] }));
    if (spec.trig) varNames.forEach((v, i) => {
      feats.push({ name: 'sin(' + v + ')', fn: r => Math.sin(r[i]) });
      feats.push({ name: 'cos(' + v + ')', fn: r => Math.cos(r[i]) });
    });

    assert(feats.length > 0, 'candidate library is empty (enable at least one term family).');

    const names = feats.map(f => f.name);
    const Theta = X.map(row => feats.map(f => f.fn(row)));
    return { Theta, names, feats };
  }

  // ==========================================================================
  // Finite-difference derivatives (central; clamped ends) — matches the lab.
  // ==========================================================================
  function estimateDerivatives(X, t) {
    const { nSamples, nVars } = validateMatrix(X, 'X');
    assert(Array.isArray(t) && t.length === nSamples,
      't length ' + (t ? t.length : 'undefined') + ' must match X length ' + nSamples + '.');
    assert(nSamples >= 2, 'need at least 2 samples to estimate derivatives.');
    const out = X.map(r => r.slice());
    for (let i = 0; i < nSamples; i++) {
      const im = Math.max(0, i - 1), ip = Math.min(nSamples - 1, i + 1);
      const dt = t[ip] - t[im];
      for (let j = 0; j < nVars; j++) out[i][j] = dt ? (X[ip][j] - X[im][j]) / dt : 0;
    }
    return out;
  }

  // ==========================================================================
  // Self-contained linear algebra
  // ==========================================================================
  function transpose(A) {
    const r = A.length, c = A[0].length, T = [];
    for (let j = 0; j < c; j++) { T.push(new Array(r)); for (let i = 0; i < r; i++) T[j][i] = A[i][j]; }
    return T;
  }
  function matmul(A, B) {
    const m = A.length, n = A[0].length, p = B[0].length, C = [];
    for (let i = 0; i < m; i++) {
      C.push(new Array(p).fill(0));
      for (let k = 0; k < n; k++) { const a = A[i][k]; if (a === 0) continue; for (let j = 0; j < p; j++) C[i][j] += a * B[k][j]; }
    }
    return C;
  }
  function matvec(A, x) { return A.map(row => row.reduce((s, v, k) => s + v * x[k], 0)); }

  // Solve square S z = b by Gaussian elimination with partial pivoting.
  function solveLinear(S, b) {
    const n = S.length;
    const M = S.map((row, i) => row.concat([b[i]]));
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      assert(Math.abs(M[piv][col]) > 1e-14, 'singular normal-equations system (raise ridge or reduce library).');
      if (piv !== col) { const tmp = M[piv]; M[piv] = M[col]; M[col] = tmp; }
      for (let r = col + 1; r < n; r++) {
        const f = M[r][col] / M[col][col]; if (f === 0) continue;
        for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k];
      }
    }
    const z = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = M[i][n]; for (let k = i + 1; k < n; k++) s -= M[i][k] * z[k]; z[i] = s / M[i][i];
    }
    return z;
  }
  // Ridge least squares: solve (A^T A + ridge I) x = A^T b.
  function ridgeLeastSquares(A, b, ridge) {
    const At = transpose(A), AtA = matmul(At, A);
    for (let i = 0; i < AtA.length; i++) AtA[i][i] += ridge;
    return solveLinear(AtA, matvec(At, b));
  }

  // ==========================================================================
  // STLSQ
  // ==========================================================================
  /**
   * stlsq(Theta, Xdot, opts) -> Xi (nFeatures x nTargets)
   *   opts.lambda (default 0.05), opts.iterations (default 10), opts.ridge (default 1e-8)
   */
  function stlsq(Theta, Xdot, opts) {
    opts = opts || {};
    validateMatrix(Theta, 'Theta');
    validateMatrix(Xdot, 'Xdot');
    assert(Theta.length === Xdot.length,
      'Theta and Xdot must have the same number of samples (' + Theta.length + ' vs ' + Xdot.length + ').');
    const lambda = opts.lambda == null ? 0.05 : opts.lambda;
    assert(Number.isFinite(lambda) && lambda >= 0, 'lambda must be a finite number >= 0 (got ' + lambda + ').');
    const iterations = opts.iterations == null ? 10 : opts.iterations;
    const ridge = opts.ridge == null ? 1e-8 : opts.ridge;

    const nFeat = Theta[0].length, nTarget = Xdot[0].length;
    const Xi = Array.from({ length: nFeat }, () => new Array(nTarget).fill(0));

    for (let target = 0; target < nTarget; target++) {
      const y = Xdot.map(r => r[target]);
      let coeffs = ridgeLeastSquares(Theta, y, ridge);
      let prevActive = null;
      for (let it = 0; it < iterations; it++) {
        const active = [];
        for (let k = 0; k < nFeat; k++) { if (Math.abs(coeffs[k]) < lambda) coeffs[k] = 0; else active.push(k); }
        const key = active.join(',');
        if (key === prevActive) break;
        prevActive = key;
        if (active.length === 0) break;
        const sub = Theta.map(row => active.map(k => row[k]));
        const subCoeffs = ridgeLeastSquares(sub, y, ridge);
        coeffs = new Array(nFeat).fill(0);
        for (let a = 0; a < active.length; a++) coeffs[active[a]] = subCoeffs[a];
      }
      for (let k = 0; k < nFeat; k++) Xi[k][target] = coeffs[k];
    }
    return Xi;
  }

  // ==========================================================================
  // Formatting & diagnostics
  // ==========================================================================
  function round(x, p) { if (x === 0) return 0; return Number(x.toPrecision(p == null ? 5 : p)); }

  function formatEquations(varNames, featureNames, Xi, opts) {
    opts = opts || {};
    const precision = opts.precision == null ? 5 : opts.precision;
    const eqs = [];
    for (let j = 0; j < varNames.length; j++) {
      const terms = [];
      for (let k = 0; k < featureNames.length; k++) {
        const c = Xi[k][j];
        if (Math.abs(c) < 1e-12) continue;
        const cr = round(Math.abs(c), precision), nm = featureNames[k];
        const body = nm === '1' ? String(cr) : (Math.abs(cr - 1) < 1e-12 ? '' : cr + '*') + nm;
        terms.push((c < 0 ? '- ' : (terms.length ? '+ ' : '')) + body);
      }
      eqs.push(varNames[j] + "' = " + (terms.length ? terms.join(' ') : '0'));
    }
    return eqs;
  }

  function fitRmse(Theta, Xdot, Xi) {
    const pred = matmul(Theta, Xi);
    let sq = 0, n = 0;
    for (let i = 0; i < Xdot.length; i++) for (let j = 0; j < Xdot[0].length; j++) { const e = Xdot[i][j] - pred[i][j]; sq += e * e; n++; }
    return Math.sqrt(sq / n);
  }

  // ==========================================================================
  // High-level discover()
  // ==========================================================================
  /**
   * discover(cfg) -> { Xi, featureNames, equations, rmse, sparsity, nSamples,
   *                    nVars, varNames, usedFiniteDifferences, Theta, Xdot }
   * cfg.X, cfg.t (required); cfg.Xdot optional (else finite differences);
   * cfg.varNames; cfg.library (checkbox spec); cfg.lambda, cfg.ridge, cfg.iterations.
   */
  function discover(cfg) {
    assert(cfg && typeof cfg === 'object', 'discover() needs a config object.');
    const X = cfg.X, t = cfg.t;
    const { nSamples, nVars } = validateMatrix(X, 'X');
    assert(Array.isArray(t) && t.length === nSamples,
      't length must match X length (' + (t ? t.length : 'undefined') + ' vs ' + nSamples + ').');
    const varNames = cfg.varNames || Array.from({ length: nVars }, (_, i) => 'x' + i);
    assert(varNames.length === nVars, 'varNames length ' + varNames.length + ' != nVars ' + nVars + '.');
    const lambda = cfg.lambda == null ? 0.05 : cfg.lambda;
    assert(Number.isFinite(lambda) && lambda >= 0, 'lambda must be a finite number >= 0 (got ' + lambda + ').');

    let Xdot = cfg.Xdot, usedFD = false;
    if (Xdot == null) { Xdot = estimateDerivatives(X, t); usedFD = true; }
    else {
      validateMatrix(Xdot, 'Xdot');
      assert(Xdot.length === nSamples && Xdot[0].length === nVars,
        'Xdot shape must match X (' + Xdot.length + 'x' + Xdot[0].length + ' vs ' + nSamples + 'x' + nVars + ').');
    }

    const lib = buildLibrary(X, Object.assign({ varNames: varNames }, cfg.library || { constant: true, linear: true, quadratic: true, interactions: true, cubic: false, trig: false }));
    const Xi = stlsq(lib.Theta, Xdot, {
      lambda: lambda,
      iterations: cfg.iterations == null ? 10 : cfg.iterations,
      ridge: cfg.ridge == null ? 1e-8 : cfg.ridge
    });
    const equations = formatEquations(varNames, lib.names, Xi, { precision: cfg.precision });
    const rmse = fitRmse(lib.Theta, Xdot, Xi);
    let nonzero = 0;
    for (let k = 0; k < Xi.length; k++) for (let j = 0; j < nVars; j++) if (Math.abs(Xi[k][j]) > 1e-12) nonzero++;

    return {
      Xi: Xi, featureNames: lib.names, equations: equations, rmse: rmse,
      sparsity: nonzero, nSamples: nSamples, nVars: nVars, varNames: varNames,
      usedFiniteDifferences: usedFD, Theta: lib.Theta, Xdot: Xdot
    };
  }

  const api = {
    buildLibrary: buildLibrary,
    estimateDerivatives: estimateDerivatives,
    stlsq: stlsq,
    formatEquations: formatEquations,
    fitRmse: fitRmse,
    discover: discover
  };
  if (typeof window !== 'undefined') window.FokoSINDy = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
