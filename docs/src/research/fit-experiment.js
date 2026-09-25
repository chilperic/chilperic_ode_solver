/* Joint fitting over experimental conditions and observation operators.
 * Known, fixed independent observation standard deviations (when provided).
 * A bounded multistart coordinate search: no global-optimum or CI claims.
 */
(function (root, factory) {
  const D = typeof module === 'object' && module.exports ? require('./experiment-data.js') : root.FokoExperimentData;
  const api = factory(D);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FokoExperimentFit = api;
})(typeof self !== 'undefined' ? self : globalThis, function (D) {
  'use strict';
  const assert = (v, m) => { if (!v) throw new Error(m); };
  const copy = x => JSON.parse(JSON.stringify(x));
  const mean = x => x.reduce((a, b) => a + b, 0) / x.length;
  /** Weighted ridge regression using Householder QR, not normal equations. */
  function regression(x, y, sigma, degree, ridge = 1e-6) {
    assert(Number.isInteger(degree) && degree >= 0 && degree <= 3, 'Choose a polynomial degree between zero and three.');
    assert(x.length === y.length && x.length > degree + 1, 'Each observable needs more training measurements than polynomial coefficients.');
    assert(new Set(x).size >= degree + 1, 'Too few distinct training times for the chosen degree.');
    const center = mean(x), scale = Math.max(...x.map(t => Math.abs(t - center))) || 1, p = degree + 1;
    const A = x.map((v, i) => Array.from({ length: p }, (_, j) => ((v - center) / scale) ** j / (sigma[i] || 1)));
    const b = y.map((v, i) => v / (sigma[i] || 1));
    for (let j = 1; j < p; j++) { A.push(Array.from({ length: p }, (_, k) => k === j ? Math.sqrt(ridge) : 0)); b.push(0); }
    for (let k = 0; k < p; k++) {
      const v = A.slice(k).map(r => r[k]); const norm = Math.hypot(...v);
      assert(norm > 1e-14, 'Regression is singular; inspect times or choose a lower degree.');
      v[0] += v[0] >= 0 ? norm : -norm; const denom = v.reduce((s, z) => s + z * z, 0);
      for (let j = k; j < p; j++) { const f = 2 * v.reduce((s, z, i) => s + z * A[k + i][j], 0) / denom; v.forEach((z, i) => { A[k + i][j] -= f * z; }); }
      const f = 2 * v.reduce((s, z, i) => s + z * b[k + i], 0) / denom; v.forEach((z, i) => { b[k + i] -= f * z; });
    }
    const coefficients = Array(p).fill(0);
    for (let i = p - 1; i >= 0; i--) coefficients[i] = (b[i] - coefficients.reduce((s, c, j) => s + (j > i ? A[i][j] * c : 0), 0)) / A[i][i];
    assert(coefficients.every(Number.isFinite), 'Non-finite regression coefficients.');
    return { coefficients, center, scale, degree, ridge, algorithm: 'weighted Householder QR; intercept not penalized', trainingRange: [Math.min(...x), Math.max(...x)] };
  }
  function predict(r, x) { return r.coefficients.reduce((s, c, j) => s + c * ((x - r.center) / r.scale) ** j, 0); }
  function scores(values, rows, indices) {
    const errors = indices.map(i => values[i] - rows[i].value), weighted = rows[0].sigma !== null;
    const compatible = new Set(indices.map(i => rows[i].unit)).size === 1;
    return { n: indices.length, rmse: compatible ? Math.sqrt(mean(errors.map(e => e * e))) : null,
      mae: compatible ? mean(errors.map(Math.abs)) : null,
      standardizedRMSE: weighted ? Math.sqrt(mean(indices.map(i => ((values[i] - rows[i].value) / rows[i].sigma) ** 2))) : null };
  }
  async function execute(request, deps, hooks = {}) {
    const { Project, Compute, ODE, math } = deps, model = Project.normalizeModel(request.model), s = request.settings || {};
    assert(model.t1 > model.t0, 'Joint fitting requires an increasing time span.');
    const data = D.validate(request.data, model), rows = data.rows, split = D.split(data, s);
    const train = split.trainIndices.map(i => rows[i]), names = s.parameters || [];
    assert(names.length >= 1 && names.length <= 3 && new Set(names).size === names.length, 'Choose one to three distinct parameters to fit.');
    const conditionNames = Object.keys(data.conditions), weighted = rows[0].sigma !== null;
    assert(weighted || new Set(rows.map(r => r.unit)).size === 1, 'Different observation units need explicit positive sigma values for a dimensionless joint objective.');
    names.forEach(k => {
      assert(model.params[k] && model.params[k][2] > model.params[k][1], `Give ${k} a nonzero fitting range.`);
      assert(conditionNames.every(id => data.conditions[id].parameters[k] === undefined), `Parameter ${k} is fixed by a condition. Do not estimate it as a shared parameter.`);
    });
    const rhs = Compute.compile(model, math), obs = D.compileObservables(model, Compute, math), started = Date.now();
    let solves = 0, steps = 0, invalidCandidates = 0; const failureReasons = new Set(), cache = new Map();
    const nominal = Object.fromEntries(Object.entries(model.params).map(([k, v]) => [k, v[0]]));
    const check = () => {
      if (hooks.cancelled?.()) throw Compute.abort();
      assert(Date.now() - started < 90000, 'The browser experiment exceeded 90 seconds. Export or narrow the task.');
      assert(steps <= 2500000, 'The experiment exceeded 2,500,000 integration attempts. No partial fit is published.');
    };
    function simulate(parameters, selectedRows) {
      check(); const answer = new Map();
      for (const id of [...new Set(selectedRows.map(r => r.condition))]) {
        const c = data.conditions[id], conditionRows = selectedRows.filter(r => r.condition === id);
        const actual = { ...nominal, ...parameters, ...c.parameters };
        const m = { ...model, y0: model.vars.map((k, i) => c.initial[k] ?? model.y0[i]) };
        // Land exactly on all requested measurement times; duplicates are observations,
        // not repeated integration targets. Internal adaptive steps remain independent.
        const times = [...new Set([model.t0, ...conditionRows.map(r => r.time), model.t1])].sort((a, b) => a - b);
        const cfg = { ...Compute.config(m, actual, hooks.stepBudget || 120000), outputTimes: times };
        const r = ODE.solveWithRhs(cfg, rhs, { cancelled: hooks.cancelled || (() => false) });
        assert(r.ok, 'Solver did not complete the requested trajectory.'); solves++; steps += r.diagnostics.accepted + r.diagnostics.rejected; check();
        const positions = new Map(r.T.map((t, i) => [t, i]));
        for (const row of conditionRows) {
          const at = positions.get(row.time); assert(at !== undefined, 'An observation time was not returned by the integrator.');
          answer.set(row.rowId, obs[row.observable].evaluate(row.time, r.Y.map(v => v[at]), actual));
        }
      }
      return selectedRows.map(r => answer.get(r.rowId));
    }
    const parameters = q => Object.fromEntries(names.map((k, j) => [k, model.params[k][1] + q[j] * (model.params[k][2] - model.params[k][1])]));
    function objective(q) {
      check(); const key = JSON.stringify(q); if (cache.has(key)) return cache.get(key);
      try {
        const y = simulate(parameters(q), train);
        const loss = Math.sqrt(mean(y.map((v, i) => ((v - train[i].value) / (train[i].sigma || 1)) ** 2)));
        assert(Number.isFinite(loss), 'Non-finite objective.'); cache.set(key, loss); return loss;
      } catch (error) {
        if (error.name === 'AbortError' || /exceeded|budget|capacity/i.test(error.message)) throw error;
        invalidCandidates++; failureReasons.add(error.message); cache.set(key, Infinity); return Infinity;
      }
    }
    const initial = names.map(k => (model.params[k][0] - model.params[k][1]) / (model.params[k][2] - model.params[k][1]));
    const starts = [initial, initial.map(() => 0.25), initial.map(() => 0.75)], trace = [], runs = []; let best = null;
    for (let j = 0; j < starts.length; j++) {
      let q = starts[j].slice(), loss = objective(q), step = 0.2, round = 0;
      for (; round < 40 && step > 0.0002; round++) {
        let improved = false;
        for (let k = 0; k < names.length; k++) for (const sign of [-1, 1]) {
          const trial = q.slice(); trial[k] = Math.max(0, Math.min(1, q[k] + sign * step)); const value = objective(trial);
          if (value < loss) { q = trial; loss = value; improved = true; }
          if (hooks.yieldControl) await hooks.yieldControl(); check();
        }
        trace.push({ start: j + 1, round, objective: Number.isFinite(loss) ? loss : null, step });
        if (!improved) step *= 0.5;
        hooks.progress?.((j + round / 40) / 3, `Fitting shared parameters · start ${j + 1} of 3`);
      }
      runs.push({ start: j + 1, parameters: parameters(q), objective: Number.isFinite(loss) ? loss : null, step,
        stopReason: step <= 0.0002 ? 'coordinate resolution reached' : 'round limit reached' });
      if (Number.isFinite(loss) && (!best || loss < best.loss)) best = { q, loss };
    }
    assert(best, `No valid candidate fit. ${[...failureReasons].slice(0, 2).join(' ')}`);
    const fitted = parameters(best.q), trainPredictions = simulate(fitted, train), mechanism = simulate(fitted, rows), degree = Number(s.degree ?? 2);
    assert([1, 2, 3].includes(degree), 'Choose regression degree 1, 2 or 3.');
    const trainingPrediction = new Map(train.map((r,i)=>[r.rowId,trainPredictions[i]]));
    // Fit residual coefficients on a training-only integration mesh too.
    const regressions = {}, predictions = { constant: [], mechanistic: mechanism, 'data-only': [], hybrid: [] };
    for (const id of new Set(rows.map(r => r.observable))) {
      const inds = split.trainIndices.filter(i => rows[i].observable === id), rr = inds.map(i => rows[i]);
      const time = rr.map(r => r.time), sigma = rr.map(r => r.sigma), y = rr.map(r => r.value);
      const dataOnly = regression(time, y, sigma, degree), residual = regression(time, inds.map(i => rows[i].value - trainingPrediction.get(rows[i].rowId)), sigma, degree);
      const weights = sigma.map(x => x === null ? 1 : 1 / x ** 2), constant = y.reduce((a, v, i) => a + v * weights[i], 0) / weights.reduce((a, b) => a + b, 0);
      regressions[id] = { dataOnly, residual, constant };
    }
    rows.forEach((r, i) => { const g = regressions[r.observable]; predictions.constant[i] = g.constant; predictions['data-only'][i] = predict(g.dataOnly, r.time); predictions.hybrid[i] = mechanism[i] + predict(g.residual, r.time); });
    const modelScores = Object.entries(predictions).map(([name, p]) => ({ name, train: scores(p, rows, split.trainIndices), test: scores(p, rows, split.testIndices) }));
    const perObservable = [];
    for (const id of new Set(rows.map(r => r.observable))) for (const [name, p] of Object.entries(predictions)) {
      const tr = split.trainIndices.filter(i => rows[i].observable === id), te = split.testIndices.filter(i => rows[i].observable === id);
      perObservable.push({ observable: id, unit: obs[id].unit, name, train: scores(p, rows, tr), test: te.length ? scores(p, rows, te) : null });
    }
    return { kind: 'fit', version: '78.2.0', contract: D.SCHEMA, modelFingerprint: Project.fingerprint(model),
      dataFingerprint: Project.fingerprint(data), output: 'declared observations', settings: copy(s),
      fitted, split, scores: modelScores, perObservable, regressions, predictions, rows: copy(rows),
      T: rows.map(r => r.time), Y: rows.map(r => r.value), trace, starts: runs,
      objective: { value: best.loss, type: weighted ? 'root mean squared standardized residual' : 'root mean squared residual',
        weighting: weighted ? 'fixed independent Gaussian standard deviations supplied in sigma' : 'unweighted; common observation units required',
        noiseParametersEstimated: false },
      cost: { solves, steps, milliseconds: Date.now() - started, invalidCandidates },
      warnings: [
        'Three bounded starts do not establish a global optimum, identifiability or parameter confidence intervals.',
        'Data-only and residual regressions use time per observable, pooled across training conditions. They do not learn a condition-response function.',
        'The hybrid is an output correction, not a learned differential equation or a new biological mechanism.',
        split.kind === 'time' ? 'Later times are held out; this is not independent-subject validation.' : 'Group separation prevents within-group leakage. Scientific generalization still depends on how these groups were sampled.',
        'Repeatedly choosing models against the same holdout compromises independent evaluation.',
        ...(weighted ? ['Independent fixed Gaussian errors are an assumption. Correlated replicates, censoring and fitted noise models need an external workflow.'] : []),
        ...(best.q.some(q => q < 0.005 || q > 0.995) ? ['A fitted parameter is near a bound. Inspect ranges and identifiability.'] : []),
        ...(invalidCandidates ? [`${invalidCandidates} candidate evaluations failed and were excluded from optimization. Reasons: ${[...failureReasons].slice(0, 3).join('; ')}`] : []) ] };
  }
  return Object.freeze({ execute, regression, predict });
});
