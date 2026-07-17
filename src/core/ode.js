/* Foko Lab ODE numerical core — pure, DOM-free, testable.
 * Browser/worker: window.FokoODECore or self.FokoODECore
 * Node: require('./src/core/ode.js')
 */
(function (root) {
  'use strict';

  const BROWSER_METHODS = new Set(['rk45', 'rk45_adaptive', 'rk5', 'rk5_fixed', 'rk4', 'heun_adaptive', 'heun', 'heun_fixed', 'euler']);
  const EXPORT_ONLY_METHODS = new Set(['radau', 'bdf', 'lsoda', 'dop853']);

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function finiteNumber(value, name) {
    const n = Number(value);
    assert(Number.isFinite(n), `${name} must be finite (got ${value}).`);
    return n;
  }
  function positiveNumber(value, fallback, name) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    const n = finiteNumber(value, name);
    assert(n > 0, `${name} must be > 0 (got ${value}).`);
    return n;
  }
  function optionalPositive(value, fallback, name) {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).trim().toLowerCase() === 'auto') return fallback;
    return positiveNumber(value, fallback, name);
  }
  function norm(v) { return Math.sqrt(v.reduce((a, b) => a + b * b, 0)); }
  function add(y, k, h) { return y.map((v, i) => v + h * k[i]); }
  function lincomb(y, ks, coefs, h) {
    return y.map((v, i) => v + h * coefs.reduce((sum, coefficient, j) => sum + coefficient * ks[j][i], 0));
  }
  function validateDerivative(k, n, context) {
    assert(Array.isArray(k) && k.length === n, `${context} returned ${Array.isArray(k) ? k.length : 'non-array'} values; expected ${n}.`);
    k.forEach((value, i) => assert(Number.isFinite(Number(value)), `${context} returned a non-finite derivative at index ${i}.`));
    return k.map(Number);
  }
  function callRhs(rhs, t, y, params) {
    return validateDerivative(rhs(t, y.slice(), params), y.length, 'ODE right-hand side');
  }

  function rk45Step(rhs, t, y, h, params, rtol, atol) {
    const k1 = callRhs(rhs, t, y, params);
    const k2 = callRhs(rhs, t + h / 4, lincomb(y, [k1], [1 / 4], h), params);
    const k3 = callRhs(rhs, t + 3 * h / 8, lincomb(y, [k1, k2], [3 / 32, 9 / 32], h), params);
    const k4 = callRhs(rhs, t + 12 * h / 13, lincomb(y, [k1, k2, k3], [1932 / 2197, -7200 / 2197, 7296 / 2197], h), params);
    const k5 = callRhs(rhs, t + h, lincomb(y, [k1, k2, k3, k4], [439 / 216, -8, 3680 / 513, -845 / 4104], h), params);
    const k6 = callRhs(rhs, t + h / 2, lincomb(y, [k1, k2, k3, k4, k5], [-8 / 27, 2, -3544 / 2565, 1859 / 4104, -11 / 40], h), params);
    const y4 = y.map((v, i) => v + h * (25 / 216 * k1[i] + 1408 / 2565 * k3[i] + 2197 / 4104 * k4[i] - 1 / 5 * k5[i]));
    const y5 = y.map((v, i) => v + h * (16 / 135 * k1[i] + 6656 / 12825 * k3[i] + 28561 / 56430 * k4[i] - 9 / 50 * k5[i] + 2 / 55 * k6[i]));
    let error = 0;
    for (let i = 0; i < y.length; i += 1) {
      const scale = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(y5[i]));
      error = Math.max(error, Math.abs(y5[i] - y4[i]) / scale);
    }
    return { y: y5, error, evaluations: 6 };
  }

  function fixedStep(rhs, method, t, y, h, params) {
    if (method === 'euler') {
      return { y: add(y, callRhs(rhs, t, y, params), h), evaluations: 1 };
    }
    if (method === 'heun' || method === 'heun_fixed') {
      const k1 = callRhs(rhs, t, y, params);
      const k2 = callRhs(rhs, t + h, add(y, k1, h), params);
      return { y: y.map((v, i) => v + h * (k1[i] + k2[i]) / 2), evaluations: 2 };
    }
    if (method === 'rk5' || method === 'rk5_fixed') {
      const step = rk45Step(rhs, t, y, h, params, 1, 1);
      return { y: step.y, evaluations: 6 };
    }
    const k1 = callRhs(rhs, t, y, params);
    const k2 = callRhs(rhs, t + h / 2, add(y, k1, h / 2), params);
    const k3 = callRhs(rhs, t + h / 2, add(y, k2, h / 2), params);
    const k4 = callRhs(rhs, t + h, add(y, k3, h), params);
    return {
      y: y.map((v, i) => v + h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6),
      evaluations: 4
    };
  }

  function heunAdaptiveStep(rhs, t, y, h, params, rtol, atol) {
    const big = fixedStep(rhs, 'heun', t, y, h, params);
    const half1 = fixedStep(rhs, 'heun', t, y, h / 2, params);
    const half2 = fixedStep(rhs, 'heun', t + h / 2, half1.y, h / 2, params);
    let error = 0;
    for (let i = 0; i < y.length; i += 1) {
      const scale = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(half2.y[i]));
      error = Math.max(error, Math.abs(half2.y[i] - big.y[i]) / scale);
    }
    return { y: half2.y, error, evaluations: big.evaluations + half1.evaluations + half2.evaluations };
  }


  function finiteDifferenceJacobian(rhs, t, y, params) {
    const n = y.length;
    const matrix = Array.from({ length: n }, function () { return Array(n).fill(0); });
    for (let column = 0; column < n; column += 1) {
      const step = Math.sqrt(Number.EPSILON) * Math.max(1, Math.abs(y[column]));
      const plus = y.slice();
      const minus = y.slice();
      plus[column] += step;
      minus[column] -= step;
      const fp = callRhs(rhs, t, plus, params);
      const fm = callRhs(rhs, t, minus, params);
      for (let row = 0; row < n; row += 1) matrix[row][column] = (fp[row] - fm[row]) / (2 * step);
    }
    return matrix;
  }

  function matrixMultiply(left, right) {
    return left.map(function (row) {
      return right[0].map(function (_, column) {
        return row.reduce(function (sum, value, index) { return sum + value * right[index][column]; }, 0);
      });
    });
  }

  function matrixTrace(matrix) {
    return matrix.reduce(function (sum, row, index) { return sum + row[index]; }, 0);
  }

  function characteristicPolynomial(matrix) {
    const n = matrix.length;
    let B = Array.from({ length: n }, function (_, row) {
      return Array.from({ length: n }, function (__, column) { return row === column ? 1 : 0; });
    });
    const coefficients = [1];
    for (let k = 1; k <= n; k += 1) {
      const AB = matrixMultiply(matrix, B);
      const coefficient = -matrixTrace(AB) / k;
      coefficients.push(coefficient);
      B = AB.map(function (row, i) {
        return row.map(function (value, j) { return value + (i === j ? coefficient : 0); });
      });
    }
    return coefficients;
  }

  function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
  function cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
  function cDiv(a, b) {
    const denominator = b.re * b.re + b.im * b.im;
    if (denominator < 1e-30) return { re: a.re / 1e-15, im: a.im / 1e-15 };
    return { re: (a.re * b.re + a.im * b.im) / denominator, im: (a.im * b.re - a.re * b.im) / denominator };
  }
  function cAbs(value) { return Math.hypot(value.re, value.im); }
  function polynomialAt(coefficients, z) {
    return coefficients.slice(1).reduce(function (value, coefficient) {
      return cAdd(cMul(value, z), { re: coefficient, im: 0 });
    }, { re: coefficients[0], im: 0 });
  }

  function polynomialRoots(coefficients) {
    const degree = coefficients.length - 1;
    if (degree < 1) return { roots: [], converged: true, residual: 0 };
    if (degree === 1) return { roots: [{ re: -coefficients[1] / coefficients[0], im: 0 }], converged: true, residual: 0 };
    const normalized = coefficients.map(function (value) { return value / coefficients[0]; });
    const radius = 1 + Math.max.apply(null, normalized.slice(1).map(Math.abs));
    let roots = Array.from({ length: degree }, function (_, index) {
      const angle = 2 * Math.PI * (index + 0.25) / degree;
      return { re: radius * Math.cos(angle), im: radius * Math.sin(angle) };
    });
    let converged = false;
    for (let iteration = 0; iteration < 160; iteration += 1) {
      let maximumChange = 0;
      const next = roots.map(function (rootValue, index) {
        let denominator = { re: 1, im: 0 };
        roots.forEach(function (other, otherIndex) {
          if (otherIndex !== index) denominator = cMul(denominator, cSub(rootValue, other));
        });
        const correction = cDiv(polynomialAt(normalized, rootValue), denominator);
        maximumChange = Math.max(maximumChange, cAbs(correction));
        return cSub(rootValue, correction);
      });
      roots = next;
      if (maximumChange < 1e-10) { converged = true; break; }
    }
    const residual = Math.max.apply(null, roots.map(function (rootValue) { return cAbs(polynomialAt(normalized, rootValue)); }));
    return { roots, converged: converged && residual < 1e-5, residual };
  }

  function localTimescaleEvidence(rhs, result, params) {
    const n = result.Y.length;
    if (!n || n > 8) {
      return { available: false, likelyStiff: false, ratio: NaN, method: 'not evaluated above 8 states', samples: [] };
    }
    const indexes = Array.from(new Set([0, Math.floor((result.T.length - 1) / 2), result.T.length - 1]));
    const samples = [];
    for (const index of indexes) {
      const state = result.Y.map(function (row) { return row[index]; });
      try {
        const jacobian = finiteDifferenceJacobian(rhs, result.T[index], state, params);
        const roots = polynomialRoots(characteristicPolynomial(jacobian));
        const realScales = roots.roots.map(function (value) { return Math.abs(value.re); }).filter(Number.isFinite);
        const maximum = realScales.length ? Math.max.apply(null, realScales) : 0;
        const threshold = Math.max(1e-10, maximum * 1e-8);
        const active = realScales.filter(function (value) { return value > threshold; });
        const ratio = active.length >= 2 ? Math.max.apply(null, active) / Math.min.apply(null, active) : 1;
        samples.push({
          t: result.T[index],
          ratio,
          eigenvalues: roots.roots.map(function (value) { return { re: value.re, im: value.im }; }),
          converged: roots.converged,
          polynomialResidual: roots.residual,
        });
      } catch (error) {
        samples.push({ t: result.T[index], ratio: NaN, converged: false, error: String(error.message || error) });
      }
    }
    const reliable = samples.filter(function (sample) { return sample.converged && Number.isFinite(sample.ratio); });
    const ratio = reliable.length ? Math.max.apply(null, reliable.map(function (sample) { return sample.ratio; })) : NaN;
    return {
      available: reliable.length > 0,
      likelyStiff: Number.isFinite(ratio) && ratio >= 1e3,
      ratio,
      threshold: 1e3,
      method: 'finite-difference Jacobian with local characteristic roots at start/mid/end; heuristic, not a stiffness certificate',
      samples,
    };
  }

  function validateConfig(cfg, rhs) {
    assert(cfg && typeof cfg === 'object', 'solveWithRhs needs a configuration object.');
    assert(typeof rhs === 'function', 'solveWithRhs needs a right-hand-side function.');
    const t0 = finiteNumber(cfg.t0, 't0');
    const t1 = finiteNumber(cfg.t1, 't1');
    assert(t1 !== t0, 't1 must differ from t0.');
    assert(Array.isArray(cfg.y0) && cfg.y0.length > 0, 'y0 must be a non-empty numeric array.');
    const y0 = cfg.y0.map((value, i) => finiteNumber(value, `y0[${i}]`));
    const vars = Array.isArray(cfg.vars) && cfg.vars.length === y0.length
      ? cfg.vars.map(String)
      : y0.map((_, i) => `x${i + 1}`);
    const method = String(cfg.method || 'rk45').toLowerCase();
    if (EXPORT_ONLY_METHODS.has(method)) {
      throw new Error(`${method.toUpperCase()} is export-only. Choose RK45, RK5, RK4, Heun, or Euler for browser computation.`);
    }
    assert(BROWSER_METHODS.has(method), `Unsupported browser ODE method: ${method}.`);
    return { t0, t1, y0, vars, method };
  }

  function solveWithRhs(cfg, rhs, hooks) {
    const valid = validateConfig(cfg, rhs);
    const callbacks = hooks || {};
    const cancelled = typeof callbacks.cancelled === 'function' ? callbacks.cancelled : () => false;
    const progress = typeof callbacks.progress === 'function' ? callbacks.progress : () => {};
    const now = typeof callbacks.now === 'function'
      ? callbacks.now
      : (() => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()));

    const t0 = valid.t0;
    const t1 = valid.t1;
    const direction = Math.sign(t1 - t0);
    const span = Math.abs(t1 - t0);
    let points = Math.max(2, Math.min(20000, Math.floor(Number(cfg.points) || 800)));
    const params = cfg.params && typeof cfg.params === 'object' ? cfg.params : {};
    const rtol = positiveNumber(cfg.rtol, 1e-6, 'rtol');
    const atol = positiveNumber(cfg.atol, 1e-9, 'atol');
    const maxStep = Math.min(span, optionalPositive(cfg.maxStep, span / 60, 'maxStep'));
    const initialStep = Math.min(maxStep, optionalPositive(cfg.initialStep, span / 100, 'initialStep'));
    const fixedStepSize = optionalPositive(cfg.stepSize, null, 'stepSize');
    const safety = Math.min(0.98, Math.max(0.2, positiveNumber(cfg.safety, 0.9, 'safety')));
    const adaptive = valid.method === 'rk45' || valid.method === 'rk45_adaptive' || valid.method === 'heun_adaptive';
    if (fixedStepSize && !adaptive) points = Math.max(2, Math.min(20000, Math.ceil(span / fixedStepSize) + 1));

    const targetTimes = Array.from({ length: points }, (_, i) => t0 + (t1 - t0) * i / (points - 1));
    const T = [];
    const Y = Array.from({ length: valid.y0.length }, () => []);
    let t = t0;
    let y = valid.y0.slice();
    let accepted = 0;
    let rejected = 0;
    let functionEvaluations = 0;
    let minStep = Infinity;
    let maxUsed = 0;
    let maxStateNorm = norm(y);
    const stepTrace = { time: [], step: [], error: [], accepted: [] };
    const traceLimit = Math.max(200, Math.min(20000, Math.floor(Number(cfg.traceLimit) || 6000)));
    function recordStep(time, stepSize, error, wasAccepted) {
      if (stepTrace.time.length >= traceLimit) return;
      stepTrace.time.push(time);
      stepTrace.step.push(Math.abs(stepSize));
      stepTrace.error.push(Number.isFinite(error) ? error : NaN);
      stepTrace.accepted.push(Boolean(wasAccepted));
    }
    const startedAt = now();

    function pushSample(time, state) {
      T.push(time);
      state.forEach((value, j) => Y[j].push(value));
    }
    function validateState(state) {
      assert(state.every(Number.isFinite), 'Solution produced a non-finite state.');
      const stateNorm = norm(state);
      maxStateNorm = Math.max(maxStateNorm, stateNorm);
      assert(stateNorm <= 1e12, 'Solution diverged beyond the browser safety bound (norm > 1e12).');
    }

    pushSample(t, y);
    if (adaptive) {
      let h = Math.min(maxStep, initialStep) * direction;
      for (let index = 1; index < targetTimes.length; index += 1) {
        const target = targetTimes[index];
        let guard = 0;
        while ((direction > 0 && t < target) || (direction < 0 && t > target)) {
          if (cancelled()) return { ok: false, cancelled: true, error: 'Cancelled' };
          guard += 1;
          assert(guard <= 200000, 'Adaptive step limit reached. The problem may be stiff or unstable.');
          if (Math.abs(h) > Math.abs(target - t)) h = target - t;
          const step = valid.method === 'heun_adaptive'
            ? heunAdaptiveStep(rhs, t, y, h, params, rtol, atol)
            : rk45Step(rhs, t, y, h, params, rtol, atol);
          functionEvaluations += step.evaluations;
          const acceptedStep = step.error <= 1 || Math.abs(h) < 1e-14;
          recordStep(t, h, step.error, acceptedStep);
          if (acceptedStep) {
            t += h;
            y = step.y;
            validateState(y);
            accepted += 1;
            minStep = Math.min(minStep, Math.abs(h));
            maxUsed = Math.max(maxUsed, Math.abs(h));
            const factor = Math.min(4, Math.max(0.15, safety * Math.pow(1 / Math.max(step.error, 1e-12), 0.2)));
            h *= factor;
            h = Math.sign(h || direction) * Math.min(Math.abs(h), maxStep);
          } else {
            rejected += 1;
            h *= Math.max(0.1, 0.85 * Math.pow(1 / step.error, 0.25));
          }
        }
        pushSample(target, y);
        if (index % 50 === 0) progress(index / (targetTimes.length - 1), 'Solving');
      }
    } else {
      for (let index = 1; index < targetTimes.length; index += 1) {
        if (cancelled()) return { ok: false, cancelled: true, error: 'Cancelled' };
        const h = targetTimes[index] - targetTimes[index - 1];
        const step = fixedStep(rhs, valid.method, targetTimes[index - 1], y, h, params);
        y = step.y;
        functionEvaluations += step.evaluations;
        recordStep(targetTimes[index - 1], h, NaN, true);
        validateState(y);
        accepted += 1;
        minStep = Math.min(minStep, Math.abs(h));
        maxUsed = Math.max(maxUsed, Math.abs(h));
        pushSample(targetTimes[index], y);
        if (index % 100 === 0) progress(index / (targetTimes.length - 1), 'Solving');
      }
    }

    const runtime = now() - startedAt;
    const rejectionRatio = rejected / Math.max(1, accepted + rejected);
    const tinyStep = Number.isFinite(minStep) && minStep < span * 1e-8;
    const stiffness = localTimescaleEvidence(rhs, { T, Y }, params);
    const warnings = [];
    if (rejectionRatio > 0.2 || rejected > 20 || tinyStep) warnings.push('Adaptive-step evidence indicates possible stiffness or instability. Browser RK integration is exploratory; validate with Radau, BDF, or LSODA in Python.');
    if (stiffness.likelyStiff) {
      const ratioText = Number.isFinite(stiffness.ratio) ? stiffness.ratio.toExponential(2) : 'unavailable';
      warnings.push(`Local Jacobian timescale separation is approximately ${ratioText} (heuristic threshold 1e3). ${adaptive ? 'Treat the trajectory as requiring independent stiff-solver verification.' : 'A fixed-step explicit method cannot estimate or control its local error here; do not interpret this trajectory without stiff-solver verification.'}`);
    }
    const warning = warnings.join(' ');

    return {
      ok: true,
      status: warning ? 'warning' : 'success',
      kind: 'ode',
      T,
      Y,
      vars: valid.vars,
      diagnostics: {
        method: valid.method,
        accepted,
        rejected,
        rejectionRatio,
        functionEvaluations,
        runtime,
        minStep: Number.isFinite(minStep) ? minStep : 0,
        maxStep: maxUsed,
        rtol,
        atol,
        maxStateNorm,
        localTimescaleRatio: stiffness.available ? stiffness.ratio : NaN,
        stiffnessAssessment: stiffness.available ? (stiffness.likelyStiff ? 'likely local timescale separation' : 'no strong local timescale separation detected') : 'not available',
        stiffnessThreshold: stiffness.threshold || 1e3,
        stiffnessMethod: stiffness.method,
        stiffnessSamples: stiffness.samples.map(function (sample) { return `t=${Number(sample.t).toPrecision(4)}: ${Number.isFinite(sample.ratio) ? sample.ratio.toExponential(2) : 'unavailable'}`; }).join('; '),
        warning,
        stepTrace,
        stepTraceTruncated: stepTrace.time.length >= traceLimit
      },
      provenance: {
        engine: 'FokoODECore',
        browserComputed: true,
        method: valid.method,
        points,
        t0,
        t1,
        stiffnessEvidence: stiffness
      }
    };
  }

  function conservationDrift(result, weights) {
    assert(result && Array.isArray(result.Y) && result.Y.length > 0, 'conservationDrift needs an ODE result.');
    const n = result.Y.length;
    const w = weights == null ? Array(n).fill(1) : weights.map(Number);
    assert(w.length === n && w.every(Number.isFinite), 'weights must match the number of state variables.');
    const totals = result.T.map((_, i) => result.Y.reduce((sum, row, j) => sum + w[j] * row[i], 0));
    const reference = totals[0];
    const scale = Math.max(1, Math.abs(reference));
    const absolute = Math.max(...totals.map(value => Math.abs(value - reference)));
    return { reference, absolute, relative: absolute / scale, totals };
  }

  const api = {
    BROWSER_METHODS: Array.from(BROWSER_METHODS),
    EXPORT_ONLY_METHODS: Array.from(EXPORT_ONLY_METHODS),
    solveWithRhs,
    conservationDrift,
    fixedStep,
    rk45Step,
    finiteDifferenceJacobian,
    characteristicPolynomial,
    polynomialRoots,
    localTimescaleEvidence
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoODECore = api;
}(typeof self !== 'undefined' ? self : globalThis));
