/* Foko Lab v72.4 Statistics workspace controller.
 * Authored layout only. Data preparation and statistical computation are delegated
 * to pure FokoDataCore and FokoStatistics functions.
 */
(function (root) {
  'use strict';

  const DATA = root.FokoDataCore;
  const STATS = root.FokoStatistics;
  const PCA = root.FokoPCA;
  const PRESETS = root.FokoStatisticsPresets || {};
  if (!DATA || !STATS || !PCA) throw new Error('Statistics Lab requires FokoDataCore, FokoStatistics and FokoPCA.');
  const STORAGE_KEY = 'fokolab:v72:statistics-session';
  const LAYOUT_KEY = 'fokolab:v72:statistics-layout';
  const PLOT_SIDES = ['left', 'right'];
  const LAYOUTS = new Set(['two', 'focus']);

  const state = {
    currentName: Object.keys(PRESETS)[0] || '',
    dataset: null,
    result: null,
    layout: 'two',
    focusSide: 'left',
    plotTypes: { left: '', right: '' },
    desiredRoles: null,
    exampleFamily: 'all',
  };

  function $(id) { return document.getElementById(id); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function safeParse(text) { try { return JSON.parse(text); } catch (_) { return null; } }
  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }
  function finite(value) { return Number.isFinite(Number(value)); }
  function fmt(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const d = digits == null ? 4 : digits;
    if ((Math.abs(number) >= 10000 || (Math.abs(number) < 0.001 && number !== 0))) return number.toExponential(Math.min(4, d));
    return Number(number.toFixed(d)).toString();
  }
  function pFmt(value) {
    const p = Number(value);
    if (!Number.isFinite(p)) return '—';
    if (p < 0.0001) return '<0.0001';
    return p.toFixed(4);
  }
  function quantile(values, p) {
    const sorted = values.filter(Number.isFinite).slice().sort(function (a, b) { return a - b; });
    if (!sorted.length) return NaN;
    const position = (sorted.length - 1) * p;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  }
  function lcg(seed) {
    let current = (Number(seed) >>> 0) || 123456789;
    return function () { current = (1664525 * current + 1013904223) >>> 0; return current / 4294967296; };
  }
  function bootstrapMeans(values, reps, seed) {
    const random = lcg(seed);
    const means = [];
    for (let r = 0; r < reps; r += 1) {
      let sum = 0;
      for (let i = 0; i < values.length; i += 1) sum += values[Math.floor(random() * values.length)];
      means.push(sum / values.length);
    }
    return means;
  }
  function hedgesG(a, b) {
    const na = a.length;
    const nb = b.length;
    const va = STATS.variance(a);
    const vb = STATS.variance(b);
    const pooled = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / Math.max(1, na + nb - 2));
    if (!pooled) return 0;
    const d = (STATS.mean(a) - STATS.mean(b)) / pooled;
    const correction = 1 - 3 / Math.max(4, 4 * (na + nb) - 9);
    return d * correction;
  }
  function groupMeanIntervals(groups, alpha) {
    const result = [];
    Object.keys(groups).forEach(function (name) {
      const values = groups[name];
      const n = values.length;
      const mean = STATS.mean(values);
      const se = STATS.sem(values);
      const critical = n > 1 ? STATS.studentTinv(1 - alpha / 2, n - 1) : NaN;
      result.push({ name, n, mean, low: mean - critical * se, high: mean + critical * se });
    });
    return result;
  }
  function assumptionsFor(mode) {
    const map = {
      descriptive: 'Descriptions are sample summaries; no population inference is implied.',
      pca: 'PCA is a descriptive linear variance decomposition after standardization. It is sensitive to scaling, outliers, missing-data handling and the sampled population; components are not causal or mechanistic variables.',
      regression: 'Independent observations, linear mean structure, appropriate error model and stable variance are required for classical OLS inference.',
      correlation: 'Pearson correlation targets linear association and is sensitive to outliers; independence and an appropriate sampling design remain necessary.',
      welch: 'Independent groups and meaningful group assignment are required. Welch relaxes equal variances but not independence or measurement validity.',
      anova: 'Independent observations, meaningful groups and an appropriate within-group error model are required. The Kruskal–Wallis result is a sensitivity check, not a post-hoc analysis.',
      bootstrap: 'Observations are resampled as exchangeable units. Dependence, clustering or time structure require a different bootstrap design.',
      classification: 'Labels and scores must refer to the same independent cases. AUC and average precision are sample-specific discrimination summaries.',
      survival: 'Censoring must be appropriately represented and non-informative for standard Kaplan–Meier interpretation. Only two-group log-rank evidence is computed.',
      fdr: 'Input p-values must be valid for their tests. Benjamini–Hochberg control depends on the testing and dependence structure.',
      spc: 'The center and limits are estimated from the supplied series. Temporal dependence, drift and subgroup design are not modeled automatically.',
    };
    return map[mode] || 'Statistical interpretation remains conditional on assumptions and data quality.';
  }

  function delimiterValue() {
    const value = $('statisticsDelimiter').value;
    return value === '\\t' ? '\t' : value;
  }

  function parseDatasetFromEditor(updateSelectors) {
    const dataset = DATA.parseDataset($('statisticsData').value, { delimiter: delimiterValue(), header: 'auto' });
    state.dataset = dataset;
    renderDataSummary(dataset);
    if (updateSelectors !== false) renderColumnSelectors(dataset, state.desiredRoles);
    return dataset;
  }

  function renderDataSummary(dataset) {
    const numeric = dataset.columns.filter(function (column) { return column.type === 'numeric'; }).length;
    const categorical = dataset.columnCount - numeric;
    $('statisticsDataSummary').innerHTML = `<b>${dataset.rowCount}</b> rows · <b>${dataset.columnCount}</b> columns · <b>${numeric}</b> numeric · <b>${categorical}</b> categorical · <b>${dataset.missingCells}</b> missing cells · delimiter <code>${dataset.delimiter === '\t' ? 'tab' : escapeHtml(dataset.delimiter)}</code>`;
  }

  function findColumnIndex(dataset, preferred, fallback, numericOnly) {
    if (preferred) {
      const exact = dataset.names.findIndex(function (name) { return name === preferred; });
      if (exact >= 0 && (!numericOnly || dataset.columns[exact].type === 'numeric')) return exact;
    }
    const fallbackIndex = dataset.names.findIndex(function (name) { return name === fallback; });
    if (fallbackIndex >= 0 && (!numericOnly || dataset.columns[fallbackIndex].type === 'numeric')) return fallbackIndex;
    if (numericOnly) {
      const firstNumeric = dataset.columns.find(function (column) { return column.type === 'numeric'; });
      return firstNumeric ? firstNumeric.index : 0;
    }
    return 0;
  }

  function renderColumnSelectors(dataset, roles) {
    const options = dataset.columns.map(function (column) {
      return `<option value="${column.index}">${escapeHtml(column.name)} · ${column.type}${column.missing ? ` · ${column.missing} missing` : ''}</option>`;
    }).join('');
    ['statisticsX', 'statisticsY', 'statisticsGroup', 'statisticsEvent'].forEach(function (id) { $(id).innerHTML = options; });
    const desired = roles || {};
    $('statisticsX').value = String(findColumnIndex(dataset, desired.x, 'x', true));
    $('statisticsY').value = String(findColumnIndex(dataset, desired.y, 'y', true));
    $('statisticsGroup').value = String(findColumnIndex(dataset, desired.group, 'group', false));
    $('statisticsEvent').value = String(findColumnIndex(dataset, desired.event, 'event', true));
    state.desiredRoles = null;
  }

  function renderPresetLibrary() {
    const allNames = Object.keys(PRESETS);
    const familyNode = $('statisticsFamilyFilter');
    const families = Array.from(new Set(allNames.map(function (name) { return PRESETS[name].category || PRESETS[name].family || 'Other'; }))).sort();
    if (familyNode) {
      const selected = families.includes(state.exampleFamily) ? state.exampleFamily : 'all';
      familyNode.innerHTML = '<option value="all">All families</option>' + families.map(function (family) {
        return `<option value="${escapeHtml(family)}">${escapeHtml(family)}</option>`;
      }).join('');
      familyNode.value = selected;
      state.exampleFamily = selected;
    }
    const names = allNames.filter(function (name) {
      const preset = PRESETS[name];
      return state.exampleFamily === 'all' || (preset.category || preset.family || 'Other') === state.exampleFamily;
    });
    $('statisticsSelect').innerHTML = names.map(function (name) {
      const preset = PRESETS[name];
      return `<option value="${escapeHtml(name)}">${escapeHtml(preset.title)}</option>`;
    }).join('');
    $('statisticsDeck').innerHTML = names.map(function (name) {
      const preset = PRESETS[name];
      const meta = `${preset.level || 'Reference'} · ${preset.category || preset.family || 'Other'}`;
      return `<button class="${name === state.currentName ? 'active' : ''}" data-preset="${escapeHtml(name)}" type="button"><b>${escapeHtml(preset.title)}</b><small>${escapeHtml(preset.family)}</small><span class="preset-meta">${escapeHtml(meta)}</span></button>`;
    }).join('');
    if ($('statisticsExampleCount')) $('statisticsExampleCount').textContent = `${names.length} of ${allNames.length} examples`;
    if (PRESETS[state.currentName] && names.includes(state.currentName)) $('statisticsSelect').value = state.currentName;
    else if (names.length) $('statisticsSelect').value = names[0];
  }

  function loadPreset(name, recompute) {
    const preset = PRESETS[name] || PRESETS[Object.keys(PRESETS)[0]];
    if (!preset) throw new Error('No Statistics preset is available.');
    state.currentName = Object.keys(PRESETS).find(function (key) { return PRESETS[key] === preset; }) || name;
    state.desiredRoles = { x: preset.x, y: preset.y, group: preset.group, event: preset.event };
    $('statisticsData').value = preset.data;
    $('statisticsMode').value = preset.mode;
    $('statisticsNarrative').textContent = preset.narrative;
    $('statisticsScientificNote').textContent = preset.scientificNote;
    $('statisticsDelimiter').value = 'auto';
    renderPresetLibrary();
    parseDatasetFromEditor(true);
    clearComputedEvidence('Example loaded. Run the analysis to generate statistical evidence.');
    if (recompute) runStatistics();
  }

  function currentConfig() {
    return {
      version: '77.4.1',
      example: state.currentName,
      data: $('statisticsData').value,
      delimiter: $('statisticsDelimiter').value,
      missingPolicy: $('statisticsMissingPolicy').value,
      mode: $('statisticsMode').value,
      x: Number($('statisticsX').value),
      y: Number($('statisticsY').value),
      group: Number($('statisticsGroup').value),
      event: Number($('statisticsEvent').value),
      alpha: Number($('statisticsAlpha').value),
      bootstrapReps: Number($('statisticsBootstrapReps').value),
      seed: Number($('statisticsSeed').value),
      bins: Number($('statisticsBins').value),
      layout: state.layout,
      focusSide: state.focusSide,
      plotTypes: clone(state.plotTypes),
    };
  }

  function validateSettings(config) {
    if (!(config.alpha > 0 && config.alpha < 0.5)) throw new Error('Significance α must be between 0 and 0.5.');
    if (!Number.isInteger(config.bootstrapReps) || config.bootstrapReps < 100 || config.bootstrapReps > 20000) throw new Error('Bootstrap resamples must be an integer from 100 to 20,000.');
    if (!Number.isInteger(config.bins) || config.bins < 5 || config.bins > 100) throw new Error('Histogram bins must be an integer from 5 to 100.');
  }

  function computeResult(dataset, config) {
    const started = performance.now();
    const warnings = [];
    const summaries = dataset.columns.filter(function (column) { return column.type === 'numeric'; }).map(function (column) {
      return Object.assign({ column: column.name, index: column.index, missing: column.missing }, STATS.describe(DATA.numericValues(dataset, column.index)));
    });
    const result = {
      release: '77.4.1',
      mode: config.mode,
      method: '',
      dataset,
      config,
      summaries,
      warnings,
      assumptions: assumptionsFor(config.mode),
      usableRows: dataset.rowCount,
      dropped: 0,
      imputed: 0,
      primary: { label: '—', value: '—' },
      uncertainty: { label: '—', value: '—' },
      effect: { label: '—', value: '—' },
    };

    if (!summaries.length) throw new Error('The dataset contains no fully numeric column.');

    if (config.mode === 'descriptive') {
      result.method = 'Per-column descriptive summaries';
      result.primary = { label: `mean(${summaries[0].column})`, value: summaries[0].mean };
      result.uncertainty = { label: 'standard error', value: summaries[0].sem };
      result.effect = { label: 'numeric columns', value: summaries.length };
    } else if (config.mode === 'pca') {
      const numericColumns = dataset.columns.filter(function (column) { return column.type === 'numeric'; });
      if (numericColumns.length < 2) throw new Error('PCA requires at least two numeric columns.');
      const required = numericColumns.map(function (column) { return { index: column.index, type: 'numeric', label: column.name }; });
      const prepared = DATA.prepareRows(dataset, required, config.missingPolicy);
      if (prepared.usableRows < 3) throw new Error('PCA requires at least three usable rows after missing-data handling.');
      const matrix = prepared.rows.map(function (row) { return numericColumns.map(function (column) { return Number(row.cells[column.index]); }); });
      result.prepared = prepared;
      result.pca = PCA.compute(matrix, { standardize: true, featureNames: numericColumns.map(function (column) { return column.name; }) });
      result.pcaRowIndices = prepared.rows.map(function (row) { return row.index; });
      result.method = 'Standardized principal-component analysis';
      result.usableRows = prepared.usableRows; result.dropped = prepared.dropped; result.imputed = prepared.imputed;
      result.primary = { label: 'PC1 variance fraction', value: result.pca.explainedVarianceRatio[0] };
      result.uncertainty = { label: 'PC1+PC2 cumulative fraction', value: result.pca.cumulativeExplained[1] || result.pca.cumulativeExplained[0] };
      result.effect = { label: 'numeric features', value: numericColumns.length };
      result.pca.warnings.forEach(function (warning) { warnings.push(warning); });
      warnings.push('PCA is exploratory. Component signs are arbitrary and component stability is not assessed by resampling.');
    } else if (config.mode === 'regression') {
      const pair = DATA.pairedNumeric(dataset, config.x, config.y, config.missingPolicy);
      if (pair.usableRows < 3) throw new Error('OLS regression requires at least three usable X/Y pairs.');
      result.prepared = pair;
      result.regression = STATS.olsInfluence(pair.x, pair.y);
      result.bands = STATS.olsBands(pair.x, pair.y, config.alpha);
      result.method = 'Simple ordinary least squares';
      result.usableRows = pair.usableRows; result.dropped = pair.dropped; result.imputed = pair.imputed;
      result.primary = { label: 'slope', value: result.regression.slope };
      result.uncertainty = { label: 'p(slope)', value: result.regression.pSlope };
      result.effect = { label: 'R²', value: result.regression.r2 };
      if (pair.usableRows < 10) warnings.push('Very small regression sample; classical interval and p-value approximations are fragile.');
    } else if (config.mode === 'correlation') {
      const pair = DATA.pairedNumeric(dataset, config.x, config.y, config.missingPolicy);
      if (pair.usableRows < 3) throw new Error('Pearson correlation requires at least three usable pairs.');
      result.prepared = pair;
      result.correlationTest = STATS.corTest(pair.x, pair.y);
      const correlationIndices = summaries.map(function (summary) { return summary.index; });
      result.correlationMatrix = DATA.pairwiseCorrelationMatrix(dataset, correlationIndices, STATS.correlation);
      result.correlationNames = summaries.map(function (summary) { return summary.column; });
      result.method = 'Pearson product-moment correlation';
      result.usableRows = pair.usableRows; result.dropped = pair.dropped; result.imputed = pair.imputed;
      result.primary = { label: 'r', value: result.correlationTest.r };
      result.uncertainty = { label: 'p(r)', value: result.correlationTest.p };
      result.effect = { label: '|r|', value: Math.abs(result.correlationTest.r) };
    } else if (config.mode === 'welch') {
      const grouped = DATA.groupedNumeric(dataset, config.group, config.y, config.missingPolicy);
      const names = Object.keys(grouped.groups);
      if (names.length !== 2) throw new Error(`Welch comparison requires exactly two non-missing groups; found ${names.length}.`);
      if (grouped.groups[names[0]].length < 2 || grouped.groups[names[1]].length < 2) throw new Error('Each Welch group requires at least two observations.');
      result.prepared = grouped; result.groups = grouped.groups; result.groupNames = names;
      result.welch = STATS.welchT(grouped.groups[names[0]], grouped.groups[names[1]]);
      result.hedgesG = hedgesG(grouped.groups[names[0]], grouped.groups[names[1]]);
      result.groupIntervals = groupMeanIntervals(grouped.groups, config.alpha);
      result.method = 'Welch two-sample t-test';
      result.usableRows = grouped.usableRows; result.dropped = grouped.dropped; result.imputed = grouped.imputed;
      result.primary = { label: `${names[0]} − ${names[1]}`, value: result.welch.difference };
      result.uncertainty = { label: 'two-sided p', value: result.welch.p };
      result.effect = { label: 'Hedges g', value: result.hedgesG };
    } else if (config.mode === 'anova') {
      const grouped = DATA.groupedNumeric(dataset, config.group, config.y, config.missingPolicy);
      const names = Object.keys(grouped.groups);
      if (names.length < 2) throw new Error('One-way ANOVA requires at least two groups.');
      if (names.some(function (name) { return grouped.groups[name].length < 2; })) throw new Error('Each ANOVA group requires at least two observations.');
      result.prepared = grouped; result.groups = grouped.groups; result.groupNames = names;
      result.anova = STATS.anovaOneWay(names.map(function (name) { return grouped.groups[name]; }));
      result.kruskal = STATS.kruskalWallis(names.map(function (name) { return grouped.groups[name]; }));
      const totalSS = result.anova.ssBetween + result.anova.ssWithin;
      result.etaSquared = totalSS ? result.anova.ssBetween / totalSS : 0;
      result.groupIntervals = groupMeanIntervals(grouped.groups, config.alpha);
      result.method = 'One-way ANOVA with Kruskal–Wallis sensitivity check';
      result.usableRows = grouped.usableRows; result.dropped = grouped.dropped; result.imputed = grouped.imputed;
      result.primary = { label: 'F', value: result.anova.F };
      result.uncertainty = { label: 'ANOVA p', value: result.anova.p };
      result.effect = { label: 'η²', value: result.etaSquared };
      warnings.push('No pairwise post-hoc comparison is computed; the omnibus result does not identify differing groups.');
    } else if (config.mode === 'bootstrap') {
      const prepared = DATA.prepareRows(dataset, [{ index: config.x, type: 'numeric', label: 'Bootstrap variable' }], config.missingPolicy);
      const values = prepared.rows.map(function (row) { return Number(row.cells[config.x]); });
      if (values.length < 2) throw new Error('Bootstrap analysis requires at least two usable values.');
      result.prepared = prepared; result.values = values;
      result.bootstrapMeans = bootstrapMeans(values, config.bootstrapReps, config.seed);
      result.bootstrap = { n: values.length, mean: STATS.mean(values), low: quantile(result.bootstrapMeans, config.alpha / 2), high: quantile(result.bootstrapMeans, 1 - config.alpha / 2), reps: config.bootstrapReps, seed: config.seed };
      result.method = 'Seeded nonparametric percentile bootstrap for the mean';
      result.usableRows = prepared.usableRows; result.dropped = prepared.dropped; result.imputed = prepared.imputed;
      result.primary = { label: 'sample mean', value: result.bootstrap.mean };
      result.uncertainty = { label: `${Math.round((1 - config.alpha) * 100)}% CI width`, value: result.bootstrap.high - result.bootstrap.low };
      result.effect = { label: 'resamples', value: config.bootstrapReps };
      if (values.length < 15) warnings.push('Small sample: percentile-bootstrap coverage can be poor and should be checked externally.');
    } else if (config.mode === 'classification') {
      const pair = DATA.pairedNumeric(dataset, config.x, config.y, config.missingPolicy);
      if (pair.usableRows < 4) throw new Error('Classification diagnostics require at least four score/label pairs.');
      const rawLabels = Array.from(new Set(pair.y));
      if (rawLabels.length !== 2 || rawLabels.some(function (value) { return value !== 0 && value !== 1; })) throw new Error('Classification labels must contain both 0 and 1 and no other values.');
      const labels = pair.y.slice();
      result.prepared = pair; result.scores = pair.x; result.labels = labels;
      result.classification = STATS.rocPrCurve(pair.x, labels);
      result.method = 'Empirical ROC and precision–recall ranking diagnostics';
      result.usableRows = pair.usableRows; result.dropped = pair.dropped; result.imputed = pair.imputed;
      result.primary = { label: 'ROC AUC', value: result.classification.auc };
      result.uncertainty = { label: 'average precision', value: result.classification.averagePrecision };
      result.effect = { label: 'positive cases', value: result.classification.positive };
      warnings.push('No confidence interval, calibration model or decision-utility analysis is computed.');
    } else if (config.mode === 'survival') {
      const prepared = DATA.prepareRows(dataset, [
        { index: config.x, type: 'numeric', label: 'Time' },
        { index: config.event, type: 'numeric', label: 'Event' },
        { index: config.group, type: 'categorical', label: 'Group' },
      ], config.missingPolicy);
      if (prepared.usableRows < 3) throw new Error('Survival analysis requires at least three complete time/event/group rows.');
      const time = prepared.rows.map(function (row) { return Number(row.cells[config.x]); });
      const rawEvent = prepared.rows.map(function (row) { return Number(row.cells[config.event]); });
      if (rawEvent.some(function (value) { return value !== 0 && value !== 1; })) throw new Error('Survival event indicators must be coded as 0 or 1.');
      const event = rawEvent.slice();
      const group = prepared.rows.map(function (row) { return String(row.cells[config.group]); });
      const groupNames = Array.from(new Set(group));
      result.prepared = prepared; result.time = time; result.event = event; result.survivalGroup = group; result.groupNames = groupNames;
      result.km = {};
      groupNames.forEach(function (name) {
        const indices = group.map(function (value, index) { return value === name ? index : -1; }).filter(function (index) { return index >= 0; });
        result.km[name] = STATS.kaplanMeier(indices.map(function (index) { return time[index]; }), indices.map(function (index) { return event[index]; }));
      });
      result.logRank = groupNames.length === 2 ? STATS.logRank2(time, event, group) : null;
      result.method = 'Kaplan–Meier estimates and two-group log-rank test';
      result.usableRows = prepared.usableRows; result.dropped = prepared.dropped; result.imputed = prepared.imputed;
      result.primary = { label: 'events', value: event.reduce(function (sum, value) { return sum + value; }, 0) };
      result.uncertainty = { label: 'log-rank p', value: result.logRank ? result.logRank.p : NaN };
      result.effect = { label: 'censored', value: event.length - event.reduce(function (sum, value) { return sum + value; }, 0) };
      if (groupNames.length !== 2) warnings.push('The browser log-rank implementation is limited to exactly two groups; only Kaplan–Meier curves are shown.');
    } else if (config.mode === 'fdr') {
      const prepared = DATA.prepareRows(dataset, [{ index: config.x, type: 'numeric', label: 'P-value' }], config.missingPolicy);
      const pValues = prepared.rows.map(function (row) { return Number(row.cells[config.x]); });
      if (!pValues.length) throw new Error('FDR correction requires at least one p-value.');
      if (pValues.some(function (value) { return value < 0 || value > 1; })) throw new Error('Every p-value must lie in [0, 1].');
      const labels = prepared.rows.map(function (row) { const value = row.cells[config.group]; return value == null ? `row ${row.index}` : String(value); });
      result.prepared = prepared; result.pValues = pValues; result.fdrLabels = labels; result.qValues = STATS.benjaminiHochberg(pValues);
      result.discoveries = result.qValues.filter(function (value) { return value <= config.alpha; }).length;
      result.method = 'Benjamini–Hochberg step-up FDR adjustment';
      result.usableRows = prepared.usableRows; result.dropped = prepared.dropped; result.imputed = prepared.imputed;
      result.primary = { label: `discoveries at q≤${config.alpha}`, value: result.discoveries };
      result.uncertainty = { label: 'minimum q', value: Math.min.apply(null, result.qValues) };
      result.effect = { label: 'tests', value: pValues.length };
    } else if (config.mode === 'spc') {
      const pair = DATA.pairedNumeric(dataset, config.x, config.y, config.missingPolicy);
      if (pair.usableRows < 3) throw new Error('Process-control diagnostics require at least three run/value pairs.');
      result.prepared = pair; result.run = pair.x; result.values = pair.y; result.spc = STATS.spc(pair.y);
      result.method = 'Sample-estimated Shewhart center and 3σ limits';
      result.usableRows = pair.usableRows; result.dropped = pair.dropped; result.imputed = pair.imputed;
      result.primary = { label: 'center', value: result.spc.center };
      result.uncertainty = { label: 'UCL − LCL', value: result.spc.ucl - result.spc.lcl };
      result.effect = { label: 'limit violations', value: result.spc.violations.length };
      warnings.push('No run rules, autocorrelation model or phase-I/phase-II distinction is computed.');
    } else throw new Error('Unsupported statistical mode.');

    if (result.dropped > 0) warnings.push(`${result.dropped} row(s) were excluded because required values were missing or invalid.`);
    if (result.imputed > 0) warnings.push(`${result.imputed} selected numeric cell(s) were mean-imputed; uncertainty is understated.`);
    if (dataset.rowCount < 10) warnings.push('Small dataset: inferential approximations and diagnostics are unstable.');
    result.runtimeMs = performance.now() - started;
    return result;
  }

  function runStatistics() {
    $('runStatistics').disabled = true;
    setStatus('Parsing data and computing the selected analysis…', false);
    $('statisticsProgress').style.width = '35%';
    setTimeout(function () {
      try {
        const config = currentConfig();
        validateSettings(config);
        const dataset = parseDatasetFromEditor(false);
        state.result = computeResult(dataset, config);
        $('statisticsProgress').style.width = '100%';
        updatePlotSelectors();
        renderAllPlots();
        renderEvidence();
        setTimeout(function () { $('statisticsProgress').style.width = '0'; }, 450);
      } catch (error) { showError(error); }
      finally { $('runStatistics').disabled = false; }
    }, 20);
  }

  function availablePlotTypes() {
    if (!state.result) return [];
    const mode = state.result.mode;
    const common = [['missingness', 'Missingness map']];
    const map = {
      descriptive: [['histogram-x', 'Distribution'], ['ecdf-x', 'Empirical CDF'], ['violin-columns', 'Violin + observations'], ['box-columns', 'Column box plots'], ['qq-x', 'Normal Q–Q'], ['correlation-matrix', 'Correlation matrix']],
      pca: [['pca-scores', 'PCA scores'], ['pca-explained', 'Explained variance'], ['pca-loadings', 'PCA loadings'], ['correlation-matrix', 'Correlation matrix']],
      regression: [['scatter-fit', 'Data + OLS bands'], ['residuals', 'Residuals vs fitted'], ['scale-location', 'Scale–location'], ['residual-leverage', 'Residuals vs leverage'], ['qq-residuals', 'Residual Q–Q'], ['residual-histogram', 'Residual distribution'], ['cooks', 'Cook’s distance'], ['histogram-y', 'Response distribution']],
      correlation: [['scatter-correlation', 'X–Y association'], ['density-correlation', 'X–Y density contours'], ['correlation-matrix', 'Correlation matrix'], ['histogram-x', 'X distribution'], ['histogram-y', 'Y distribution']],
      welch: [['box-groups', 'Group distributions'], ['group-ecdf', 'Group empirical CDFs'], ['group-means', 'Means + intervals'], ['histogram-groups', 'Group histograms']],
      anova: [['box-groups', 'Group distributions'], ['group-ecdf', 'Group empirical CDFs'], ['group-means', 'Means + intervals'], ['histogram-groups', 'Group histograms']],
      bootstrap: [['bootstrap-distribution', 'Bootstrap mean distribution'], ['bootstrap-convergence', 'Interval convergence'], ['histogram-x', 'Observed distribution'], ['ecdf-x', 'Observed empirical CDF'], ['qq-x', 'Observed Q–Q']],
      classification: [['roc', 'ROC curve'], ['precision-recall', 'Precision–recall'], ['threshold-performance', 'Threshold performance'], ['scores-by-class', 'Scores by class']],
      survival: [['survival', 'Kaplan–Meier'], ['cumulative-hazard', 'Cumulative hazard'], ['event-counts', 'Events and censoring'], ['time-distribution', 'Observed-time distribution']],
      fdr: [['p-q', 'Raw p vs adjusted q'], ['ranked-p', 'Ranked p and BH line'], ['discoveries', 'Discovery status']],
      spc: [['control-chart', 'Control chart'], ['run-order', 'Run-order series'], ['moving-range', 'Moving range'], ['process-acf', 'Process autocorrelation'], ['histogram-y', 'Measurement distribution']],
    };
    return (map[mode] || map.descriptive).concat(common);
  }

  function updatePlotSelectors() {
    const options = availablePlotTypes();
    const keys = options.map(function (item) { return item[0]; });
    const defaults = { left: keys[0], right: keys[1] || keys[0] }; const used = new Set();
    PLOT_SIDES.forEach(function (side) {
      const select = $(`${side}PlotType`); let preferred = keys.includes(state.plotTypes[side]) && !used.has(state.plotTypes[side]) ? state.plotTypes[side] : defaults[side];
      if (!keys.includes(preferred) || used.has(preferred)) preferred = keys.find(function (key) { return !used.has(key); }) || keys[0];
      state.plotTypes[side] = preferred; if (preferred) used.add(preferred);
      select.innerHTML = options.map(function (item) { return `<option value="${item[0]}">${escapeHtml(item[1])}</option>`; }).join('');
      select.value = preferred || '';
    });
    applyLayout();
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('statistics');
}

  function selectDistinctPlot(side, requested) {
    const old = state.plotTypes[side];
    const other = PLOT_SIDES.find(function (candidate) { return candidate !== side && state.plotTypes[candidate] === requested; });
    if (other && old && old !== requested) {
      state.plotTypes[other] = old; $(`${other}PlotType`).value = old; renderPlot(other);
    }
    state.plotTypes[side] = requested; $(`${side}PlotType`).value = requested; renderPlot(side);
  }

  function baseLayout(title, xTitle, yTitle) {
    return {
      title: { text: title, font: { size: 14 } },
      margin: { l: 62, r: 24, t: 52, b: 58 },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#fbfdff',
      xaxis: { title: xTitle || '', gridcolor: '#dce8ef', zerolinecolor: '#b9ccd8' },
      yaxis: { title: yTitle || '', gridcolor: '#dce8ef', zerolinecolor: '#b9ccd8' },
      legend: { orientation: 'h', y: 1.13, x: 0 }, hovermode: 'closest', autosize: true,
    };
  }

  function qqTrace(values, name) {
    const sorted = values.filter(Number.isFinite).slice().sort(function (a, b) { return a - b; });
    const mean = STATS.mean(sorted); const sd = STATS.sd(sorted) || 1;
    const theoretical = sorted.map(function (_, index) { return mean + sd * STATS.normalInv((index + 0.5) / sorted.length); });
    return { sorted, theoretical, name };
  }
  function ecdfTrace(values, name) {
    const sorted = values.filter(Number.isFinite).slice().sort(function (a, b) { return a - b; });
    return { x: sorted, y: sorted.map(function (_, index) { return (index + 1) / sorted.length; }), mode: 'lines', line: { shape: 'hv' }, name: name };
  }
  function autocorrelation(values, maxLag) {
    const center = STATS.mean(values); const denominator = values.reduce(function (sum, value) { return sum + (value - center) ** 2; }, 0) || 1;
    return Array.from({ length: Math.min(maxLag || 20, values.length - 1) + 1 }, function (_, lag) {
      return values.slice(lag).reduce(function (sum, value, index) { return sum + (value - center) * (values[index] - center); }, 0) / denominator;
    });
  }

  function buildPlot(type) {
    const result = state.result;
    const config = result.config;
    const dataset = result.dataset;
    const xName = dataset.names[config.x] || 'X';
    const yName = dataset.names[config.y] || 'Y';
    if (type === 'missingness') {
      const matrix = DATA.missingnessMatrix(dataset, 250);
      return { traces: [{ z: matrix.z, x: matrix.x, y: matrix.y, type: 'heatmap', zmin: 0, zmax: 1, colorscale: [[0, '#eef5f7'], [1, '#8b2c2c']], showscale: false, hovertemplate: 'row %{y}<br>%{x}<br>%{z}<extra></extra>' }], layout: baseLayout('Observed and missing cells', 'Column', 'Source row'), evidence: `Missing cells are shown directly from the parsed input${matrix.truncated ? '; the display is truncated to the first 250 rows' : ''}. No imputation is hidden in this plot.` };
    }
    if (type === 'pca-scores') {
      const pca = result.pca;
      return { traces: [{ x: pca.scores.map(function (row) { return row[0]; }), y: pca.scores.map(function (row) { return row[1]; }), mode: 'markers', type: 'scatter', marker: { size: 8, opacity: 0.78, color: result.pcaRowIndices, colorscale: 'Viridis', showscale: true, colorbar: { title: 'source row' } }, text: result.pcaRowIndices.map(function (index) { return 'source row ' + index; }), name: 'rows' }], layout: baseLayout(`PCA scores · ${fmt(100 * pca.explainedVarianceRatio[0], 1)}% + ${fmt(100 * pca.explainedVarianceRatio[1], 1)}%`, 'PC1 score', 'PC2 score'), evidence: 'Rows are projected after standardizing each included numeric column. Separation is descriptive; it is not a group test, clustering result or latent-mechanism proof.' };
    }
    if (type === 'pca-explained') {
      const pca = result.pca; const labels = pca.explainedVarianceRatio.map(function (_, index) { return 'PC' + (index + 1); });
      const layout = baseLayout('PCA explained variance', 'Principal component', 'Variance fraction'); layout.yaxis.range = [0, 1]; layout.yaxis2 = { title: 'Cumulative fraction', overlaying: 'y', side: 'right', range: [0, 1] };
      return { traces: [{ x: labels, y: pca.explainedVarianceRatio, type: 'bar', name: 'individual' }, { x: labels, y: pca.cumulativeExplained, mode: 'lines+markers', yaxis: 'y2', name: 'cumulative' }], layout: layout, evidence: 'Explained-variance fractions are sample estimates. A large fraction does not establish scientific importance, prediction quality or causal relevance.' };
    }
    if (type === 'pca-loadings') {
      const pca = result.pca; const count = Math.min(5, pca.components.length);
      return { traces: [{ z: pca.components.slice(0, count), x: pca.featureNames, y: Array.from({ length: count }, function (_, index) { return 'PC' + (index + 1); }), type: 'heatmap', colorscale: 'RdBu', zmid: 0, colorbar: { title: 'loading' } }], layout: baseLayout('Standardized PCA loadings', 'Numeric feature', 'Principal component'), evidence: 'Loadings describe linear directions in standardized feature space. Their sign is arbitrary, and correlated features can share or exchange loading magnitude.' };
    }
    if (type === 'histogram-x' || type === 'histogram-y') {
      const index = type === 'histogram-x' ? config.x : config.y;
      const values = DATA.numericValues(dataset, index);
      const name = dataset.names[index];
      return { traces: [{ x: values, type: 'histogram', nbinsx: config.bins, name }], layout: baseLayout(`${name} distribution`, name, 'Count'), evidence: 'Histogram bins are user-configured and can change visual impressions. The plot is descriptive and does not establish a probability distribution.' };
    }
    if (type === 'ecdf-x') {
      const values = DATA.numericValues(dataset, config.x);
      return { traces: [ecdfTrace(values, xName)], layout: Object.assign(baseLayout(`${xName} empirical distribution`, xName, 'Empirical cumulative probability'), { yaxis: { title: 'Empirical cumulative probability', range: [0, 1] } }), evidence: 'The empirical CDF is bin-free and shows every observed value. It remains a sample description and is not a fitted probability model.' };
    }
    if (type === 'violin-columns') {
      const traces = result.summaries.map(function (summary) { return { y: DATA.numericValues(dataset, summary.index), type: 'violin', name: summary.column, box: { visible: true }, meanline: { visible: true }, points: 'all', jitter: .18 }; });
      return { traces, layout: baseLayout('Numeric distributions and observations', 'Column', 'Value'), evidence: 'Violin width is a kernel-density visualization and depends on smoothing. Embedded box summaries and observations keep the finite sample visible.' };
    }
    if (type === 'box-columns') {
      const traces = result.summaries.map(function (summary) { return { y: DATA.numericValues(dataset, summary.index), type: 'box', name: summary.column, boxpoints: 'outliers' }; });
      return { traces, layout: baseLayout('Numeric-column distributions', 'Column', 'Value'), evidence: 'Box plots display median, quartiles and rule-based outliers. They do not test normality or identify data errors.' };
    }
    if (type === 'qq-x' || type === 'qq-residuals') {
      const values = type === 'qq-residuals' ? result.regression.resid : DATA.numericValues(dataset, config.x);
      const qq = qqTrace(values, type === 'qq-residuals' ? 'residuals' : xName);
      return { traces: [{ x: qq.theoretical, y: qq.sorted, mode: 'markers', name: qq.name }, { x: [Math.min.apply(null, qq.theoretical), Math.max.apply(null, qq.theoretical)], y: [Math.min.apply(null, qq.theoretical), Math.max.apply(null, qq.theoretical)], mode: 'lines', name: 'reference', line: { dash: 'dash' } }], layout: baseLayout(type === 'qq-residuals' ? 'Residual normal Q–Q' : `${xName} normal Q–Q`, 'Theoretical quantile', 'Observed quantile'), evidence: 'The Q–Q plot is a visual diagnostic against a fitted normal reference. It is not a formal normality certificate and is unstable in small samples.' };
    }
    if (type === 'correlation-matrix') {
      const matrix = result.correlationMatrix || DATA.pairwiseCorrelationMatrix(dataset, result.summaries.map(function (summary) { return summary.index; }), STATS.correlation);
      const names = result.correlationNames || result.summaries.map(function (summary) { return summary.column; });
      return { traces: [{ z: matrix, x: names, y: names, type: 'heatmap', zmin: -1, zmax: 1, colorscale: 'RdBu', reversescale: true, hovertemplate: '%{x} vs %{y}<br>r=%{z:.4f}<extra></extra>' }], layout: baseLayout('Pairwise Pearson correlations', 'Variable', 'Variable'), evidence: 'Correlations use available numeric values per column in this matrix. Pairwise sample sizes may differ when missingness is present; correlation does not establish causation.' };
    }
    if (type === 'scatter-fit') {
      const bands = result.bands;
      return { traces: [
        { x: bands.map(function (point) { return point.x; }).concat(bands.map(function (point) { return point.x; }).reverse()), y: bands.map(function (point) { return point.piHigh; }).concat(bands.map(function (point) { return point.piLow; }).reverse()), fill: 'toself', mode: 'lines', line: { width: 0 }, name: `${Math.round((1 - config.alpha) * 100)}% prediction band` },
        { x: bands.map(function (point) { return point.x; }).concat(bands.map(function (point) { return point.x; }).reverse()), y: bands.map(function (point) { return point.ciHigh; }).concat(bands.map(function (point) { return point.ciLow; }).reverse()), fill: 'toself', mode: 'lines', line: { width: 0 }, name: `${Math.round((1 - config.alpha) * 100)}% mean CI` },
        { x: bands.map(function (point) { return point.x; }), y: bands.map(function (point) { return point.fit; }), mode: 'lines', name: 'OLS fit' },
        { x: result.prepared.x, y: result.prepared.y, mode: 'markers', name: 'usable observations' },
      ], layout: baseLayout('OLS fit and model-based bands', xName, yName), evidence: 'Confidence and prediction bands are classical OLS approximations conditional on the linear model and error assumptions. They are not nonparametric uncertainty envelopes.' };
    }
    if (type === 'residuals') {
      const reg = result.regression;
      return { traces: [{ x: reg.pred, y: reg.resid, mode: 'markers', name: 'residuals' }, { x: [Math.min.apply(null, reg.pred), Math.max.apply(null, reg.pred)], y: [0, 0], mode: 'lines', name: 'zero', line: { dash: 'dash' } }], layout: baseLayout('Residuals versus fitted values', 'Fitted value', 'Residual'), evidence: 'Residual patterns can reveal nonlinearity or heteroscedasticity, but a visually quiet plot does not prove assumptions or independence.' };
    }
    if (type === 'scale-location') {
      const reg = result.regression;
      return { traces: [{ x: reg.pred, y: reg.standardizedResidual.map(function (value) { return Math.sqrt(Math.abs(value)); }), mode: 'markers', marker: { color: reg.leverage, colorscale: 'Viridis', colorbar: { title: 'leverage' } }, name: 'observations' }], layout: baseLayout('Scale–location diagnostic', 'Fitted value', '√|standardized residual|'), evidence: 'Increasing spread can indicate heteroscedasticity. This finite visual diagnostic does not select a variance model or repair classical inference.' };
    }
    if (type === 'residual-leverage') {
      const reg = result.regression;
      return { traces: [{ x: reg.leverage, y: reg.standardizedResidual, mode: 'markers', marker: { size: reg.cooks.map(function (value) { return 7 + 28 * Math.min(1, value); }), color: reg.cooks, colorscale: 'Turbo', colorbar: { title: 'Cook D' } }, name: 'observations' }], layout: baseLayout('Residuals versus leverage', 'Leverage', 'Standardized residual'), evidence: 'Marker size and color encode Cook’s distance. Influential points require scientific review; they are not automatic deletion candidates.' };
    }
    if (type === 'residual-histogram') {
      return { traces: [{ x: result.regression.resid, type: 'histogram', nbinsx: config.bins, name: 'OLS residuals' }], layout: baseLayout('OLS residual distribution', 'Residual', 'Count'), evidence: 'The histogram is in sample and bin-dependent. It complements but does not replace Q–Q, scale–location and dependence diagnostics.' };
    }
    if (type === 'cooks') {
      const values = result.regression.cooks;
      return { traces: [{ x: values.map(function (_, index) { return index + 1; }), y: values, type: 'bar', name: 'Cook distance' }, { x: values.map(function (_, index) { return index + 1; }), y: values.map(function () { return 4 / values.length; }), mode: 'lines', name: '4/n heuristic', line: { dash: 'dash' } }], layout: baseLayout('Cook’s distance', 'Usable observation index', 'Cook distance'), evidence: 'Cook’s distance is a model-dependent influence diagnostic. The 4/n line is a heuristic flag, not an automatic exclusion rule.' };
    }
    if (type === 'scatter-correlation') {
      const pair = result.prepared;
      return { traces: [{ x: pair.x, y: pair.y, mode: 'markers', name: `r=${fmt(result.correlationTest.r)}` }], layout: baseLayout('Paired association', xName, yName), evidence: 'The scatter plot and Pearson r summarize linear association among usable pairs. Outliers, range restriction and dependence can strongly alter the result.' };
    }
    if (type === 'density-correlation') {
      const pair = result.prepared;
      return { traces: [{ x: pair.x, y: pair.y, type: 'histogram2dcontour', colorscale: 'Viridis', reversescale: false, contours: { coloring: 'heatmap', showlines: true }, colorbar: { title: 'count density' }, name: 'density' }, { x: pair.x, y: pair.y, mode: 'markers', marker: { size: 5, color: 'rgba(23,32,51,.42)' }, name: 'observations' }], layout: baseLayout('Paired observation density', xName, yName), evidence: 'Density contours summarize occupied regions and can reveal clusters or range restriction. Smoothing/binning does not change the computed Pearson coefficient.' };
    }
    if (type === 'box-groups') {
      const traces = result.groupNames.map(function (name) { return { y: result.groups[name], type: 'box', name, boxpoints: 'all', jitter: 0.25, pointpos: 0 }; });
      return { traces, layout: baseLayout('Observed group distributions', 'Group', yName), evidence: 'The plot shows observed values and robust summaries. Group overlap does not determine the p-value, and a significant omnibus test does not identify pairwise differences.' };
    }
    if (type === 'group-means') {
      const intervals = result.groupIntervals;
      return { traces: [{ x: intervals.map(function (item) { return item.name; }), y: intervals.map(function (item) { return item.mean; }), type: 'bar', name: 'mean', error_y: { type: 'data', symmetric: false, array: intervals.map(function (item) { return item.high - item.mean; }), arrayminus: intervals.map(function (item) { return item.mean - item.low; }), visible: true } }], layout: baseLayout('Group means and marginal t intervals', 'Group', yName), evidence: 'Intervals are separate marginal t intervals for each group, not simultaneous comparisons and not confidence intervals for pairwise differences.' };
    }
    if (type === 'histogram-groups') {
      const traces = result.groupNames.map(function (name) { return { x: result.groups[name], type: 'histogram', nbinsx: config.bins, opacity: 0.65, name }; });
      const layout = baseLayout('Group distributions', yName, 'Count'); layout.barmode = 'overlay';
      return { traces, layout, evidence: 'Overlaid histograms are sensitive to binning and unequal group sizes. Use them as descriptive context, not a test result.' };
    }
    if (type === 'group-ecdf') {
      return { traces: result.groupNames.map(function (name) { return ecdfTrace(result.groups[name], name); }), layout: Object.assign(baseLayout('Group empirical distributions', yName, 'Empirical cumulative probability'), { yaxis: { title: 'Empirical cumulative probability', range: [0, 1] } }), evidence: 'Empirical CDF separation shows distributional differences without bins. Welch and ANOVA target means; Kruskal–Wallis targets rank distributions under its own assumptions.' };
    }
    if (type === 'bootstrap-distribution') {
      const boot = result.bootstrap;
      const layout = baseLayout('Seeded bootstrap distribution of the mean', 'Bootstrap mean', 'Count');
      layout.shapes = [{ type: 'line', x0: boot.low, x1: boot.low, y0: 0, y1: 1, yref: 'paper', line: { dash: 'dash' } }, { type: 'line', x0: boot.high, x1: boot.high, y0: 0, y1: 1, yref: 'paper', line: { dash: 'dash' } }];
      layout.annotations = [{ x: boot.low, y: 1, yref: 'paper', text: 'lower', showarrow: false }, { x: boot.high, y: 1, yref: 'paper', text: 'upper', showarrow: false }];
      return { traces: [{ x: result.bootstrapMeans, type: 'histogram', nbinsx: config.bins, name: 'bootstrap means' }], layout, evidence: `The plot contains ${boot.reps} resampled means generated with seed ${boot.seed}. Percentile limits are approximate and conditional on exchangeable resampling units.` };
    }
    if (type === 'bootstrap-convergence') {
      const sizes = Array.from(new Set([50,100,200,500,1000,2000,5000,10000,result.bootstrapMeans.length].filter(function (n) { return n <= result.bootstrapMeans.length; }))).sort(function (a,b) { return a-b; });
      const lower = sizes.map(function (n) { return quantile(result.bootstrapMeans.slice(0,n), config.alpha/2); }); const upper = sizes.map(function (n) { return quantile(result.bootstrapMeans.slice(0,n), 1-config.alpha/2); });
      return { traces: [{ x:sizes,y:lower,mode:'lines+markers',name:'lower percentile' },{ x:sizes,y:upper,mode:'lines+markers',name:'upper percentile' }], layout: Object.assign(baseLayout('Bootstrap interval prefix stability','Resamples used','Interval endpoint'), { xaxis:{title:'Resamples used',type:'log'} }), evidence: 'Prefix estimates reuse one seeded bootstrap stream. Stabilization is useful numerical evidence but is not an independent replication or a coverage study.' };
    }
    if (type === 'roc') {
      const curve = result.classification;
      return { traces: [{ x: curve.roc.map(function (point) { return point.fpr; }), y: curve.roc.map(function (point) { return point.tpr; }), mode: 'lines+markers', name: `AUC ${fmt(curve.auc, 3)}` }, { x: [0, 1], y: [0, 1], mode: 'lines', name: 'random ranking', line: { dash: 'dash' } }], layout: Object.assign(baseLayout('Empirical ROC curve', 'False-positive rate', 'True-positive rate'), { xaxis: { title: 'False-positive rate', range: [0, 1] }, yaxis: { title: 'True-positive rate', range: [0, 1] } }), evidence: 'The ROC curve is empirical on the current sample. No uncertainty interval, cross-validation or external validation is computed.' };
    }
    if (type === 'precision-recall') {
      const curve = result.classification;
      const prevalence = curve.positive / curve.n;
      return { traces: [{ x: curve.pr.map(function (point) { return point.recall; }), y: curve.pr.map(function (point) { return point.precision; }), mode: 'lines+markers', name: `AP ${fmt(curve.averagePrecision, 3)}` }, { x: [0, 1], y: [prevalence, prevalence], mode: 'lines', name: 'sample prevalence', line: { dash: 'dash' } }], layout: Object.assign(baseLayout('Empirical precision–recall curve', 'Recall', 'Precision'), { xaxis: { title: 'Recall', range: [0, 1] }, yaxis: { title: 'Precision', range: [0, 1] } }), evidence: 'Average precision and the baseline depend on sample prevalence. This plot does not assess calibration or threshold utility.' };
    }
    if (type === 'scores-by-class') {
      return { traces: [0, 1].map(function (label) { return { y: result.scores.filter(function (_, index) { return result.labels[index] === label; }), type: 'box', name: label ? 'positive' : 'negative', boxpoints: 'all' }; }), layout: baseLayout('Score distributions by observed class', 'Observed class', xName), evidence: 'Class-separated score distributions explain discrimination on this sample. They do not demonstrate stable performance in another population.' };
    }
    if (type === 'threshold-performance') {
      const curve = result.classification; const rows = curve.roc.slice(1); const precision = curve.pr;
      return { traces: [{x:rows.map(function(row){return row.threshold;}),y:rows.map(function(row){return row.tpr;}),mode:'lines+markers',name:'sensitivity / TPR'},{x:rows.map(function(row){return row.threshold;}),y:rows.map(function(row){return 1-row.fpr;}),mode:'lines+markers',name:'specificity'},{x:precision.map(function(row){return row.threshold;}),y:precision.map(function(row){return row.precision;}),mode:'lines+markers',name:'precision'}], layout: Object.assign(baseLayout('Empirical threshold trade-offs',xName,'Sample performance'),{yaxis:{title:'Sample performance',range:[0,1]}}), evidence: 'Every displayed threshold is an observed score. Choosing a threshold on the same sample is optimistic and requires an external utility or validation plan.' };
    }
    if (type === 'survival') {
      const traces = result.groupNames.map(function (name) { const km = result.km[name]; return { x: km.x, y: km.y, mode: 'lines', line: { shape: 'hv' }, name: `${name} (n=${km.n})` }; });
      const layout = baseLayout('Kaplan–Meier estimates', 'Time', 'Estimated survival'); layout.yaxis.range = [0, 1];
      return { traces, layout, evidence: 'Step functions are Kaplan–Meier estimates using event=1 and event=0 as censored. No confidence bands or hazard model are computed.' };
    }
    if (type === 'event-counts') {
      const events = result.groupNames.map(function (name) { return result.km[name].events; });
      const censored = result.groupNames.map(function (name) { return result.km[name].censored; });
      return { traces: [{ x: result.groupNames, y: events, type: 'bar', name: 'events' }, { x: result.groupNames, y: censored, type: 'bar', name: 'censored' }], layout: Object.assign(baseLayout('Observed events and censoring', 'Group', 'Count'), { barmode: 'stack' }), evidence: 'Counts expose the information underlying each survival curve. Censoring is not treated as an event and is never hidden.' };
    }
    if (type === 'time-distribution') {
      const traces = result.groupNames.map(function (name) { return { x: result.time.filter(function (_, index) { return result.survivalGroup[index] === name; }), type: 'histogram', nbinsx: config.bins, opacity: 0.65, name }; });
      const layout = baseLayout('Observed follow-up times', 'Observed time', 'Count'); layout.barmode = 'overlay';
      return { traces, layout, evidence: 'Observed-time distributions mix event and censoring times. They are descriptive and are not survival functions.' };
    }
    if (type === 'cumulative-hazard') {
      const traces = result.groupNames.map(function (name) { const km=result.km[name]; return {x:km.x,y:km.y.map(function(value){return -Math.log(Math.max(value,1e-12));}),mode:'lines',line:{shape:'hv'},name:name}; });
      return { traces, layout: baseLayout('Nelson-style cumulative-hazard transform','Time','−log survival'), evidence: 'This is the negative-log transform of the Kaplan–Meier estimate, not a separately fitted hazard model. It can make proportional-hazard departures visually apparent but does not test them.' };
    }
    if (type === 'p-q') {
      return { traces: [{ x: result.pValues, y: result.qValues, mode: 'markers+text', text: result.fdrLabels, textposition: 'top center', name: 'tests' }, { x: [0, 1], y: [0, 1], mode: 'lines', name: 'q=p', line: { dash: 'dash' } }], layout: baseLayout('Raw p-values and BH-adjusted q-values', 'Raw p', 'Adjusted q'), evidence: 'Each q-value is computed by the Benjamini–Hochberg step-up procedure across the supplied family. The family definition is a scientific decision outside the algorithm.' };
    }
    if (type === 'ranked-p') {
      const ranked = result.pValues.map(function (p, index) { return { p, label: result.fdrLabels[index] }; }).sort(function (a, b) { return a.p - b.p; });
      return { traces: [{ x: ranked.map(function (_, index) { return index + 1; }), y: ranked.map(function (item) { return item.p; }), mode: 'markers+lines', name: 'ranked p' }, { x: ranked.map(function (_, index) { return index + 1; }), y: ranked.map(function (_, index) { return ((index + 1) / ranked.length) * config.alpha; }), mode: 'lines', name: 'BH critical line' }], layout: baseLayout('Benjamini–Hochberg step-up comparison', 'Rank', 'p-value'), evidence: `Points below the BH critical line contribute to the step-up decision at α=${config.alpha}. This does not validate the underlying p-values.` };
    }
    if (type === 'discoveries') {
      return { traces: [{ x: result.fdrLabels, y: result.qValues, type: 'bar', name: 'q-value' }, { x: result.fdrLabels, y: result.qValues.map(function () { return config.alpha; }), mode: 'lines', name: `q=${config.alpha}` }], layout: baseLayout('Adjusted q-values by test', 'Test', 'q-value'), evidence: 'Bars below the declared q threshold are discoveries under this multiple-testing procedure. Effect size and biological importance are separate questions.' };
    }
    if (type === 'control-chart' || type === 'run-order') {
      const traces = [{ x: result.run, y: result.values, mode: 'lines+markers', name: 'measurement' }];
      if (type === 'control-chart') {
        traces.push({ x: result.run, y: result.run.map(function () { return result.spc.center; }), mode: 'lines', name: 'center' });
        traces.push({ x: result.run, y: result.run.map(function () { return result.spc.ucl; }), mode: 'lines', name: 'UCL' });
        traces.push({ x: result.run, y: result.run.map(function () { return result.spc.lcl; }), mode: 'lines', name: 'LCL' });
      }
      return { traces, layout: baseLayout(type === 'control-chart' ? 'Sample-estimated Shewhart chart' : 'Run-order series', xName, yName), evidence: type === 'control-chart' ? 'Center and ±3σ limits are estimated from the same supplied series. Limit violations are flags, not proof of assignable causes or process stability.' : 'The run-order plot preserves temporal ordering. No autocorrelation, change-point or drift model is fitted.' };
    }
    if (type === 'moving-range') {
      const ranges=result.values.slice(1).map(function(value,index){return Math.abs(value-result.values[index]);});
      return {traces:[{x:result.run.slice(1),y:ranges,mode:'lines+markers',name:'moving range'}],layout:baseLayout('Successive moving range',xName,'|xᵢ − xᵢ₋₁|'),evidence:'Moving ranges reveal abrupt local changes and are computed in supplied run order. No subgroup or phase-I control limits are inferred.'};
    }
    if (type === 'process-acf') {
      const values=autocorrelation(result.values,20),band=1.96/Math.sqrt(result.values.length);
      return {traces:[{x:values.map(function(_,i){return i;}),y:values,type:'bar',name:'sample ACF'},{x:[0,values.length-1],y:[band,band],mode:'lines',line:{dash:'dash'},name:'±1.96/√n'},{x:[0,values.length-1],y:[-band,-band],mode:'lines',line:{dash:'dash'},showlegend:false}],layout:baseLayout('Process autocorrelation','Lag','Sample autocorrelation'),evidence:'The ACF uses the supplied run order and simple white-noise reference bands. It is exploratory and does not fit a time-series error model.'};
    }
    throw new Error(`Plot type ${type} is unavailable for this result.`);
  }

  function renderPlot(side) {
    if (!state.result) return Promise.resolve();
    const host = $(`${side}Plot`);
    if (!host) return Promise.resolve();
    const type = state.plotTypes[side];
    let plot;
    try { plot = buildPlot(type); }
    catch (error) {
      return root.FokoPlotLifecycle.clear(host, error && error.message ? error.message : String(error));
    }
    const title = availablePlotTypes().find(function (item) { return item[0] === type; });
    setText(`${side}PlotTitle`, title ? title[1] : type);
    setText(`${side}PlotEvidence`, plot.evidence);
    return root.FokoPlotLifecycle.render(host, plot.traces, plot.layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] });
  }

  function visiblePlotSides() {
    const grid = $('plotGrid');
    if (!grid || grid.dataset.layout !== 'focus') return ['left', 'right'];
    return [state.focusSide === 'right' ? 'right' : 'left'];
  }

  function renderAllPlots() {
    requestAnimationFrame(function () { requestAnimationFrame(function () { visiblePlotSides().forEach(renderPlot); }); });
  }

  function diagnosticRows(result) {
    const rows = [
      ['Method', result.method], ['Source rows', result.dataset.rowCount], ['Usable rows', result.usableRows],
      ['Rows excluded', result.dropped], ['Cells imputed', result.imputed], ['Missing cells in source', result.dataset.missingCells],
    ];
    if (result.regression) rows.push(['Slope', fmt(result.regression.slope)], ['Slope CI', `[${fmt(result.regression.ciSlope[0])}, ${fmt(result.regression.ciSlope[1])}]`], ['p(slope)', pFmt(result.regression.pSlope)], ['R²', fmt(result.regression.r2)], ['RMSE', fmt(result.regression.rmse)]);
    if (result.correlationTest) rows.push(['Pearson r', fmt(result.correlationTest.r)], ['t', fmt(result.correlationTest.t)], ['df', fmt(result.correlationTest.df)], ['p', pFmt(result.correlationTest.p)]);
    if (result.welch) rows.push(['Group difference', fmt(result.welch.difference)], ['Welch t', fmt(result.welch.t)], ['df', fmt(result.welch.df)], ['p', pFmt(result.welch.p)], ['Hedges g', fmt(result.hedgesG)]);
    if (result.anova) rows.push(['ANOVA F', fmt(result.anova.F)], ['ANOVA df', `${result.anova.dfBetween}, ${result.anova.dfWithin}`], ['ANOVA p', pFmt(result.anova.p)], ['η²', fmt(result.etaSquared)], ['Kruskal H', fmt(result.kruskal.H)], ['Kruskal p', pFmt(result.kruskal.p)]);
    if (result.bootstrap) rows.push(['Sample mean', fmt(result.bootstrap.mean)], ['Percentile interval', `[${fmt(result.bootstrap.low)}, ${fmt(result.bootstrap.high)}]`], ['Resamples', result.bootstrap.reps], ['Seed', result.bootstrap.seed]);
    if (result.classification) rows.push(['ROC AUC', fmt(result.classification.auc)], ['Average precision', fmt(result.classification.averagePrecision)], ['Positive / negative', `${result.classification.positive} / ${result.classification.negative}`]);
    if (result.logRank) rows.push(['Log-rank χ²', fmt(result.logRank.chi2)], ['Log-rank p', pFmt(result.logRank.p)]);
    if (result.km) rows.push(['Survival groups', result.groupNames.join(', ')], ['Total events', result.primary.value], ['Total censored', result.effect.value]);
    if (result.qValues) rows.push(['Tests', result.pValues.length], ['Discoveries', result.discoveries], ['Minimum q', fmt(Math.min.apply(null, result.qValues))]);
    if (result.spc) rows.push(['Center', fmt(result.spc.center)], ['LCL / UCL', `${fmt(result.spc.lcl)} / ${fmt(result.spc.ucl)}`], ['Limit violations', result.spc.violations.length]);
    if (result.pca) rows.push(['PCA features', result.pca.featureNames.join(', ')], ['PC1 variance', fmt(result.pca.explainedVarianceRatio[0])], ['PC2 variance', fmt(result.pca.explainedVarianceRatio[1])], ['PC1+PC2 cumulative', fmt(result.pca.cumulativeExplained[1] || result.pca.cumulativeExplained[0])], ['Eigensolver', `${result.pca.solver.method}; converged=${result.pca.solver.converged}`]);
    rows.push(['Assumptions', result.assumptions]);
    result.warnings.forEach(function (warning, index) { rows.push([`Warning ${index + 1}`, warning]); });
    return rows;
  }

  function renderEvidence() {
    const result = state.result;
    setStatus(`Computed ${result.method} from ${result.usableRows} usable row(s).`, false);
    setText('statisticsTopStatus', result.warnings.length ? 'Computed with warnings' : 'Computed');
    setText('statisticsRuntime', `${fmt(result.runtimeMs, 2)} ms`);
    setText('statisticsUsableRows', `${result.usableRows}/${result.dataset.rowCount}`);
    setText('statisticsMethodMetric', result.method);
    setText('statisticsMissingMetric', result.imputed ? `${result.imputed} imputed` : `${result.dropped} excluded`);
    setText('statisticsPrimaryEstimate', typeof result.primary.value === 'number' ? fmt(result.primary.value) : result.primary.value);
    setText('statisticsPrimaryLabel', result.primary.label);
    setText('statisticsUncertainty', typeof result.uncertainty.value === 'number' ? (result.uncertainty.label.toLowerCase().includes('p') ? pFmt(result.uncertainty.value) : fmt(result.uncertainty.value)) : result.uncertainty.value);
    setText('statisticsUncertaintyLabel', result.uncertainty.label);
    setText('statisticsEffect', typeof result.effect.value === 'number' ? fmt(result.effect.value) : result.effect.value);
    setText('statisticsEffectLabel', result.effect.label);
    setText('statisticsQuality', String(result.dataset.missingCells));
    setText('statisticsResultKind', `${result.method} · ${result.usableRows} usable rows · ${result.warnings.length} warning(s)`);
    const diagnostics = $('statisticsDiagnostics');
    diagnostics.classList.remove('empty');
    diagnostics.innerHTML = `<table class="diagnostic-table"><tbody>${diagnosticRows(result).map(function (row) { return `<tr><th>${escapeHtml(row[0])}</th><td>${escapeHtml(row[1])}</td></tr>`; }).join('')}</tbody></table>`;
    setText('provenanceStatus', result.warnings.length ? 'Browser-computed with warnings' : 'Browser-computed');
    setText('provenanceEngine', result.pca ? 'FokoDataCore + FokoPCA' : 'FokoDataCore + FokoStatistics');
    setText('provenanceMethod', result.method);
    setText('provenanceData', `${result.dataset.rowCount}×${result.dataset.columnCount}; ${result.dataset.missingCells} missing`);
    setText('provenanceAssumptions', result.assumptions);
    setText('provenanceReproducibility', result.mode === 'bootstrap' ? `Configuration + seed ${result.config.seed}` : 'Configuration + input text');
    setText('provenanceWarning', result.warnings.length ? result.warnings.join(' ') : 'No automated warning was triggered. This does not prove assumptions or scientific validity.');
  }

  function clearComputedEvidence(message) {
    state.result = null;
    setStatus(message || 'No statistical result exists yet.', false);
    setText('statisticsTopStatus', 'Ready');
    ['statisticsRuntime', 'statisticsUsableRows', 'statisticsMethodMetric', 'statisticsMissingMetric', 'statisticsPrimaryEstimate', 'statisticsUncertainty', 'statisticsEffect', 'statisticsQuality'].forEach(function (id) { setText(id, '—'); });
    setText('statisticsPrimaryLabel', 'not computed'); setText('statisticsUncertaintyLabel', 'not computed'); setText('statisticsEffectLabel', 'not computed');
    setText('statisticsResultKind', 'No computed result');
    setText('provenanceStatus', 'Not computed'); setText('provenanceEngine', 'FokoDataCore + FokoStatistics'); setText('provenanceMethod', 'Not run'); setText('provenanceData', state.dataset ? `${state.dataset.rowCount}×${state.dataset.columnCount} parsed` : 'Not parsed'); setText('provenanceAssumptions', 'Not assessed'); setText('provenanceReproducibility', 'Configuration only'); setText('provenanceWarning', 'No numerical result exists yet.');
    $('statisticsDiagnostics').classList.add('empty'); $('statisticsDiagnostics').textContent = 'Run an analysis to see estimates, uncertainty, assumptions and warnings.';
    PLOT_SIDES.forEach(function (side) {
      const node = $(`${side}Plot`);
      root.FokoPlotLifecycle.clear(node, 'Run the analysis to create this plot.');
      setText(`${side}PlotEvidence`, 'No plot has been computed.');
    });
    applyLayout();
  }

  function showError(error) {
    $('statisticsProgress').style.width = '0';
    setStatus(error && error.message ? error.message : String(error), true);
    setText('statisticsTopStatus', 'Error');
    setText('provenanceStatus', 'Computation rejected');
    setText('provenanceWarning', error && error.message ? error.message : String(error));
  }

  function setStatus(message, bad) {
    const node = $('statisticsStatus'); node.textContent = message; node.classList.toggle('bad', Boolean(bad));
  }

  function applyLayout() {
    const grid = $('plotGrid');
    if (!grid) return null;
    const report = root.FokoLayoutStability.apply({
      grid: grid,
      preferred: state.layout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ layout: state.layout, focusSide: state.focusSide }));
    if (state.result) renderAllPlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('statistics');
    return report;
  }

  function encodeState(value) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
  function decodeState(value) { try { return JSON.parse(decodeURIComponent(escape(atob(value)))); } catch (_) { return null; } }

  function restoreConfiguration(config, source) {
    if (!config || typeof config.data !== 'string') throw new Error('Saved Statistics configuration is invalid.');
    state.currentName = config.example && PRESETS[config.example] ? config.example : 'Custom data';
    $('statisticsData').value = config.data;
    $('statisticsDelimiter').value = config.delimiter || 'auto';
    $('statisticsMissingPolicy').value = config.missingPolicy || 'analysis-complete';
    $('statisticsMode').value = config.mode || 'descriptive';
    state.layout = LAYOUTS.has(config.layout) ? config.layout : 'two';
    state.focusSide = PLOT_SIDES.includes(config.focusSide) ? config.focusSide : 'left';
    state.plotTypes = Object.assign(state.plotTypes, config.plotTypes || {});
    renderPresetLibrary();
    parseDatasetFromEditor(true);
    ['x', 'y', 'group', 'event'].forEach(function (key) { const id = `statistics${key.charAt(0).toUpperCase()}${key.slice(1)}`; if ($(id) && Number.isInteger(config[key])) $(id).value = String(config[key]); });
    if (finite(config.alpha)) $('statisticsAlpha').value = config.alpha;
    if (Number.isInteger(config.bootstrapReps)) $('statisticsBootstrapReps').value = config.bootstrapReps;
    if (Number.isInteger(config.seed)) $('statisticsSeed').value = config.seed;
    if (Number.isInteger(config.bins)) $('statisticsBins').value = config.bins;
    clearComputedEvidence(`${source || 'Configuration'} restored. Statistical evidence must be regenerated.`);
  }

  function saveSession() { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig())); setStatus('Configuration and input text saved locally. Computed evidence was not saved.', false); }
  function restoreSession() { const saved = safeParse(localStorage.getItem(STORAGE_KEY)); if (!saved) return showError(new Error('No saved Statistics configuration exists.')); try { restoreConfiguration(saved, 'Local configuration'); } catch (error) { showError(error); } }
  async function copyShareUrl() {
    try { const url = new URL(location.href); url.search = ''; url.searchParams.set('state', encodeState(currentConfig())); await navigator.clipboard.writeText(url.toString()); setStatus('Share URL copied. It stores input text and configuration, not computed evidence.', false); }
    catch (error) { showError(error); }
  }

  function download(name, text, type) {
    const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); link.href = url; link.download = name; link.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function csvEscape(value) { const text = String(value == null ? '' : value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
  function resultForExport() { if (!state.result) throw new Error('Run the analysis before exporting a numerical result.'); return state.result; }
  function exportSummary() {
    const result = resultForExport();
    const rows = [['field', 'value'], ['release', '77.4.1'], ['method', result.method], ['source_rows', result.dataset.rowCount], ['usable_rows', result.usableRows], ['excluded_rows', result.dropped], ['imputed_cells', result.imputed], ['missing_cells', result.dataset.missingCells], ['primary_label', result.primary.label], ['primary_value', result.primary.value], ['uncertainty_label', result.uncertainty.label], ['uncertainty_value', result.uncertainty.value], ['effect_label', result.effect.label], ['effect_value', result.effect.value], ['assumptions', result.assumptions], ['warnings', result.warnings.join(' | ')]];
    download('foko-lab-statistics-summary.csv', rows.map(function (row) { return row.map(csvEscape).join(','); }).join('\n'), 'text/csv');
  }
  function exportCleanData() {
    const result = resultForExport(); const header = result.dataset.names;
    const rows = result.prepared && result.prepared.rows ? result.prepared.rows.map(function (row) { return row.cells; }) : result.dataset.rows.map(function (row) { return row.cells; });
    download('foko-lab-statistics-usable-data.csv', [header].concat(rows).map(function (row) { return row.map(csvEscape).join(','); }).join('\n'), 'text/csv');
  }
  function serialisableResult() {
    const result = resultForExport();
    const compact = clone(result);
    delete compact.dataset.sourceText;
    if (compact.bootstrapMeans && compact.bootstrapMeans.length > 5000) compact.bootstrapMeans = compact.bootstrapMeans.slice(0, 5000);
    return { release: '77.4.1', computedAt: new Date().toISOString(), result: compact, warning: 'Inference remains conditional on data quality, sampling and model assumptions.' };
  }
  function exportValidation(language) {
    const config = currentConfig(); const dataset = state.dataset || parseDatasetFromEditor(false); const x = dataset.names[config.x]; const y = dataset.names[config.y]; const group = dataset.names[config.group]; const event = dataset.names[config.event];
    if (language === 'python') {
      const text = `"""Validation scaffold exported by Foko Lab v77.4.1.\nInspect assumptions and adapt the method before scientific use.\n"""\nimport pandas as pd\nfrom scipy import stats\n\ndf = pd.read_csv("your_data.csv")\nmode = ${JSON.stringify(config.mode)}\nalpha = ${config.alpha}\n\n# Selected columns\nx = df[${JSON.stringify(x)}]\ny = df[${JSON.stringify(y)}]\ngroup = df[${JSON.stringify(group)}]\nevent = df[${JSON.stringify(event)}]\n\nprint(df.describe(include="all"))\n# Implement and validate the selected mode explicitly; do not rely on the browser result alone.\n`;
      download('foko-lab-statistics-validation.py', text, 'text/x-python');
    } else {
      const text = `# Validation scaffold exported by Foko Lab v77.4.1.\n# Inspect assumptions and adapt the method before scientific use.\ndf <- read.csv("your_data.csv")\nmode <- ${JSON.stringify(config.mode)}\nalpha <- ${config.alpha}\nsummary(df)\n# Selected columns: X=${x}, Y=${y}, group=${group}, event=${event}\n# Implement and validate the selected analysis explicitly.\n`;
      download('foko-lab-statistics-validation.R', text, 'text/x-r-source');
    }
  }
  function exportPlot(side, formatName) { if (!state.result) return showError(new Error('Run the analysis before exporting a plot.')); root.Plotly.downloadImage(`${side}Plot`, { format: formatName, filename: `foko-lab-statistics-${side}` }); }

  function bindEvents() {
    $('runStatistics').addEventListener('click', runStatistics);
    $('resetStatistics').addEventListener('click', function () { loadPreset(state.currentName, false); });
    $('loadStatistics').addEventListener('click', function () { loadPreset($('statisticsSelect').value, true); });
    $('statisticsDeck').addEventListener('click', function (event) { const button = event.target.closest('[data-preset]'); if (button) loadPreset(button.dataset.preset, true); });
    $('statisticsFamilyFilter').addEventListener('change', function () { state.exampleFamily = this.value; renderPresetLibrary(); });
    $('statisticsFile').addEventListener('change', function () {
      const file = this.files && this.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = function () { $('statisticsData').value = String(reader.result || ''); state.currentName = 'Uploaded data'; try { parseDatasetFromEditor(true); clearComputedEvidence(`Loaded ${file.name}. Run the analysis to compute evidence.`); } catch (error) { showError(error); } };
      reader.onerror = function () { showError(new Error(`Could not read ${file.name}.`)); };
      reader.readAsText(file);
    });
    ['statisticsData', 'statisticsDelimiter'].forEach(function (id) { $(id).addEventListener('change', function () { try { parseDatasetFromEditor(true); clearComputedEvidence('Data changed. Previous statistical evidence was cleared.'); } catch (error) { showError(error); } }); });
    ['statisticsMissingPolicy', 'statisticsMode', 'statisticsX', 'statisticsY', 'statisticsGroup', 'statisticsEvent', 'statisticsAlpha', 'statisticsBootstrapReps', 'statisticsSeed', 'statisticsBins'].forEach(function (id) { $(id).addEventListener('input', function () { clearComputedEvidence('Analysis configuration changed. Recompute before interpreting results.'); }); });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) { button.addEventListener('click', function () { if (LAYOUTS.has(button.dataset.layoutMode)) { state.layout = button.dataset.layoutMode; applyLayout(); } }); });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) { button.addEventListener('click', function () { state.focusSide = button.dataset.focusSide; state.layout = 'focus'; applyLayout(); }); });
    PLOT_SIDES.forEach(function (side) { $(`${side}PlotType`).addEventListener('change', function () { selectDistinctPlot(side, this.value); }); });
    document.querySelectorAll('[data-export-side]').forEach(function (button) { button.addEventListener('click', function () { exportPlot(button.dataset.exportSide, 'png'); }); });
    $('exportStatisticsPng').addEventListener('click', function () { exportPlot(state.focusSide, 'png'); });
    $('exportStatisticsSvg').addEventListener('click', function () { exportPlot(state.focusSide, 'svg'); });
    $('saveStatisticsSession').addEventListener('click', saveSession); $('restoreStatisticsSession').addEventListener('click', restoreSession); $('copyStatisticsShareUrl').addEventListener('click', copyShareUrl);
    $('exportStatisticsSummary').addEventListener('click', function () { try { exportSummary(); } catch (error) { showError(error); } });
    $('exportStatisticsData').addEventListener('click', function () { try { exportCleanData(); } catch (error) { showError(error); } });
    $('exportStatisticsJson').addEventListener('click', function () { try { download('foko-lab-statistics-result.json', JSON.stringify(serialisableResult(), null, 2), 'application/json'); } catch (error) { showError(error); } });
    $('exportStatisticsR').addEventListener('click', function () { try { exportValidation('r'); } catch (error) { showError(error); } });
    $('exportStatisticsPython').addEventListener('click', function () { try { exportValidation('python'); } catch (error) { showError(error); } });
    document.querySelectorAll('[data-jump]').forEach(function (button) { button.addEventListener('click', function () { const target = document.querySelector(button.dataset.jump); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.querySelectorAll('[data-jump]').forEach(function (item) { item.classList.toggle('active', item === button); }); }); });
    window.addEventListener('resize', applyLayout);
  }

  function init() {
    if (!DATA || !STATS || !root.Plotly) return showError(new Error('Required local scientific libraries failed to load.'));
    renderPresetLibrary();
    const storedLayout = safeParse(localStorage.getItem(LAYOUT_KEY));
    if (storedLayout && LAYOUTS.has(storedLayout.layout)) state.layout = storedLayout.layout;
    if (storedLayout && PLOT_SIDES.includes(storedLayout.focusSide)) state.focusSide = storedLayout.focusSide;
    bindEvents();
    const url = new URL(location.href); const shared = decodeState(url.searchParams.get('state'));
    if (shared) { try { restoreConfiguration(shared, 'Shared configuration'); } catch (_) { loadPreset(url.searchParams.get('example'), false); } }
    else loadPreset(url.searchParams.get('example'), false);
    applyLayout();
    if (!shared && url.searchParams.get('autorun') !== '0') root.setTimeout(runStatistics, 0);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { computeResult, assumptionsFor, bootstrapMeans, hedgesG };
  if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
