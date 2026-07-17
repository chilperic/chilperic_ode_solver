/* Foko Lab v72.16 machine-learning reference core.
 * Pure, deterministic browser-scale models and diagnostics.
 * No DOM, plotting, network, GPU or external runtime dependencies.
 */
(function (root) {
  'use strict';

  function fail(message) { throw new Error('ML reference: ' + message); }
  function requireMatrix(X) {
    if (!Array.isArray(X) || X.length < 3 || !Array.isArray(X[0]) || X[0].length < 1) fail('X must be a non-empty rectangular matrix with at least three rows.');
    const width = X[0].length;
    X.forEach(function (row, i) {
      if (!Array.isArray(row) || row.length !== width || row.some(function (v) { return !Number.isFinite(Number(v)); })) fail('X row ' + i + ' is invalid or non-numeric.');
    });
  }
  function requireTarget(X, y) {
    requireMatrix(X);
    if (!Array.isArray(y) || y.length !== X.length || y.some(function (v) { return !Number.isFinite(Number(v)); })) fail('y must contain one finite numeric value per row.');
  }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / Math.max(1, a.length); }
  function variance(a) { const m = mean(a); return a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / Math.max(1, a.length - 1); }
  function sd(a) { return Math.sqrt(Math.max(0, variance(a))); }
  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i += 1) s += a[i] * b[i]; return s; }
  function transpose(A) { return A[0].map(function (_, j) { return A.map(function (r) { return r[j]; }); }); }
  function matvec(A, v) { return A.map(function (r) { return dot(r, v); }); }
  function cloneMatrix(A) { return A.map(function (r) { return r.slice(); }); }

  function solve(A, b) {
    const M = cloneMatrix(A); const rhs = b.slice(); const n = M.length;
    for (let k = 0; k < n; k += 1) {
      let p = k;
      for (let i = k + 1; i < n; i += 1) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      if (Math.abs(M[p][k]) < 1e-12) M[p][k] = M[p][k] < 0 ? -1e-12 : 1e-12;
      const tr = M[k]; M[k] = M[p]; M[p] = tr;
      const tb = rhs[k]; rhs[k] = rhs[p]; rhs[p] = tb;
      const piv = M[k][k];
      for (let j = k; j < n; j += 1) M[k][j] /= piv;
      rhs[k] /= piv;
      for (let i = 0; i < n; i += 1) if (i !== k) {
        const f = M[i][k];
        for (let j = k; j < n; j += 1) M[i][j] -= f * M[k][j];
        rhs[i] -= f * rhs[k];
      }
    }
    return rhs;
  }

  function rng(seed) {
    let a = (Number(seed) || 1) >>> 0;
    return function () {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffledIndices(n, seed) {
    const out = Array.from({ length: n }, function (_, i) { return i; });
    const random = rng(seed);
    for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
    return out;
  }
  function unique(a) { return Array.from(new Set(a.map(String))); }

  function fitStandardizer(X) {
    requireMatrix(X);
    const cols = transpose(X);
    const means = cols.map(mean);
    const scales = cols.map(function (c) { const s = sd(c); return s > 1e-12 ? s : 1; });
    return { means: means, scales: scales };
  }
  function transformStandardizer(X, scaler) {
    return X.map(function (r) { return r.map(function (v, j) { return (v - scaler.means[j]) / scaler.scales[j]; }); });
  }

  function makeFolds(y, k, seed, stratified) {
    if (!Array.isArray(y) || y.length < 4) fail('cross-validation needs at least four rows.');
    k = Math.max(2, Math.min(Math.floor(k || 5), y.length));
    const folds = Array.from({ length: k }, function () { return []; });
    if (stratified) {
      const byClass = {};
      y.forEach(function (value, i) { const key = String(value); (byClass[key] = byClass[key] || []).push(i); });
      Object.keys(byClass).sort().forEach(function (key, classIndex) {
        const ids = byClass[key];
        const order = shuffledIndices(ids.length, (Number(seed) || 1) + classIndex * 101).map(function (i) { return ids[i]; });
        order.forEach(function (id, i) { folds[i % k].push(id); });
      });
    } else {
      shuffledIndices(y.length, seed).forEach(function (id, i) { folds[i % k].push(id); });
    }
    return folds;
  }

  function ridgeFit(X, y, lambda) {
    requireTarget(X, y);
    const Xb = X.map(function (r) { return [1].concat(r); });
    const p = Xb[0].length;
    const XtX = Array.from({ length: p }, function () { return Array(p).fill(0); });
    const Xty = Array(p).fill(0);
    Xb.forEach(function (r, i) {
      for (let a = 0; a < p; a += 1) {
        Xty[a] += r[a] * y[i];
        for (let b = 0; b < p; b += 1) XtX[a][b] += r[a] * r[b];
      }
    });
    const penalty = Math.max(0, Number(lambda) || 0);
    for (let j = 1; j < p; j += 1) XtX[j][j] += penalty;
    const coefficients = solve(XtX, Xty);
    return { type: penalty > 0 ? 'ridge' : 'linear', lambda: penalty, coefficients: coefficients };
  }
  function ridgePredict(model, X) { return X.map(function (r) { return model.coefficients[0] + dot(model.coefficients.slice(1), r); }); }

  function sigmoid(z) { const q = Math.max(-40, Math.min(40, z)); return 1 / (1 + Math.exp(-q)); }
  function logisticFit(X, y, options) {
    requireTarget(X, y);
    const classes = unique(y);
    if (classes.length !== 2 || !y.every(function (v) { return Number(v) === 0 || Number(v) === 1; })) fail('binary logistic regression requires target values 0 and 1.');
    const opts = Object.assign({ lambda: 0.01, learningRate: 0.12, iterations: 1200, tolerance: 1e-8 }, options || {});
    const Xb = X.map(function (r) { return [1].concat(r); });
    let w = Array(Xb[0].length).fill(0); const history = []; let prev = Infinity; let converged = false;
    for (let it = 0; it < opts.iterations; it += 1) {
      const grad = Array(w.length).fill(0); let loss = 0;
      Xb.forEach(function (r, i) {
        const p = Math.max(1e-12, Math.min(1 - 1e-12, sigmoid(dot(r, w))));
        const err = p - y[i];
        loss -= y[i] * Math.log(p) + (1 - y[i]) * Math.log(1 - p);
        for (let j = 0; j < w.length; j += 1) grad[j] += err * r[j];
      });
      for (let j = 1; j < w.length; j += 1) { grad[j] += opts.lambda * w[j]; loss += 0.5 * opts.lambda * w[j] * w[j]; }
      for (let j = 0; j < w.length; j += 1) w[j] -= opts.learningRate * grad[j] / Xb.length;
      loss /= Xb.length;
      if (it % 20 === 0 || it === opts.iterations - 1) history.push({ iteration: it, loss: loss });
      if (Math.abs(prev - loss) < opts.tolerance) { converged = true; break; }
      prev = loss;
    }
    return { type: 'logistic', coefficients: w, lambda: opts.lambda, converged: converged, history: history };
  }
  function logisticProb(model, X) { return X.map(function (r) { return sigmoid(model.coefficients[0] + dot(model.coefficients.slice(1), r)); }); }

  function gaussianNbFit(X, y) {
    requireTarget(X, y);
    if (!y.every(function (v) { return Number(v) === 0 || Number(v) === 1; })) fail('Gaussian naive Bayes requires binary target values 0 and 1.');
    const classes = [0, 1];
    const stats = classes.map(function (c) {
      const rows = X.filter(function (_, i) { return Number(y[i]) === c; });
      if (!rows.length) fail('each class needs at least one row.');
      const cols = transpose(rows);
      return { prior: rows.length / X.length, means: cols.map(mean), variances: cols.map(function (col) { return Math.max(variance(col), 1e-9); }) };
    });
    return { type: 'gaussian-nb', stats: stats };
  }
  function gaussianNbProb(model, X) {
    return X.map(function (r) {
      const logs = model.stats.map(function (s) {
        let value = Math.log(Math.max(1e-12, s.prior));
        r.forEach(function (x, j) { const v = s.variances[j]; value += -0.5 * Math.log(2 * Math.PI * v) - (x - s.means[j]) * (x - s.means[j]) / (2 * v); });
        return value;
      });
      const m = Math.max(logs[0], logs[1]); const e0 = Math.exp(logs[0] - m); const e1 = Math.exp(logs[1] - m); return e1 / (e0 + e1);
    });
  }

  function distance(a, b) { let s = 0; for (let j = 0; j < a.length; j += 1) s += (a[j] - b[j]) * (a[j] - b[j]); return Math.sqrt(s); }
  function knnFit(X, y, k) { requireTarget(X, y); return { type: 'knn', X: cloneMatrix(X), y: y.slice(), k: Math.max(1, Math.min(Math.floor(k || 5), X.length)) }; }
  function knnProb(model, X) {
    return X.map(function (r) {
      const near = model.X.map(function (q, i) { return { d: distance(r, q), y: Number(model.y[i]) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, model.k);
      return mean(near.map(function (o) { return o.y; }));
    });
  }

  function regressionMetrics(y, pred) {
    const residuals = y.map(function (v, i) { return v - pred[i]; });
    const mse = mean(residuals.map(function (r) { return r * r; }));
    const mae = mean(residuals.map(Math.abs));
    const ybar = mean(y); const ssTot = y.reduce(function (s, v) { return s + (v - ybar) * (v - ybar); }, 0); const ssRes = residuals.reduce(function (s, v) { return s + v * v; }, 0);
    return { rmse: Math.sqrt(mse), mae: mae, r2: 1 - ssRes / Math.max(1e-15, ssTot), residuals: residuals };
  }
  function classificationMetrics(y, prob, threshold) {
    threshold = Number.isFinite(Number(threshold)) ? Number(threshold) : 0.5;
    const pred = prob.map(function (p) { return p >= threshold ? 1 : 0; });
    let tp = 0, tn = 0, fp = 0, fn = 0;
    y.forEach(function (v, i) { if (v === 1 && pred[i] === 1) tp += 1; else if (v === 0 && pred[i] === 0) tn += 1; else if (v === 0) fp += 1; else fn += 1; });
    const precision = tp / Math.max(1, tp + fp); const recall = tp / Math.max(1, tp + fn); const specificity = tn / Math.max(1, tn + fp);
    const logLoss = -mean(prob.map(function (p, i) { const q = Math.max(1e-12, Math.min(1 - 1e-12, p)); return y[i] * Math.log(q) + (1 - y[i]) * Math.log(1 - q); }));
    const brier = mean(prob.map(function (p, i) { return (p - y[i]) * (p - y[i]); }));
    return { tp: tp, tn: tn, fp: fp, fn: fn, accuracy: (tp + tn) / y.length, balancedAccuracy: 0.5 * (recall + specificity), precision: precision, recall: recall, specificity: specificity, f1: 2 * precision * recall / Math.max(1e-12, precision + recall), logLoss: logLoss, brier: brier, pred: pred };
  }
  function rocCurve(y, prob) {
    const thresholds = Array.from(new Set([1].concat(prob.slice().sort(function (a, b) { return b - a; }), [0])));
    const points = thresholds.map(function (th) { const m = classificationMetrics(y, prob, th); return { threshold: th, tpr: m.recall, fpr: 1 - m.specificity, precision: m.precision, recall: m.recall }; }).sort(function (a, b) { return a.fpr - b.fpr || a.tpr - b.tpr; });
    let auc = 0; for (let i = 1; i < points.length; i += 1) auc += (points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr) / 2;
    return { points: points, auc: Math.max(0, Math.min(1, auc)) };
  }
  function prCurve(y, prob) {
    const thresholds = Array.from(new Set([1].concat(prob.slice().sort(function (a, b) { return b - a; }), [0])));
    const points = thresholds.map(function (th) { const m = classificationMetrics(y, prob, th); return { threshold: th, precision: m.precision, recall: m.recall }; }).sort(function (a, b) { return a.recall - b.recall; });
    let auc = 0; for (let i = 1; i < points.length; i += 1) auc += (points[i].recall - points[i - 1].recall) * (points[i].precision + points[i - 1].precision) / 2;
    return { points: points, auc: Math.max(0, Math.min(1, auc)) };
  }
  function calibration(y, prob, bins) {
    bins = Math.max(3, Math.min(20, Math.floor(bins || 8)));
    const out = [];
    for (let b = 0; b < bins; b += 1) {
      const lo = b / bins; const hi = (b + 1) / bins;
      const ids = prob.map(function (p, i) { return { p: p, i: i }; }).filter(function (o) { return o.p >= lo && (b === bins - 1 ? o.p <= hi : o.p < hi); });
      if (ids.length) out.push({ lower: lo, upper: hi, n: ids.length, predicted: mean(ids.map(function (o) { return o.p; })), observed: mean(ids.map(function (o) { return y[o.i]; })) });
    }
    return out;
  }

  function fitModel(name, task, X, y, options) {
    const o = options || {};
    if (task === 'regression') return ridgeFit(X, y, name === 'linear' ? 0 : Math.max(0, Number(o.lambda) || 1));
    if (name === 'logistic') return logisticFit(X, y, { lambda: Math.max(0, Number(o.lambda) || 0.01) });
    if (name === 'knn') return knnFit(X, y, o.neighbors);
    if (name === 'gaussian-nb') return gaussianNbFit(X, y);
    fail('unsupported model ' + name + ' for task ' + task + '.');
  }
  function predictModel(model, X) {
    if (model.type === 'linear' || model.type === 'ridge') return ridgePredict(model, X);
    if (model.type === 'logistic') return logisticProb(model, X);
    if (model.type === 'knn') return knnProb(model, X);
    if (model.type === 'gaussian-nb') return gaussianNbProb(model, X);
    fail('unsupported fitted model type ' + model.type + '.');
  }

  function crossValidate(X, y, config) {
    requireTarget(X, y);
    const cfg = Object.assign({ task: 'regression', model: 'ridge', folds: 5, seed: 1234, standardize: true, lambda: 1, neighbors: 5, threshold: 0.5 }, config || {});
    if (cfg.task === 'classification' && (!y.every(function (v) { return v === 0 || v === 1; }) || unique(y).length !== 2)) fail('classification requires both binary classes 0 and 1.');
    const foldIds = makeFolds(y, cfg.folds, cfg.seed, cfg.task === 'classification');
    const oof = Array(y.length).fill(NaN); const folds = [];
    foldIds.forEach(function (testIds, foldIndex) {
      const testSet = new Set(testIds); const trainIds = y.map(function (_, i) { return i; }).filter(function (i) { return !testSet.has(i); });
      if (!testIds.length || trainIds.length < 2) return;
      const XtrRaw = trainIds.map(function (i) { return X[i]; }); const ytr = trainIds.map(function (i) { return y[i]; }); const XteRaw = testIds.map(function (i) { return X[i]; });
      const scaler = cfg.standardize ? fitStandardizer(XtrRaw) : null;
      const Xtr = scaler ? transformStandardizer(XtrRaw, scaler) : XtrRaw; const Xte = scaler ? transformStandardizer(XteRaw, scaler) : XteRaw;
      const model = fitModel(cfg.model, cfg.task, Xtr, ytr, cfg); const pred = predictModel(model, Xte);
      testIds.forEach(function (id, j) { oof[id] = pred[j]; });
      const metric = cfg.task === 'regression' ? regressionMetrics(testIds.map(function (i) { return y[i]; }), pred) : classificationMetrics(testIds.map(function (i) { return y[i]; }), pred, cfg.threshold);
      folds.push({ fold: foldIndex + 1, nTrain: trainIds.length, nTest: testIds.length, metric: metric });
    });
    if (oof.some(function (v) { return !Number.isFinite(v); })) fail('cross-validation did not produce one prediction per row.');
    const aggregate = cfg.task === 'regression' ? regressionMetrics(y, oof) : classificationMetrics(y, oof, cfg.threshold);
    if (cfg.task === 'classification') { aggregate.roc = rocCurve(y, oof); aggregate.pr = prCurve(y, oof); aggregate.calibration = calibration(y, oof, 8); }
    return { task: cfg.task, model: cfg.model, config: cfg, folds: folds, predictions: oof, aggregate: aggregate };
  }

  function compareModels(X, y, config) {
    const cfg = Object.assign({}, config || {}); const names = cfg.task === 'regression' ? ['linear', 'ridge'] : ['logistic', 'gaussian-nb', 'knn'];
    return names.map(function (name) {
      try {
        const cv = crossValidate(X, y, Object.assign({}, cfg, { model: name }));
        return { model: name, status: 'ok', primary: cfg.task === 'regression' ? cv.aggregate.rmse : cv.aggregate.balancedAccuracy, cv: cv };
      } catch (error) { return { model: name, status: 'failed', error: error.message, primary: NaN }; }
    });
  }

  function permutationImportance(X, y, config) {
    const base = crossValidate(X, y, config); const random = rng((config.seed || 1) + 999); const out = [];
    for (let j = 0; j < X[0].length; j += 1) {
      const Xp = cloneMatrix(X); const values = Xp.map(function (r) { return r[j]; });
      for (let i = values.length - 1; i > 0; i -= 1) { const q = Math.floor(random() * (i + 1)); const t = values[i]; values[i] = values[q]; values[q] = t; }
      Xp.forEach(function (r, i) { r[j] = values[i]; });
      const perm = crossValidate(Xp, y, config);
      const delta = config.task === 'regression' ? perm.aggregate.rmse - base.aggregate.rmse : base.aggregate.balancedAccuracy - perm.aggregate.balancedAccuracy;
      out.push({ feature: j, importance: delta });
    }
    return { baseline: base, values: out.sort(function (a, b) { return b.importance - a.importance; }) };
  }


  function primaryScore(cv, task) { return task === 'regression' ? cv.aggregate.rmse : cv.aggregate.balancedAccuracy; }
  function repeatedCrossValidate(X, y, config, repeats) {
    const n = Math.max(1, Math.min(20, Math.floor(Number(repeats) || 1))); const runs = [];
    for (let r = 0; r < n; r += 1) {
      const cv = crossValidate(X, y, Object.assign({}, config, { seed: (Number(config.seed) || 1) + r * 7919 }));
      runs.push({ repeat: r + 1, seed: cv.config.seed, score: primaryScore(cv, config.task), aggregate: cv.aggregate });
    }
    const values = runs.map(function (run) { return run.score; });
    return { repeats: n, runs: runs, mean: mean(values), sd: sd(values), min: Math.min.apply(null, values), max: Math.max.apply(null, values), q05: quantileSimple(values, 0.05), q95: quantileSimple(values, 0.95) };
  }
  function quantileSimple(values, q) {
    const sorted = values.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; }); if (!sorted.length) return NaN;
    const pos = (sorted.length - 1) * q; const lo = Math.floor(pos), hi = Math.ceil(pos); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function tuningCandidates(config) {
    if (config.model === 'knn') return [1,3,5,7,9,11,15].filter(function (k) { return k < 50; }).map(function (value) { return { key: 'neighbors', value: value }; });
    if (config.model === 'ridge' || config.model === 'logistic') return [0,0.001,0.01,0.1,1,10,100].map(function (value) { return { key: 'lambda', value: value }; });
    return [{ key: null, value: null }];
  }
  function nestedCrossValidate(X, y, config) {
    requireTarget(X, y); const cfg = Object.assign({}, config || {}); const outer = makeFolds(y, cfg.folds || 5, cfg.seed || 1, cfg.task === 'classification');
    const oof = Array(y.length).fill(NaN); const selections = []; const folds = [];
    outer.forEach(function (testIds, foldIndex) {
      const testSet = new Set(testIds); const trainIds = y.map(function (_, i) { return i; }).filter(function (i) { return !testSet.has(i); });
      const Xtrain = trainIds.map(function (i) { return X[i]; }), ytrain = trainIds.map(function (i) { return y[i]; });
      let best = null;
      tuningCandidates(cfg).forEach(function (candidate) {
        const candidateCfg = Object.assign({}, cfg, { folds: Math.max(2, Math.min((cfg.innerFolds || 4), Math.floor(ytrain.length / 3))), seed: (cfg.seed || 1) + 1009 * (foldIndex + 1) });
        if (candidate.key) candidateCfg[candidate.key] = candidate.value;
        try {
          const inner = crossValidate(Xtrain, ytrain, candidateCfg); const score = primaryScore(inner, cfg.task);
          const better = !best || (cfg.task === 'regression' ? score < best.score : score > best.score);
          if (better) best = { candidate: candidate, score: score };
        } catch (_) {}
      });
      if (!best) fail('nested tuning failed in outer fold ' + (foldIndex + 1) + '.');
      const finalCfg = Object.assign({}, cfg); if (best.candidate.key) finalCfg[best.candidate.key] = best.candidate.value;
      const XtrRaw = trainIds.map(function (i) { return X[i]; }), XteRaw = testIds.map(function (i) { return X[i]; });
      const scaler = finalCfg.standardize ? fitStandardizer(XtrRaw) : null; const Xtr = scaler ? transformStandardizer(XtrRaw, scaler) : XtrRaw; const Xte = scaler ? transformStandardizer(XteRaw, scaler) : XteRaw;
      const fitted = fitModel(finalCfg.model, finalCfg.task, Xtr, ytrain, finalCfg); const pred = predictModel(fitted, Xte); const ytest = testIds.map(function (i) { return y[i]; });
      testIds.forEach(function (id, j) { oof[id] = pred[j]; }); selections.push({ fold: foldIndex + 1, parameter: best.candidate.key, value: best.candidate.value, innerScore: best.score });
      folds.push({ fold: foldIndex + 1, nTrain: trainIds.length, nTest: testIds.length, metric: finalCfg.task === 'regression' ? regressionMetrics(ytest, pred) : classificationMetrics(ytest, pred, finalCfg.threshold) });
    });
    if (oof.some(function (v) { return !Number.isFinite(v); })) fail('nested cross-validation did not produce one prediction per row.');
    const aggregate = cfg.task === 'regression' ? regressionMetrics(y, oof) : classificationMetrics(y, oof, cfg.threshold);
    if (cfg.task === 'classification') { aggregate.roc = rocCurve(y, oof); aggregate.pr = prCurve(y, oof); aggregate.calibration = calibration(y, oof, 8); }
    return { task: cfg.task, model: cfg.model, config: cfg, folds: folds, selections: selections, predictions: oof, aggregate: aggregate, nested: true };
  }
  function permutationImportanceRepeated(X, y, config, repeats) {
    const n = Math.max(1, Math.min(20, Math.floor(Number(repeats) || 5))); const all = Array.from({ length: X[0].length }, function () { return []; }); let baseline = null;
    for (let r = 0; r < n; r += 1) {
      const result = permutationImportance(X, y, Object.assign({}, config, { seed: (Number(config.seed) || 1) + r * 3571 })); baseline = baseline || result.baseline;
      result.values.forEach(function (entry) { all[entry.feature].push(entry.importance); });
    }
    return { baseline: baseline, repeats: n, values: all.map(function (values, feature) { return { feature: feature, importance: mean(values), sd: sd(values), q05: quantileSimple(values, 0.05), q95: quantileSimple(values, 0.95), values: values }; }).sort(function (a, b) { return b.importance - a.importance; }) };
  }
  function pearson(a, b) {
    const ma=mean(a), mb=mean(b); let num=0, da=0, db=0; for(let i=0;i<a.length;i+=1){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y;} return num/Math.sqrt(Math.max(1e-30,da*db));
  }
  function datasetAudit(X, y, featureNames, task) {
    requireMatrix(X); const names=featureNames&&featureNames.length===X[0].length?featureNames:X[0].map(function(_,i){return 'x'+(i+1);}); const warnings=[];
    const rowKeys=X.map(function(row,i){return JSON.stringify(row)+(y?('|'+y[i]):'');}); const duplicates=rowKeys.length-new Set(rowKeys).size;
    const cols=transpose(X); const nearZero=[]; const idLike=[]; cols.forEach(function(col,j){if(sd(col)<1e-10)nearZero.push(names[j]); if(new Set(col).size/col.length>0.95)idLike.push(names[j]);});
    const highCorrelation=[]; for(let i=0;i<cols.length;i+=1)for(let j=i+1;j<cols.length;j+=1){const r=pearson(cols[i],cols[j]);if(Number.isFinite(r)&&Math.abs(r)>0.98)highCorrelation.push({a:names[i],b:names[j],r:r});}
    const leakage=[]; if(y){cols.forEach(function(col,j){if(col.every(function(v,i){return v===y[i];}))leakage.push(names[j]);});}
    if(duplicates)warnings.push(duplicates+' duplicate rows detected.'); if(nearZero.length)warnings.push('Near-zero variance features: '+nearZero.join(', ')+'.'); if(idLike.length)warnings.push('Identifier-like high-uniqueness features: '+idLike.join(', ')+'.'); if(highCorrelation.length)warnings.push('Near-collinear feature pairs detected.'); if(leakage.length)warnings.push('Potential direct target leakage: '+leakage.join(', ')+'.');
    let classBalance=null; if(task==='classification'&&y){const positives=y.reduce(function(sum,v){return sum+(v===1?1:0);},0);classBalance={positive:positives,negative:y.length-positives,minorityFraction:Math.min(positives,y.length-positives)/y.length};if(classBalance.minorityFraction<0.15)warnings.push('Severe class imbalance: minority fraction '+classBalance.minorityFraction.toFixed(3)+'.');}
    if(X[0].length>=X.length/5)warnings.push('Feature count is large relative to sample size; validation variance and coefficient instability may dominate.');
    return { rows:X.length, features:X[0].length, duplicates:duplicates, nearZeroVariance:nearZero, identifierLike:idLike, highCorrelation:highCorrelation, directLeakage:leakage, classBalance:classBalance, warnings:warnings };
  }

  function learningCurve(X, y, config) {
    requireTarget(X, y);
    const fractions = [0.35, 0.5, 0.7, 0.85, 1]; const order = shuffledIndices(X.length, config.seed || 1);
    return fractions.map(function (fraction) {
      const n = Math.max(6, Math.min(X.length, Math.floor(X.length * fraction))); const ids = order.slice(0, n);
      const Xs = ids.map(function (i) { return X[i]; }); const ys = ids.map(function (i) { return y[i]; });
      try { const cv = crossValidate(Xs, ys, Object.assign({}, config, { folds: Math.min(config.folds || 5, Math.max(2, Math.floor(n / 3))) })); return { n: n, fraction: fraction, score: config.task === 'regression' ? cv.aggregate.rmse : cv.aggregate.balancedAccuracy, status: 'ok' }; }
      catch (error) { return { n: n, fraction: fraction, score: NaN, status: 'failed', error: error.message }; }
    });
  }

  function kmeans(X, k, seed, maxIterations) {
    requireMatrix(X); k = Math.floor(k || 3); if (k < 2 || k > X.length) fail('k must be between 2 and the number of rows.');
    const order = shuffledIndices(X.length, seed || 1); let centroids = order.slice(0, k).map(function (i) { return X[i].slice(); }); let labels = Array(X.length).fill(0); let iterations = 0;
    for (iterations = 0; iterations < (maxIterations || 100); iterations += 1) {
      let changed = false;
      X.forEach(function (row, i) { let best = 0; let bestD = Infinity; centroids.forEach(function (c, j) { const d = distance(row, c); if (d < bestD) { bestD = d; best = j; } }); if (labels[i] !== best) { labels[i] = best; changed = true; } });
      const sums = Array.from({ length: k }, function () { return Array(X[0].length).fill(0); }); const counts = Array(k).fill(0);
      X.forEach(function (row, i) { counts[labels[i]] += 1; row.forEach(function (v, j) { sums[labels[i]][j] += v; }); });
      centroids = centroids.map(function (old, c) { return counts[c] ? sums[c].map(function (v) { return v / counts[c]; }) : old; });
      if (!changed && iterations > 0) break;
    }
    let inertia = 0; X.forEach(function (row, i) { const d = distance(row, centroids[labels[i]]); inertia += d * d; });
    return { labels: labels, centroids: centroids, inertia: inertia, iterations: iterations + 1 };
  }
  function silhouette(X, labels) {
    requireMatrix(X); const classes = unique(labels); if (classes.length < 2) return { mean: NaN, values: Array(X.length).fill(NaN) };
    const values = X.map(function (row, i) {
      const own = String(labels[i]); const same = []; const other = {};
      X.forEach(function (q, j) { if (i === j) return; const d = distance(row, q); const key = String(labels[j]); if (key === own) same.push(d); else (other[key] = other[key] || []).push(d); });
      const a = same.length ? mean(same) : 0; const b = Math.min.apply(null, Object.keys(other).map(function (key) { return mean(other[key]); })); return (b - a) / Math.max(a, b, 1e-12);
    });
    return { mean: mean(values), values: values };
  }
  function kmeansElbow(X, maxK, seed) { return Array.from({ length: Math.max(1, Math.min(maxK || 8, X.length - 1)) - 1 }, function (_, i) { const k = i + 2; const fit = kmeans(X, k, (seed || 1) + k); return { k: k, inertia: fit.inertia, silhouette: silhouette(X, fit.labels).mean }; }); }

  function pca2(X) {
    requireMatrix(X); const scaler = fitStandardizer(X); const Z = transformStandardizer(X, scaler); const p = Z[0].length;
    const covariance = Array.from({ length: p }, function () { return Array(p).fill(0); });
    Z.forEach(function (r) { for (let i = 0; i < p; i += 1) for (let j = 0; j < p; j += 1) covariance[i][j] += r[i] * r[j] / Math.max(1, Z.length - 1); });
    function power(A, seed) { let v = Array.from({ length: A.length }, function (_, i) { return i === seed % A.length ? 1 : 0.5 / A.length; }); for (let it = 0; it < 200; it += 1) { const w = matvec(A, v); const norm = Math.sqrt(dot(w, w)) || 1; v = w.map(function (x) { return x / norm; }); } return { value: dot(v, matvec(A, v)), vector: v }; }
    const e1 = power(covariance, 0); const deflated = covariance.map(function (r, i) { return r.map(function (v, j) { return v - e1.value * e1.vector[i] * e1.vector[j]; }); }); const e2 = power(deflated, 1);
    const trace = covariance.reduce(function (s, r, i) { return s + r[i]; }, 0) || 1;
    return { scores: Z.map(function (r) { return [dot(r, e1.vector), dot(r, e2.vector)]; }), components: [e1.vector, e2.vector], eigenvalues: [e1.value, e2.value], explained: [e1.value / trace, e2.value / trace], scaler: scaler };
  }

  const api = {
    rng: rng, shuffledIndices: shuffledIndices, fitStandardizer: fitStandardizer, transformStandardizer: transformStandardizer,
    makeFolds: makeFolds, ridgeFit: ridgeFit, ridgePredict: ridgePredict, logisticFit: logisticFit, logisticProb: logisticProb,
    gaussianNbFit: gaussianNbFit, gaussianNbProb: gaussianNbProb, knnFit: knnFit, knnProb: knnProb,
    regressionMetrics: regressionMetrics, classificationMetrics: classificationMetrics, rocCurve: rocCurve, prCurve: prCurve, calibration: calibration,
    crossValidate: crossValidate, repeatedCrossValidate: repeatedCrossValidate, nestedCrossValidate: nestedCrossValidate, compareModels: compareModels, permutationImportance: permutationImportance, permutationImportanceRepeated: permutationImportanceRepeated, learningCurve: learningCurve, datasetAudit: datasetAudit,
    kmeans: kmeans, silhouette: silhouette, kmeansElbow: kmeansElbow, pca2: pca2
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoMLReference = api;
})(typeof window !== 'undefined' ? window : globalThis);
