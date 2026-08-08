/* Foko Lab v72.16 authored Machine Learning workspace.
 * Binds local data to the pure FokoMLReference core with leakage-aware CV.
 */
(function (root) {
  'use strict';

  const DATA = root.FokoDataCore;
  const ML = root.FokoMLReference;
  const PCA = root.FokoPCA;
  const PRESETS = root.FokoMLPresets || {};
  const PLOT = root.FokoPlotLifecycle;
  if (!DATA || !ML || !PCA || !PLOT) throw new Error('ML Toolkit requires FokoDataCore, FokoMLReference, FokoPCA and FokoPlotLifecycle.');

  const RELEASE = '77.4.1';
  const STORAGE_KEY = 'fokolab:v72.16:ml-config';
  const $ = function (id) { return document.getElementById(id); };
  const state = {
    preset: Object.keys(PRESETS)[0] || '', dataset: null, result: null, runtime: 0,
    layout: 'two', focusSide: 'left', lastPlotSide: 'left',
    plotTypes: { left: 'prediction', right: 'cv' }
  };

  const PLOTS = {
    prediction: { label: 'Observed vs out-of-fold prediction', evidence: 'Predictions are generated out of fold. Agreement within this dataset does not establish performance under distribution shift.' },
    residual: { label: 'Out-of-fold residuals', evidence: 'Residual structure can expose nonlinearity, changing variance or omitted variables. A small average residual does not prove model adequacy.' },
    cv: { label: 'Cross-validation fold scores', evidence: 'Fold-to-fold variability is part of the result. Cross-validation estimates internal performance only under the observed sampling structure.' },
    'repeat-cv': { label: 'Repeated-validation score distribution', evidence: 'Scores are recomputed with deterministic alternative fold assignments. This quantifies partition sensitivity, not external uncertainty.' },
    audit: { label: 'Data reliability audit', evidence: 'Flags identify duplicates, near-zero variance, identifier-like columns, near-collinearity, class imbalance and direct target leakage. They are screening diagnostics, not automatic exclusions.' },
    learning: { label: 'Learning curve', evidence: 'The curve repeats seeded cross-validation on smaller subsets. It is descriptive and can be unstable for small data.' },
    importance: { label: 'Permutation importance', evidence: 'Features are permuted one at a time and the cross-validated score deterioration is measured. Correlation and redundancy can dilute or redistribute importance.' },
    roc: { label: 'ROC curve', evidence: 'ROC summarizes ranking across thresholds. It does not establish probability calibration or useful performance at the operational prevalence.' },
    pr: { label: 'Precision–recall curve', evidence: 'Precision depends on prevalence. The displayed curve is internal out-of-fold evidence for this dataset.' },
    confusion: { label: 'Out-of-fold confusion matrix', evidence: 'Counts use the selected probability threshold. Different costs or prevalence may require a different threshold.' },
    calibration: { label: 'Calibration reliability diagram', evidence: 'Binned out-of-fold probabilities are compared with observed event frequencies. Sparse bins are noisy and are not a formal calibration guarantee.' },
    classification: { label: 'Classification projection', evidence: 'Only the first two selected features are shown. Point colour represents the observed class; overlap in omitted dimensions is not visible.' },
    clusters: { label: 'K-means cluster projection', evidence: 'The first two standardized features are shown. Cluster IDs are algorithmic labels, not inferred natural kinds.' },
    silhouette: { label: 'Silhouette values', evidence: 'Silhouette compares within-cluster and nearest-cluster distances. It is conditional on Euclidean geometry and the fitted partition.' },
    elbow: { label: 'K-means elbow and silhouette', evidence: 'The elbow is a heuristic finite search over k. It does not prove a true number of groups.' },
    pca: { label: 'PCA scores', evidence: 'Rows are projected onto the first two standardized principal components. Components summarize variance, not causality.' },
    explained: { label: 'Explained variance', evidence: 'Variance fractions are sample estimates and can be sensitive to scaling, outliers and small sample size.' },
    loadings: { label: 'PCA loadings', evidence: 'Loadings describe linear directions in standardized feature space. Sign is arbitrary and magnitude is not causal importance.' }
  };
  root.FokoMLPlotMeta = PLOTS;

  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function fmt(value, digits) { const x = Number(value); if (!Number.isFinite(x)) return '—'; if (x !== 0 && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-4)) return x.toExponential(3); return x.toFixed(digits == null ? 3 : digits).replace(/\.?0+$/, ''); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function download(filename, content, type) { const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 0); }
  function encodeState(value) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
  function decodeState(value) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }

  function presetNames() { return Object.keys(PRESETS); }
  function selectedFeatureIndices() { return Array.from(document.querySelectorAll('#mlFeatureGrid input[type="checkbox"]:checked')).map(function (el) { return Number(el.value); }); }
  function selectedFeatureNames() { return selectedFeatureIndices().map(function (i) { return state.dataset.names[i]; }); }

  function renderPresetLibrary() {
    const names = presetNames();
    $('mlPresetSelect').innerHTML = names.map(function (name) { return '<option value="' + escapeHtml(name) + '">' + escapeHtml(PRESETS[name].title) + '</option>'; }).join('');
    $('mlPresetDeck').innerHTML = names.map(function (name) {
      const p = PRESETS[name];
      return '<button type="button" data-preset="' + escapeHtml(name) + '" class="' + (name === state.preset ? 'active' : '') + '"><b>' + escapeHtml(p.title) + '</b><small>' + escapeHtml(p.family + ' · ' + p.difficulty) + '</small></button>';
    }).join('');
    $('mlPresetSelect').value = state.preset;
  }

  function parseDataset() {
    const dataset = DATA.parseDataset($('mlData').value, { delimiter: $('mlDelimiter').value, header: 'auto' });
    state.dataset = dataset;
    $('mlDataSummary').innerHTML = '<b>' + dataset.rowCount + '</b> rows · <b>' + dataset.columnCount + '</b> columns · <b>' + dataset.missingCells + '</b> missing cells · delimiter ' + escapeHtml(dataset.delimiter === '\t' ? 'tab' : dataset.delimiter);
    renderColumnControls();
    return dataset;
  }

  function renderColumnControls(preferredFeatures, preferredTarget) {
    const dataset = state.dataset; if (!dataset) return;
    const numeric = dataset.columns.filter(function (c) { return c.type === 'numeric'; });
    const previous = selectedFeatureNames();
    const wanted = preferredFeatures || previous;
    $('mlFeatureGrid').innerHTML = numeric.map(function (column) {
      const checked = wanted.indexOf(column.name) >= 0 || (!wanted.length && column.index !== Number($('mlTarget').value));
      return '<label class="check-label"><input type="checkbox" value="' + column.index + '" ' + (checked ? 'checked' : '') + '/><span>' + escapeHtml(column.name) + '</span><small>' + column.nonmissing + ' numeric</small></label>';
    }).join('');
    const oldTargetName = preferredTarget || ($('mlTarget').selectedOptions[0] ? $('mlTarget').selectedOptions[0].textContent : '');
    $('mlTarget').innerHTML = '<option value="">No target</option>' + numeric.map(function (c) { return '<option value="' + c.index + '">' + escapeHtml(c.name) + '</option>'; }).join('');
    const match = numeric.find(function (c) { return c.name === oldTargetName; });
    if (match) $('mlTarget').value = String(match.index);
    updateTaskControls();
  }

  function updateTaskControls() {
    const task = $('mlTask').value;
    const supervised = task === 'regression' || task === 'classification';
    $('mlTargetWrap').hidden = !supervised;
    $('mlModelWrap').hidden = !supervised;
    $('mlClusterWrap').hidden = task !== 'clustering';
    $('mlThresholdWrap').hidden = task !== 'classification';
    $('mlNeighborsWrap').hidden = task !== 'classification';
    $('mlLambdaWrap').hidden = !supervised;
    const models = task === 'regression'
      ? [['compare','Compare linear and ridge'],['linear','Linear regression'],['ridge','Ridge regression']]
      : [['compare','Compare logistic, Gaussian NB and k-NN'],['logistic','Logistic regression'],['gaussian-nb','Gaussian naive Bayes'],['knn','k-nearest neighbours']];
    if (supervised) {
      const current = $('mlModel').value;
      $('mlModel').innerHTML = models.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
      if (models.some(function (o) { return o[0] === current; })) $('mlModel').value = current;
    }
    $('mlBoundary').textContent = task === 'classification'
      ? 'Binary classification requires explicit 0/1 labels. Scaling is fitted inside each training fold; no training-row score is presented as validation evidence.'
      : task === 'regression'
        ? 'Regression scores are out-of-fold estimates. They do not establish causal effects, structural identifiability or extrapolation reliability.'
        : task === 'clustering'
          ? 'K-means is a Euclidean partition, not evidence that natural groups exist. Standardization and k materially determine the result.'
          : 'PCA is an unsupervised variance summary after standardization. It does not identify latent mechanisms.';
  }

  function loadPreset(name) {
    const p = PRESETS[name]; if (!p) return;
    state.preset = name; $('mlPresetSelect').value = name;
    $('mlData').value = p.data; $('mlTask').value = p.task; $('mlModel').value = p.model || 'compare';
    $('mlPresetTitle').textContent = p.title; $('mlPresetMeta').textContent = p.family + ' · ' + p.difficulty; $('mlPresetNote').textContent = p.note;
    document.querySelectorAll('#mlPresetDeck [data-preset]').forEach(function (button) { button.classList.toggle('active', button.dataset.preset === name); });
    parseDataset(); renderColumnControls(p.features || [], p.target || ''); updateTaskControls(); $('mlModel').value = p.model || 'compare';
    clearComputed('Example loaded. Run analysis to generate out-of-fold evidence.');
  }

  function configFromInputs() {
    const features = selectedFeatureIndices();
    if (!features.length) throw new Error('Select at least one numeric feature.');
    return {
      preset: state.preset, data: $('mlData').value, delimiter: $('mlDelimiter').value, missingPolicy: $('mlMissingPolicy').value,
      task: $('mlTask').value, model: $('mlModel').value, target: $('mlTarget').value === '' ? null : Number($('mlTarget').value), features: features,
      folds: Math.max(2, Math.floor(Number($('mlFolds').value) || 5)), repeats: Math.max(1,Math.min(20,Math.floor(Number($('mlRepeats').value)||5))), importanceRepeats: Math.max(1,Math.min(20,Math.floor(Number($('mlImportanceRepeats').value)||8))), nestedTune: $('mlNestedTune').checked, seed: Math.floor(Number($('mlSeed').value) || 1234),
      standardize: $('mlStandardize').checked, lambda: Math.max(0, Number($('mlLambda').value) || 0), neighbors: Math.max(1, Math.floor(Number($('mlNeighbors').value) || 5)),
      clusters: Math.max(2, Math.floor(Number($('mlClusters').value) || 3)), threshold: Math.min(0.99, Math.max(0.01, Number($('mlThreshold').value) || 0.5))
    };
  }

  function prepare(config) {
    const dataset = state.dataset || parseDataset();
    const required = config.features.map(function (index) { return { index: index, type: 'numeric', label: dataset.names[index] }; });
    if (config.task === 'regression' || config.task === 'classification') {
      if (!Number.isInteger(config.target)) throw new Error('Select a numeric target column.');
      if (config.features.indexOf(config.target) >= 0) throw new Error('The target cannot also be a feature. Remove it from the feature list.');
      required.push({ index: config.target, type: 'numeric', label: 'target' });
    }
    let prepared;
    if (config.missingPolicy === 'mean-impute' && Number.isInteger(config.target)) {
      const means = {};
      config.features.forEach(function (index) {
        const values = DATA.numericValues(dataset, index);
        means[index] = values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : NaN;
      });
      let dropped = 0; let imputed = 0; const rows = [];
      dataset.rows.forEach(function (sourceRow) {
        const row = sourceRow.cells.slice();
        const targetValue = row[config.target];
        if (!(typeof targetValue === 'number' && Number.isFinite(targetValue))) { dropped += 1; return; }
        let valid = true;
        config.features.forEach(function (index) {
          if (!(typeof row[index] === 'number' && Number.isFinite(row[index]))) {
            if (Number.isFinite(means[index])) { row[index] = means[index]; imputed += 1; }
            else valid = false;
          }
        });
        if (valid) rows.push({ index: sourceRow.index, cells: row }); else dropped += 1;
      });
      prepared = { rows: rows, dropped: dropped, imputed: imputed, policy: 'mean-impute-features-only', sourceRows: dataset.rowCount, usableRows: rows.length };
    } else prepared = DATA.prepareRows(dataset, required, config.missingPolicy);
    if (prepared.usableRows < 8) throw new Error('At least eight usable rows are required for this ML reference workflow.');
    const X = prepared.rows.map(function (row) { return config.features.map(function (index) { return Number(row.cells[index]); }); });
    const y = Number.isInteger(config.target) ? prepared.rows.map(function (row) { return Number(row.cells[config.target]); }) : null;
    return { dataset: dataset, prepared: prepared, X: X, y: y, featureNames: config.features.map(function (i) { return dataset.names[i]; }), targetName: Number.isInteger(config.target) ? dataset.names[config.target] : null };
  }

  function chooseBest(comparison, task) {
    const valid = comparison.filter(function (r) { return r.status === 'ok' && Number.isFinite(r.primary); });
    if (!valid.length) throw new Error('All candidate models failed. Inspect class balance, sample size and feature values.');
    valid.sort(function (a, b) { return task === 'regression' ? a.primary - b.primary : b.primary - a.primary; });
    return valid[0];
  }

  function run() {
    const started = performance.now(); $('mlProgress').style.width = '30%';
    try {
      parseDataset(); const config = configFromInputs(); const prep = prepare(config); let result;
      const pca = prep.featureNames.length >= 2 ? PCA.compute(prep.X, { standardize: true, featureNames: prep.featureNames }) : null;
      if (config.task === 'regression' || config.task === 'classification') {
        if (config.task === 'classification') {
          const values = Array.from(new Set(prep.y));
          if (values.length !== 2 || !prep.y.every(function (v) { return v === 0 || v === 1; })) throw new Error('Binary classification requires both target values 0 and 1. No silent recoding is performed.');
        }
        const cvConfig = { task: config.task, model: config.model === 'compare' ? (config.task === 'regression' ? 'ridge' : 'logistic') : config.model, folds: config.folds, seed: config.seed, standardize: config.standardize, lambda: config.lambda, neighbors: config.neighbors, threshold: config.threshold };
        const comparison = config.model === 'compare' ? ML.compareModels(prep.X, prep.y, cvConfig) : [];
        const selected = config.model === 'compare' ? chooseBest(comparison, config.task).model : config.model;
        cvConfig.model = selected;
        const tuneable = ['ridge','logistic','knn'].includes(selected);
        const cv = config.nestedTune && tuneable ? ML.nestedCrossValidate(prep.X, prep.y, Object.assign({},cvConfig,{innerFolds:Math.max(2,Math.min(5,config.folds-1))})) : ML.crossValidate(prep.X, prep.y, cvConfig);
        const repeated = ML.repeatedCrossValidate(prep.X, prep.y, cvConfig, config.repeats);
        const importance = ML.permutationImportanceRepeated(prep.X, prep.y, cvConfig, config.importanceRepeats);
        const learning = ML.learningCurve(prep.X, prep.y, cvConfig);
        const audit = ML.datasetAudit(prep.X, prep.y, prep.featureNames, config.task);
        result = { type: 'supervised', task: config.task, selectedModel: selected, comparison: comparison, cv: cv, repeated: repeated, importance: importance.values, learning: learning, audit: audit, pca: pca, config: config, prep: prep };
      } else if (config.task === 'clustering') {
        const scaler = config.standardize ? ML.fitStandardizer(prep.X) : null; const X = scaler ? ML.transformStandardizer(prep.X, scaler) : prep.X;
        const fit = ML.kmeans(X, config.clusters, config.seed); const sil = ML.silhouette(X, fit.labels); const elbow = ML.kmeansElbow(X, Math.min(9, Math.max(4, config.clusters + 3)), config.seed);
        result = { type: 'clustering', task: 'clustering', fit: fit, silhouette: sil, elbow: elbow, X: X, scaler: scaler, pca: pca, audit: ML.datasetAudit(prep.X,null,prep.featureNames,'clustering'), config: config, prep: prep };
      } else {
        if (!pca) throw new Error('PCA requires at least two selected numeric features.'); result = { type: 'pca', task: 'pca', pca: pca, audit: ML.datasetAudit(prep.X,null,prep.featureNames,'pca'), config: config, prep: prep };
      }
      state.result = result; state.runtime = performance.now() - started; renderResult();
      $('mlStatus').textContent = 'Computed. Inspect fold variability, diagnostics and scientific boundaries.'; $('mlProgress').style.width = '100%'; setTimeout(function () { $('mlProgress').style.width = '0%'; }, 350);
    } catch (error) {
      state.result = null; $('mlStatus').textContent = error.message; $('mlTopStatus').textContent = 'Failed'; $('mlDiagnostics').classList.remove('empty'); $('mlDiagnostics').textContent = error.message; $('mlProgress').style.width = '0%';
    }
  }

  function availablePlots(result) {
    if (!result) return [];
    let plots;
    if (result.type === 'supervised' && result.task === 'regression') plots = ['prediction','residual','cv','repeat-cv','learning','importance','audit'];
    else if (result.type === 'supervised') plots = ['roc','pr','confusion','calibration','classification','cv','repeat-cv','learning','importance','audit'];
    else if (result.type === 'clustering') plots = ['clusters','silhouette','elbow','audit'];
    else plots = ['audit'];
    if (result.pca) plots = plots.concat(['pca','explained','loadings']);
    return plots;
  }

  function defaultPlots(result) {
    if (result.type === 'supervised' && result.task === 'regression') return ['prediction','residual', result.pca ? 'pca' : 'cv'];
    if (result.type === 'supervised') return ['roc','pr', result.pca ? 'pca' : 'calibration'];
    if (result.type === 'clustering') return ['clusters','silhouette', result.pca ? 'pca' : 'elbow'];
    return ['pca','explained','loadings'];
  }

  function populatePlotSelectors() {
    const allowed = availablePlots(state.result); const defs = defaultPlots(state.result); const used = new Set();
    ['left','right'].forEach(function (side, i) {
      const select = $(side + 'MlPlotType'); const previous = state.plotTypes[side];
      select.innerHTML = allowed.map(function (key) { return '<option value="' + key + '">' + escapeHtml(PLOTS[key].label) + '</option>'; }).join('');
      let desired = allowed.indexOf(previous) >= 0 && !used.has(previous) ? previous : defs[i % defs.length];
      if (!allowed.includes(desired) || used.has(desired)) desired = allowed.find(function (key) { return !used.has(key); }) || allowed[0];
      state.plotTypes[side] = desired; if (desired) used.add(desired); select.value = desired || '';
    });
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('ml');
}

  function selectDistinctPlot(side, requested) {
    const old = state.plotTypes[side];
    const other = ['left','right'].find(function (candidate) { return candidate !== side && state.plotTypes[candidate] === requested; });
    if (other && old && old !== requested) {
      state.plotTypes[other] = old; $(other + 'MlPlotType').value = old;
    }
    state.plotTypes[side] = requested; $(side + 'MlPlotType').value = requested; state.lastPlotSide = side;
    renderVisiblePlots();
  }

  function plotLayout(title, x, y) { return { title: { text: title, font: { size: 14 } }, margin: { t: 48, r: 24, b: 56, l: 62 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', xaxis: { title: x, zeroline: false }, yaxis: { title: y, zeroline: false }, legend: { orientation: 'h', y: -0.2 } }; }

  function renderPlot(side) {
    const result = state.result; if (!result || !root.Plotly) return Promise.resolve();
    const kind = state.plotTypes[side]; const host = $(side + 'MlPlot'); const meta = PLOTS[kind];
    if (!host || host.offsetParent === null) return Promise.resolve();
    $(side + 'MlPlotTitle').textContent = meta.label; $(side + 'MlPlotEvidence').textContent = meta.evidence; host.innerHTML = '';
    let traces = []; let layout = plotLayout(meta.label, '', '');
    if (kind === 'pca' || kind === 'explained' || kind === 'loadings') {
      const p = result.pca;
      if (!p) throw new Error('PCA is unavailable because fewer than two numeric features were selected.');
      if (kind === 'pca') {
        const marker = { size: 8, opacity: 0.78 };
        if (result.type === 'supervised') { marker.color = result.prep.y; marker.colorscale = 'Viridis'; marker.showscale = true; marker.colorbar = { title: result.prep.targetName || 'target' }; }
        else if (result.type === 'clustering') { marker.color = result.fit.labels; marker.colorscale = 'Viridis'; marker.showscale = false; }
        traces = [{ x: p.scores.map(function (r) { return r[0]; }), y: p.scores.map(function (r) { return r[1]; }), mode: 'markers', type: 'scatter', marker: marker, text: p.scores.map(function (_, i) { return 'row ' + (i + 1); }), name: 'rows' }];
        layout = plotLayout(meta.label + ' · ' + fmt(100 * p.explainedVarianceRatio[0], 1) + '% + ' + fmt(100 * p.explainedVarianceRatio[1], 1) + '%', 'PC1 score', 'PC2 score');
      } else if (kind === 'explained') {
        traces = [{ x: p.explainedVarianceRatio.map(function (_, i) { return 'PC' + (i + 1); }), y: p.explainedVarianceRatio, type: 'bar', name: 'variance fraction' }, { x: p.cumulativeExplained.map(function (_, i) { return 'PC' + (i + 1); }), y: p.cumulativeExplained, mode: 'lines+markers', name: 'cumulative', yaxis: 'y2' }];
        layout = plotLayout(meta.label, 'component', 'variance fraction'); layout.yaxis.range = [0, 1]; layout.yaxis2 = { title: 'cumulative fraction', overlaying: 'y', side: 'right', range: [0, 1] };
      } else {
        const count = Math.min(5, p.components.length);
        traces = [{ z: p.components.slice(0, count), x: p.featureNames, y: Array.from({ length: count }, function (_, i) { return 'PC' + (i + 1); }), type: 'heatmap', colorscale: 'RdBu', zmid: 0, colorbar: { title: 'loading' } }];
        layout = plotLayout(meta.label, 'feature', 'component');
      }
    } else if (result.type === 'supervised') {
      const cv = result.cv; const y = result.prep.y; const pred = cv.predictions;
      if (kind === 'prediction') { traces = [{ x: y, y: pred, mode: 'markers', type: 'scatter', name: 'out-of-fold' }, { x: [Math.min.apply(null,y), Math.max.apply(null,y)], y: [Math.min.apply(null,y), Math.max.apply(null,y)], mode: 'lines', name: 'identity' }]; layout = plotLayout(meta.label, 'observed', 'predicted'); }
      else if (kind === 'residual') { traces = [{ x: pred, y: cv.aggregate.residuals, mode: 'markers', type: 'scatter', name: 'residual' }, { x: [Math.min.apply(null,pred),Math.max.apply(null,pred)], y:[0,0], mode:'lines', name:'zero' }]; layout = plotLayout(meta.label, 'predicted', 'observed − predicted'); }
      else if (kind === 'cv') { const vals = cv.folds.map(function (f) { return result.task === 'regression' ? f.metric.rmse : f.metric.balancedAccuracy; }); traces = [{ x: cv.folds.map(function (f) { return 'Fold ' + f.fold; }), y: vals, type: 'bar', name: result.task === 'regression' ? 'RMSE' : 'balanced accuracy' }]; layout = plotLayout(meta.label, 'fold', result.task === 'regression' ? 'RMSE (lower is better)' : 'balanced accuracy'); }
      else if (kind === 'learning') { const ok = result.learning.filter(function (o) { return o.status === 'ok'; }); traces = [{ x: ok.map(function (o) { return o.n; }), y: ok.map(function (o) { return o.score; }), mode: 'lines+markers', type: 'scatter', name: result.task === 'regression' ? 'CV RMSE' : 'CV balanced accuracy' }]; layout = plotLayout(meta.label, 'training rows', result.task === 'regression' ? 'RMSE' : 'balanced accuracy'); }
      else if (kind === 'importance') { traces = [{ x: result.importance.map(function (o) { return o.importance; }), y: result.importance.map(function (o) { return result.prep.featureNames[o.feature]; }), orientation: 'h', type: 'bar', name: 'score deterioration' }]; layout = plotLayout(meta.label, 'performance deterioration after permutation', 'feature'); }
      else if (kind === 'roc') { const roc = cv.aggregate.roc; traces = [{ x: roc.points.map(function (o) { return o.fpr; }), y: roc.points.map(function (o) { return o.tpr; }), mode: 'lines', type: 'scatter', name: 'AUC ' + fmt(roc.auc) }, { x:[0,1],y:[0,1],mode:'lines',name:'chance' }]; layout = plotLayout(meta.label, 'false-positive rate', 'true-positive rate'); layout.xaxis.range=[0,1]; layout.yaxis.range=[0,1]; }
      else if (kind === 'pr') { const pr = cv.aggregate.pr; traces = [{ x: pr.points.map(function (o) { return o.recall; }), y: pr.points.map(function (o) { return o.precision; }), mode: 'lines', type: 'scatter', name: 'area ' + fmt(pr.auc) }]; layout = plotLayout(meta.label, 'recall', 'precision'); layout.xaxis.range=[0,1]; layout.yaxis.range=[0,1]; }
      else if (kind === 'confusion') { const m=cv.aggregate; traces=[{z:[[m.tn,m.fp],[m.fn,m.tp]],x:['predicted 0','predicted 1'],y:['observed 0','observed 1'],type:'heatmap',text:[[m.tn,m.fp],[m.fn,m.tp]],texttemplate:'%{text}',colorscale:'Blues',showscale:false}]; layout=plotLayout(meta.label,'prediction','observation'); }
      else if (kind === 'calibration') { const c=cv.aggregate.calibration; traces=[{x:c.map(function(o){return o.predicted;}),y:c.map(function(o){return o.observed;}),text:c.map(function(o){return 'n='+o.n;}),mode:'lines+markers',type:'scatter',name:'out-of-fold bins'},{x:[0,1],y:[0,1],mode:'lines',name:'ideal'}]; layout=plotLayout(meta.label,'mean predicted probability','observed event fraction'); layout.xaxis.range=[0,1]; layout.yaxis.range=[0,1]; }
      else if (kind === 'classification') { const X=result.prep.X; traces=[{x:X.map(function(r){return r[0];}),y:X.map(function(r){return r[1]||0;}),mode:'markers',type:'scatter',marker:{color:y,colorscale:'Viridis'},text:pred.map(function(p,i){return 'observed='+y[i]+' p='+fmt(p);}),name:'observations'}]; layout=plotLayout(meta.label,result.prep.featureNames[0],result.prep.featureNames[1]||'constant display axis'); }
      else if (kind === 'audit') { const a=result.audit; const labels=['duplicates','near-zero variance','ID-like','high-correlation pairs','direct leakage']; const values=[a.duplicates,a.nearZeroVariance.length,a.identifierLike.length,a.highCorrelation.length,a.directLeakage.length]; traces=[{x:labels,y:values,type:'bar',name:'audit flags'}]; layout=plotLayout(meta.label,'screening diagnostic','count'); }
    } else if (result.type === 'clustering') {
      if (kind === 'clusters') { traces=[{x:result.X.map(function(r){return r[0];}),y:result.X.map(function(r){return r[1]||0;}),mode:'markers',type:'scatter',marker:{color:result.fit.labels,colorscale:'Viridis'},name:'rows'},{x:result.fit.centroids.map(function(r){return r[0];}),y:result.fit.centroids.map(function(r){return r[1]||0;}),mode:'markers',type:'scatter',marker:{symbol:'diamond',size:13},name:'centroids'}]; layout=plotLayout(meta.label,result.prep.featureNames[0],result.prep.featureNames[1]||'second display axis'); }
      else if (kind === 'silhouette') { traces=[{x:result.silhouette.values.map(function(_,i){return i+1;}),y:result.silhouette.values,type:'bar',name:'silhouette'}]; layout=plotLayout(meta.label,'row','silhouette'); layout.yaxis.range=[-1,1]; }
      else if (kind === 'elbow') { traces=[{x:result.elbow.map(function(o){return o.k;}),y:result.elbow.map(function(o){return o.inertia;}),mode:'lines+markers',type:'scatter',name:'inertia',yaxis:'y'},{x:result.elbow.map(function(o){return o.k;}),y:result.elbow.map(function(o){return o.silhouette;}),mode:'lines+markers',type:'scatter',name:'silhouette',yaxis:'y2'}]; layout=plotLayout(meta.label,'k','within-cluster SSE'); layout.yaxis2={title:'silhouette',overlaying:'y',side:'right',range:[-1,1]}; }
      else if (kind === 'audit') { const a=result.audit; traces=[{x:['duplicates','near-zero variance','ID-like','high-correlation pairs'],y:[a.duplicates,a.nearZeroVariance.length,a.identifierLike.length,a.highCorrelation.length],type:'bar',name:'audit flags'}]; layout=plotLayout(meta.label,'screening diagnostic','count'); }
    } else if (kind === 'audit') { const a=result.audit; traces=[{x:['duplicates','near-zero variance','ID-like','high-correlation pairs'],y:[a.duplicates,a.nearZeroVariance.length,a.identifierLike.length,a.highCorrelation.length],type:'bar',name:'audit flags'}]; layout=plotLayout(meta.label,'screening diagnostic','count'); }
    else { throw new Error('The selected ML plot is incompatible with the current result.'); }
    return PLOT.render(host,traces,layout,{responsive:true,displaylogo:false}).then(function (outcome) {
      if (outcome && outcome.error) $('mlStatus').textContent = 'The numerical result exists, but one plot failed to render. Inspect the reported error.';
      return outcome;
    });
  }

  function effectiveMlLayout() {
    return root.FokoLayoutStability.effectiveLayout(state.layout, { breakpoint: 1024, compatibleCount: 2 });
  }

  function visibleMlSides() {
    const grid = $('mlPlotGrid');
    if (!grid || grid.dataset.layout !== 'focus') return ['left', 'right'];
    return [state.focusSide === 'right' ? 'right' : 'left'];
  }

  function renderVisiblePlots() {
    if (!state.result) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { visibleMlSides().forEach(renderPlot); }); });
  }

  function applyMlLayout() {
    const grid = $('mlPlotGrid'); if (!grid) return null;
    const report = root.FokoLayoutStability.apply({
      grid: grid,
      preferred: state.layout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2
    });
    renderVisiblePlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('ml');
    return report;
  }

  function renderDiagnostics() {
    const r=state.result; let html='';
    if(r.type==='supervised'){
      const a=r.cv.aggregate; const comp=r.comparison.filter(function(o){return o.status==='ok';});
      html+='<table><tbody><tr><th>Selected model</th><td>'+escapeHtml(r.selectedModel)+'</td></tr><tr><th>Evaluation</th><td>'+r.cv.folds.length+'-fold out-of-fold predictions</td></tr>';
      if(r.task==='regression') html+='<tr><th>RMSE</th><td>'+fmt(a.rmse)+'</td></tr><tr><th>MAE</th><td>'+fmt(a.mae)+'</td></tr><tr><th>Out-of-fold R²</th><td>'+fmt(a.r2)+'</td></tr>';
      else html+='<tr><th>Balanced accuracy</th><td>'+fmt(a.balancedAccuracy)+'</td></tr><tr><th>F1</th><td>'+fmt(a.f1)+'</td></tr><tr><th>ROC AUC</th><td>'+fmt(a.roc.auc)+'</td></tr><tr><th>PR area</th><td>'+fmt(a.pr.auc)+'</td></tr><tr><th>Brier score</th><td>'+fmt(a.brier)+'</td></tr>';
      html+='<tr><th>Rows used</th><td>'+r.prep.prepared.usableRows+' of '+r.prep.prepared.sourceRows+'</td></tr><tr><th>Dropped / imputed</th><td>'+r.prep.prepared.dropped+' / '+r.prep.prepared.imputed+'</td></tr></tbody></table>';
      if(comp.length) html+='<p><b>Model comparison:</b> '+comp.map(function(o){return o.model+' = '+fmt(o.primary);}).join(' · ')+'</p>';
      html+='<h3>Data reliability audit</h3><p>'+(r.audit.warnings.length?r.audit.warnings.map(escapeHtml).join(' '):'No high-priority leakage or conditioning flag was detected by the finite screening audit.')+'</p>';
      if(r.pca) html+='<p><b>Supplementary PCA:</b> PC1 '+fmt(100*r.pca.explainedVarianceRatio[0],1)+'% · PC2 '+fmt(100*r.pca.explainedVarianceRatio[1],1)+'%. PCA is descriptive and is not used to estimate the reported validation score.</p>';
    } else if(r.type==='clustering') html='<table><tbody><tr><th>k</th><td>'+r.config.clusters+'</td></tr><tr><th>Inertia</th><td>'+fmt(r.fit.inertia)+'</td></tr><tr><th>Mean silhouette</th><td>'+fmt(r.silhouette.mean)+'</td></tr><tr><th>Iterations</th><td>'+r.fit.iterations+'</td></tr><tr><th>Rows used</th><td>'+r.prep.prepared.usableRows+'</td></tr></tbody></table><p><b>Supplementary PCA:</b> PC1 '+fmt(100*r.pca.explainedVarianceRatio[0],1)+'% · PC2 '+fmt(100*r.pca.explainedVarianceRatio[1],1)+'%. The k-means fit remains defined in the configured feature space, not in the two-dimensional display.</p>';
    else html='<table><tbody><tr><th>PC1 variance</th><td>'+fmt(r.pca.explainedVarianceRatio[0])+'</td></tr><tr><th>PC2 variance</th><td>'+fmt(r.pca.explainedVarianceRatio[1])+'</td></tr><tr><th>Rows used</th><td>'+r.prep.prepared.usableRows+'</td></tr><tr><th>Features</th><td>'+r.prep.featureNames.map(escapeHtml).join(', ')+'</td></tr></tbody></table>';
    $('mlDiagnostics').classList.remove('empty'); $('mlDiagnostics').innerHTML=html;
  }

  function renderResult() {
    const r=state.result; populatePlotSelectors(); applyMlLayout(); renderDiagnostics();
    $('mlTopStatus').textContent='Computed'; $('mlRuntime').textContent=fmt(state.runtime,1)+' ms'; $('mlRowsMetric').textContent=String(r.prep.prepared.usableRows); $('mlTaskMetric').textContent=r.task; $('mlModelMetric').textContent=r.type==='supervised'?r.selectedModel:(r.type==='clustering'?'k-means':'PCA');
    if(r.type==='supervised'&&r.task==='regression'){$('mlPrimary').textContent=fmt(r.cv.aggregate.rmse);$('mlPrimaryLabel').textContent='out-of-fold RMSE';$('mlSecondary').textContent=fmt(r.cv.aggregate.r2);$('mlSecondaryLabel').textContent='out-of-fold R²';}
    else if(r.type==='supervised'){$('mlPrimary').textContent=fmt(r.cv.aggregate.balancedAccuracy);$('mlPrimaryLabel').textContent='balanced accuracy';$('mlSecondary').textContent=fmt(r.cv.aggregate.roc.auc);$('mlSecondaryLabel').textContent='ROC AUC';}
    else if(r.type==='clustering'){$('mlPrimary').textContent=fmt(r.silhouette.mean);$('mlPrimaryLabel').textContent='mean silhouette';$('mlSecondary').textContent=fmt(r.fit.inertia);$('mlSecondaryLabel').textContent='inertia';}
    else {$('mlPrimary').textContent=fmt(r.pca.explainedVarianceRatio[0]);$('mlPrimaryLabel').textContent='PC1 variance';$('mlSecondary').textContent=fmt(r.pca.explainedVarianceRatio[1]);$('mlSecondaryLabel').textContent='PC2 variance';}
    $('mlQuality').textContent=String(r.prep.dataset.missingCells); $('mlResultKind').textContent=(r.type==='supervised'?'Out-of-fold '+r.task+' evidence':r.type==='clustering'?'Seeded k-means diagnostics':'Standardized PCA diagnostics');
    $('mlProvenanceStatus').textContent='Computed'; $('mlProvenanceEngine').textContent=r.pca?'FokoDataCore + FokoMLReference + FokoPCA':'FokoDataCore + FokoMLReference'; $('mlProvenanceMethod').textContent=r.type==='supervised'?(r.selectedModel+' · '+r.config.folds+' folds'):r.type==='clustering'?'seeded k-means':'standardized PCA'; $('mlProvenanceData').textContent=r.prep.prepared.usableRows+' usable rows · '+r.prep.featureNames.length+' features'; $('mlProvenanceClaim').textContent=r.type==='supervised'?'Internal cross-validated estimate only':'Exploratory unsupervised structure only'; $('mlProvenanceWarning').textContent='No causal, external-validity, global-optimality or natural-cluster claim is made.';
  }

  function clearComputed(message) {
    state.result=null; $('mlStatus').textContent=message; $('mlTopStatus').textContent='Ready'; $('mlRuntime').textContent='—'; $('mlRowsMetric').textContent='—'; $('mlTaskMetric').textContent='—'; $('mlModelMetric').textContent='—'; $('mlPrimary').textContent='—'; $('mlSecondary').textContent='—'; $('mlQuality').textContent=state.dataset?String(state.dataset.missingCells):'—'; $('mlDiagnostics').classList.add('empty'); $('mlDiagnostics').textContent='Run an analysis to see out-of-fold evidence, assumptions and warnings.';
    ['left','right'].forEach(function(side){PLOT.clear($(side+'MlPlot'),'Run the analysis to create a compatible plot.');});
  }

  function configForStorage(){const c=configFromInputs();c.targetName=Number.isInteger(c.target)&&state.dataset?state.dataset.names[c.target]:'';c.featureNames=state.dataset?c.features.map(function(i){return state.dataset.names[i];}):[];return c;}
  function applyStored(c){$('mlData').value=c.data||'';$('mlDelimiter').value=c.delimiter||'auto';$('mlMissingPolicy').value=c.missingPolicy||'analysis-complete';$('mlTask').value=c.task||'regression';parseDataset();renderColumnControls(c.featureNames||[],c.targetName||'');updateTaskControls();$('mlModel').value=c.model||'compare';$('mlFolds').value=c.folds||5;$('mlRepeats').value=c.repeats||5;$('mlImportanceRepeats').value=c.importanceRepeats||8;$('mlNestedTune').checked=c.nestedTune!==false;$('mlSeed').value=c.seed||1234;$('mlStandardize').checked=c.standardize!==false;$('mlLambda').value=c.lambda==null?1:c.lambda;$('mlNeighbors').value=c.neighbors||5;$('mlClusters').value=c.clusters||3;$('mlThreshold').value=c.threshold==null?0.5:c.threshold;clearComputed('Configuration restored. Run analysis to regenerate evidence.');}

  function exportPlot(side,format){const host=$(side+'MlPlot');if(!state.result||!root.Plotly||!host||!host.data)return;root.Plotly.downloadImage(host,{format:format||'png',filename:'fokolab-ml-'+state.plotTypes[side],height:760,width:1050,scale:1});}
  function resultJson(){return JSON.stringify({release:RELEASE,generated:new Date().toISOString(),config:configForStorage(),result:state.result},null,2);}
  function pythonScript(){const c=configForStorage();return '# Foko Lab v72.16 ML validation scaffold\n# Validate preprocessing and cross-validation in a production Python environment.\nimport io, pandas as pd\nfrom sklearn.model_selection import StratifiedKFold, KFold, cross_validate\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import Ridge, LogisticRegression\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.naive_bayes import GaussianNB\n\ncsv_data = '+JSON.stringify(c.data)+'\ndf = pd.read_csv(io.StringIO(csv_data))\nfeatures = '+JSON.stringify(c.featureNames)+'\ntarget = '+JSON.stringify(c.targetName)+'\nX = df[features]\ny = df[target] if target else None\n# Fit scaling inside the pipeline and inside each fold; do not pre-scale the full dataset.\n';}

  function bind() {
    renderPresetLibrary(); const requested = new URL(location.href).searchParams.get('example'); loadPreset(requested && PRESETS[requested] ? requested : state.preset);
    $('mlPresetSelect').addEventListener('change',function(){loadPreset(this.value);}); $('mlPresetDeck').addEventListener('click',function(e){const b=e.target.closest('[data-preset]');if(b)loadPreset(b.dataset.preset);});
    $('mlParseData').addEventListener('click',function(){try{parseDataset();clearComputed('Data parsed. Run analysis to compute evidence.');}catch(error){$('mlStatus').textContent=error.message;}});
    $('mlUpload').addEventListener('change',function(){const file=this.files&&this.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(){ $('mlData').value=String(reader.result||'');parseDataset();clearComputed('Local file loaded. Run analysis to compute evidence.');};reader.readAsText(file);});
    $('mlTask').addEventListener('change',function(){updateTaskControls();clearComputed('Task changed. Run analysis to recompute compatible evidence.');}); $('mlRun').addEventListener('click',run); $('mlReset').addEventListener('click',function(){loadPreset(state.preset);});
    ['left','right'].forEach(function(side){$(side+'MlPlotType').addEventListener('change',function(){selectDistinctPlot(side,this.value);});});
    document.querySelectorAll('[data-layout-mode]').forEach(function(button){button.addEventListener('click',function(){state.layout=this.dataset.layoutMode;applyMlLayout();});});
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function(button){button.addEventListener('click',function(){state.focusSide=this.dataset.focusSide;state.lastPlotSide=state.focusSide;state.layout='focus';applyMlLayout();});});
    window.addEventListener('resize', applyMlLayout);
    document.querySelectorAll('[data-export-side]').forEach(function(button){button.addEventListener('click',function(){exportPlot(this.dataset.exportSide,'png');});}); $('exportMlPng').addEventListener('click',function(){exportPlot(state.lastPlotSide,'png');}); $('exportMlSvg').addEventListener('click',function(){exportPlot(state.lastPlotSide,'svg');});
    $('saveMlSession').addEventListener('click',function(){localStorage.setItem(STORAGE_KEY,JSON.stringify(configForStorage()));$('mlStatus').textContent='Configuration saved locally. Computed evidence is not persisted.';}); $('restoreMlSession').addEventListener('click',function(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return $('mlStatus').textContent='No saved ML configuration exists.';applyStored(JSON.parse(raw));}); $('copyMlShareUrl').addEventListener('click',function(){const url=new URL(location.href);url.searchParams.set('state',encodeState(configForStorage()));navigator.clipboard.writeText(url.toString());$('mlStatus').textContent='Share URL copied. It contains configuration and data, not computed claims.';});
    $('exportMlJson').addEventListener('click',function(){if(state.result)download('fokolab-ml-result.json',resultJson(),'application/json');}); $('exportMlPython').addEventListener('click',function(){download('fokolab-ml-validation.py',pythonScript(),'text/x-python');}); $('exportMlData').addEventListener('click',function(){download('fokolab-ml-data.csv',$('mlData').value,'text/csv');});
    const encoded=new URL(location.href).searchParams.get('state');if(encoded){try{applyStored(decodeState(encoded));}catch(error){$('mlStatus').textContent='The share URL state is invalid: '+error.message;}}
    document.querySelectorAll('[data-jump]').forEach(function(button){button.addEventListener('click',function(){const target=document.querySelector(this.dataset.jump);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('[data-jump]').forEach(function(b){b.classList.toggle('active',b===button);});});});
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})(typeof window !== 'undefined' ? window : globalThis);
