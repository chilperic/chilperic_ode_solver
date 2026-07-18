/* Foko Lab v72.5 Curve Fitting authored workspace.
 * The controller binds authored markup to pure data and fitting cores.
 * Engine provenance: FokoDataCore + FokoFitting.
 */
(function (root) {
  'use strict';

  const DATA = root.FokoDataCore;
  const FIT = root.FokoFitting;
  const PRESETS = root.FokoFittingPresets || {};
  const PLOT = root.FokoPlotLifecycle;
  const RELEASE = '72.48.0';
  const STORAGE_KEY = 'fokolab:v72.5:fitting-config';

  if (!DATA || !FIT || !PLOT) throw new Error('Curve Fitting Lab requires FokoDataCore, FokoFitting and FokoPlotLifecycle.');

  const $ = function (id) { return document.getElementById(id); };
  const state = {
    currentName: Object.keys(PRESETS)[0] || '',
    desiredRoles: null,
    dataset: null,
    result: null,
    prepared: null,
    config: null,
    runtime: 0,
    layout: 'two',
    focusSide: 'left',
    plotTypes: { left: 'fit-bands', right: 'residual-fitted' },
    lastPlotSide: 'left',
  };

  const PLOTS = {
    'fit-bands': {
      label: 'Fit + uncertainty bands',
      title: 'Observed data and fitted curve',
      evidence: 'The solid curve is the fitted conditional mean. Mean-confidence and prediction bands are local normal approximations conditional on the model, covariance estimate and residual assumptions.',
    },
    'residual-fitted': {
      label: 'Residuals vs fitted',
      title: 'Residual structure',
      evidence: 'Patterns in residuals versus fitted values can reveal nonlinearity, unequal variance or model misspecification. Absence of an obvious pattern is not proof of adequacy.',
    },
    qq: {
      label: 'Residual Q–Q',
      title: 'Residual quantiles',
      evidence: 'The Q–Q plot compares ordered residuals with a fitted normal reference. Small samples provide weak evidence and dependence is not assessed.',
    },
    'observed-predicted': {
      label: 'Observed vs predicted',
      title: 'Observed and predicted response',
      evidence: 'Agreement with the identity line summarizes in-sample fit. It is not out-of-sample validation.',
    },
    'residual-order': {
      label: 'Residuals by row',
      title: 'Residual sequence',
      evidence: 'Residual order can reveal drift or serial structure when row order is meaningful. Formal time-series dependence is not tested here.',
    },
    cooks: {
      label: 'Cook-style influence',
      title: 'Influence sensitivity',
      evidence: 'Cook-style distances quantify local sensitivity under the fitted model. A large value is a diagnostic flag, not evidence that a row is erroneous.',
    },
    leverage: {
      label: 'Leverage',
      title: 'Design leverage',
      evidence: 'Leverage measures how unusual an observation is in the local model geometry. High leverage does not by itself imply a large residual or invalid data.',
    },
    'parameter-ci': {
      label: 'Parameter intervals',
      title: 'Parameter estimates and local intervals',
      evidence: 'Intervals use a local covariance approximation and normal critical values. For nonlinear, weakly identified or boundary parameters, profile or bootstrap evidence is preferable.',
    },
    bootstrap: {
      label: 'Pairs-bootstrap parameters',
      title: 'Seeded pairs-bootstrap distribution',
      evidence: 'Rows are resampled as exchangeable units. The displayed percentile distribution is finite, seed-dependent and invalid for clustered or serially dependent observations.',
    },
    profile: {
      label: 'Profile SSE',
      title: 'Profile objective scan',
      evidence: 'One parameter is fixed while the others are locally re-optimized. The scan is finite and local; it does not certify global identifiability.',
    },
    sensitivity: {
      label: 'Parameter sensitivity',
      title: 'Local curve sensitivities',
      evidence: 'Sensitivity traces are numerical derivatives of the fitted mean with respect to parameters. Similar traces can indicate practical confounding.',
    },
    ellipse: {
      label: 'First-two-parameter ellipse',
      title: 'Approximate joint parameter region',
      evidence: 'The ellipse is a local covariance approximation for the first two parameters. It is not a profile-likelihood or bootstrap confidence region.',
    },
    correlation: {
      label: 'Parameter correlation matrix',
      title: 'Local parameter correlation',
      evidence: 'Correlations are derived from the local covariance approximation. Values near ±1 indicate local confounding, not causality. A singular or unavailable covariance cannot support this plot.',
    },
    objective: {
      label: 'Optimization history',
      title: 'Nonlinear objective history',
      evidence: 'The history records accepted and rejected Levenberg–Marquardt steps. Numerical convergence is not a global optimum certificate.',
    },
  };
  root.FokoFittingPlotMeta = PLOTS;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function finite(value) { return Number.isFinite(Number(value)); }
  function number(value, digits) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    const magnitude = Math.abs(numeric);
    if (magnitude !== 0 && (magnitude >= 1e5 || magnitude < 1e-4)) return numeric.toExponential(digits == null ? 3 : digits);
    return numeric.toFixed(digits == null ? 4 : digits).replace(/\.?0+$/, '');
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function encodeState(value) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
  }
  function decodeState(value) {
    return JSON.parse(decodeURIComponent(escape(atob(value))));
  }

  function delimiterValue() {
    const value = $('fittingDelimiter').value;
    return value === '\\t' ? '\t' : value;
  }

  function assumptionsFor(config) {
    const pieces = [
      'The selected mean curve is correctly specified over the observed range.',
      'Rows represent independent observation units unless an external dependence model is used.',
    ];
    if (config.weighting === 'known-sigma') pieces.push('The sigma column contains known, strictly positive observation standard deviations and inverse-variance weighting is appropriate.');
    else pieces.push('Ordinary least squares assumes an approximately constant residual variance for classical local intervals.');
    if (config.missingPolicy === 'mean-impute') pieces.push('Mean-imputed values are a sensitivity device only; ordinary uncertainty is understated.');
    return pieces.join(' ');
  }

  function parseDatasetFromEditor(updateSelectors) {
    const dataset = DATA.parseDataset($('fittingData').value, { delimiter: delimiterValue(), header: 'auto' });
    state.dataset = dataset;
    renderDataSummary(dataset);
    if (updateSelectors !== false) renderColumnSelectors(dataset, state.desiredRoles);
    return dataset;
  }

  function renderDataSummary(dataset) {
    const numeric = dataset.columns.filter(function (column) { return column.type === 'numeric'; }).length;
    const categorical = dataset.columnCount - numeric;
    $('fittingDataSummary').innerHTML = `<b>${dataset.rowCount}</b> rows · <b>${dataset.columnCount}</b> columns · <b>${numeric}</b> numeric · <b>${categorical}</b> categorical · <b>${dataset.missingCells}</b> missing cells · delimiter <code>${dataset.delimiter === '\t' ? 'tab' : escapeHtml(dataset.delimiter)}</code>`;
  }

  function findColumnIndex(dataset, preferred, fallback, excluded) {
    const blocked = new Set(excluded || []);
    if (preferred) {
      const exact = dataset.names.findIndex(function (name, index) { return name === preferred && dataset.columns[index].type === 'numeric' && !blocked.has(index); });
      if (exact >= 0) return exact;
    }
    if (fallback) {
      const fallbackIndex = dataset.names.findIndex(function (name, index) { return name === fallback && dataset.columns[index].type === 'numeric' && !blocked.has(index); });
      if (fallbackIndex >= 0) return fallbackIndex;
    }
    const first = dataset.columns.find(function (column) { return column.type === 'numeric' && !blocked.has(column.index); });
    return first ? first.index : 0;
  }

  function renderColumnSelectors(dataset, roles) {
    const numericColumns = dataset.columns.filter(function (column) { return column.type === 'numeric'; });
    if (numericColumns.length < 2) throw new Error('Curve fitting requires at least two numeric columns.');
    const options = numericColumns.map(function (column) {
      return `<option value="${column.index}">${escapeHtml(column.name)}${column.missing ? ` · ${column.missing} missing` : ''}</option>`;
    }).join('');
    $('fittingX').innerHTML = options;
    $('fittingY').innerHTML = options;
    $('fittingSigma').innerHTML = `<option value="">Not selected</option>${options}`;
    const desired = roles || {};
    const xIndex = findColumnIndex(dataset, desired.x, 'x');
    const yIndex = findColumnIndex(dataset, desired.y, 'y', [xIndex]);
    const sigmaIndex = findColumnIndex(dataset, desired.sigma, 'sigma', [xIndex, yIndex]);
    $('fittingX').value = String(xIndex);
    $('fittingY').value = String(yIndex);
    $('fittingSigma').value = desired.sigma && dataset.names[sigmaIndex] === desired.sigma ? String(sigmaIndex) : '';
    state.desiredRoles = null;
  }

  function renderPresetLibrary() {
    const names = Object.keys(PRESETS);
    $('fittingSelect').innerHTML = names.map(function (name) {
      return `<option value="${escapeHtml(name)}">${escapeHtml(PRESETS[name].title)}</option>`;
    }).join('');
    $('fittingDeck').innerHTML = names.map(function (name) {
      const preset = PRESETS[name];
      return `<button class="${name === state.currentName ? 'active' : ''}" data-preset="${escapeHtml(name)}" type="button"><b>${escapeHtml(preset.title)}</b><small>${escapeHtml(preset.family)}</small></button>`;
    }).join('');
    if (PRESETS[state.currentName]) $('fittingSelect').value = state.currentName;
  }

  function updateEquation() {
    try {
      const info = FIT.modelInfo($('fittingModel').value);
      $('fittingEquation').textContent = `${info.equation}. Parameters: ${info.names.join(', ')}.`;
    } catch (error) {
      $('fittingEquation').textContent = error.message;
    }
    const useSigma = $('fittingWeighting').value === 'known-sigma';
    $('fittingSigma').disabled = !useSigma;
  }

  function loadPreset(name, recompute) {
    const preset = PRESETS[name] || PRESETS[Object.keys(PRESETS)[0]];
    if (!preset) throw new Error('No Curve Fitting preset is available.');
    state.currentName = Object.keys(PRESETS).find(function (key) { return PRESETS[key] === preset; }) || name;
    state.desiredRoles = { x: preset.x, y: preset.y, sigma: preset.sigma };
    $('fittingData').value = preset.data;
    $('fittingModel').value = preset.model;
    $('fittingWeighting').value = preset.weighting || 'ordinary';
    $('fittingInitial').value = preset.initial || '';
    $('fittingProfile').checked = preset.computeProfile !== false;
    $('fittingNarrative').textContent = preset.narrative;
    $('fittingScientificNote').textContent = preset.scientificNote;
    $('fittingDelimiter').value = 'auto';
    renderPresetLibrary();
    parseDatasetFromEditor(true);
    updateEquation();
    clearComputedEvidence('Example loaded. Fit the model to generate numerical evidence.');
    if (recompute) runFitting();
  }

  function currentConfig() {
    return {
      version: RELEASE,
      example: state.currentName,
      data: $('fittingData').value,
      delimiter: $('fittingDelimiter').value,
      missingPolicy: $('fittingMissingPolicy').value,
      model: $('fittingModel').value,
      x: Number($('fittingX').value),
      y: Number($('fittingY').value),
      weighting: $('fittingWeighting').value,
      sigma: $('fittingSigma').value === '' ? null : Number($('fittingSigma').value),
      initial: $('fittingInitial').value.trim(),
      alpha: Number($('fittingAlpha').value),
      bootstrapReplicates: Number($('fittingBootstrapReps').value),
      bootstrapSeed: Number($('fittingSeed').value),
      maxIterations: Number($('fittingMaxIterations').value),
      computeProfile: $('fittingProfile').checked,
      layout: state.layout,
      focusSide: state.focusSide,
      plotTypes: clone(state.plotTypes),
    };
  }

  function parseInitial(config) {
    if (!config.initial) return null;
    const values = config.initial.split(/[\s,;]+/).filter(Boolean).map(Number);
    const expected = FIT.modelInfo(config.model).names.length;
    if (values.length !== expected || !values.every(Number.isFinite)) throw new Error(`Initial guesses must contain ${expected} finite values for ${config.model}.`);
    return values;
  }

  function validateSettings(config) {
    if (!(config.alpha > 0 && config.alpha < 0.5)) throw new Error('Significance α must be between 0 and 0.5.');
    if (!Number.isInteger(config.bootstrapReplicates) || config.bootstrapReplicates < 0 || config.bootstrapReplicates > 5000) throw new Error('Bootstrap resamples must be an integer from 0 to 5,000.');
    if (!Number.isInteger(config.maxIterations) || config.maxIterations < 20 || config.maxIterations > 2000) throw new Error('Maximum nonlinear iterations must be an integer from 20 to 2,000.');
    if (config.x === config.y) throw new Error('X and Y must use different columns.');
    if (config.weighting === 'known-sigma' && config.sigma == null) throw new Error('Select a sigma column for inverse-variance weighting.');
    if (config.weighting === 'known-sigma' && (config.sigma === config.x || config.sigma === config.y)) throw new Error('The sigma column must be distinct from X and Y.');
  }

  function prepareFittingData(dataset, config) {
    const required = [
      { index: config.x, type: 'numeric', label: 'X' },
      { index: config.y, type: 'numeric', label: 'Y' },
    ];
    if (config.weighting === 'known-sigma') required.push({ index: config.sigma, type: 'numeric', label: 'Sigma' });
    const prepared = DATA.prepareRows(dataset, required, config.missingPolicy);
    const x = prepared.rows.map(function (row) { return Number(row.cells[config.x]); });
    const y = prepared.rows.map(function (row) { return Number(row.cells[config.y]); });
    const sigmas = config.weighting === 'known-sigma' ? prepared.rows.map(function (row) { return Number(row.cells[config.sigma]); }) : null;
    if (prepared.usableRows < 3) throw new Error('At least three usable observations are required.');
    if (sigmas && !sigmas.every(function (value) { return Number.isFinite(value) && value > 0; })) throw new Error('Every selected sigma value must be strictly positive.');
    return Object.assign(prepared, { x, y, sigmas, pairs: x.map(function (value, index) { return [value, y[index]]; }) });
  }

  function runFitting() {
    const button = $('runFitting');
    button.disabled = true;
    $('fittingProgress').style.width = '35%';
    $('fittingStatus').textContent = 'Parsing data and fitting the selected curve…';
    try {
      const config = currentConfig();
      validateSettings(config);
      const dataset = parseDatasetFromEditor(false);
      const prepared = prepareFittingData(dataset, config);
      const started = performance.now();
      const result = FIT.fit(prepared.pairs, config.model, {
        sigmas: config.weighting === 'known-sigma' ? prepared.sigmas : undefined,
        initialParams: parseInitial(config) || undefined,
        alpha: config.alpha,
        bootstrapReplicates: config.bootstrapReplicates,
        bootstrapSeed: config.bootstrapSeed,
        maxIterations: config.maxIterations,
        computeProfile: config.computeProfile,
      });
      state.runtime = performance.now() - started;
      state.result = result;
      state.prepared = prepared;
      state.config = config;
      if (prepared.imputed > 0) result.warnings.unshift(`${prepared.imputed} selected numeric cells were mean-imputed. Classical uncertainty does not account for imputation.`);
      if (prepared.dropped > 0) result.warnings.unshift(`${prepared.dropped} source rows were excluded because selected fitting fields were missing or non-numeric.`);
      renderResult();
      $('fittingProgress').style.width = '100%';
      $('fittingStatus').textContent = result.converged ? 'Fit completed with recorded numerical evidence.' : `Fit returned without satisfying a convergence tolerance: ${result.terminationReason}.`;
    } catch (error) {
      clearComputedEvidence(`Fit failed: ${error.message}`);
      $('fittingTopStatus').textContent = 'Failed';
      $('provenanceStatus').textContent = 'Failed';
      $('provenanceWarning').textContent = error.message;
      $('fittingStatus').textContent = `Error: ${error.message}`;
      $('fittingProgress').style.width = '0%';
    } finally {
      button.disabled = false;
    }
  }

  function availablePlotTypes() {
    if (!state.result) return [];
    const result = state.result;
    const available = ['fit-bands', 'residual-fitted', 'qq', 'observed-predicted', 'residual-order', 'cooks', 'leverage', 'parameter-ci', 'sensitivity'];
    if (result.bootstrap && result.bootstrap.replicates > 0) available.push('bootstrap');
    if (result.profileLikelihood && result.profileLikelihood.length) available.push('profile');
    if (result.confidenceEllipse && result.confidenceEllipse.points) available.push('ellipse');
    if (result.parameterCorrelation && result.parameterCorrelation.matrix.length) available.push('correlation');
    if (result.objectiveHistory && result.objectiveHistory.length > 1) available.push('objective');
    return available;
  }

  function ensurePlotSelections(available) {
    const defaults = { left: 'fit-bands', right: 'residual-fitted' };
    ['left', 'right'].forEach(function (side) {
      if (!available.includes(state.plotTypes[side])) state.plotTypes[side] = available.includes(defaults[side]) ? defaults[side] : available[0];
      const select = $(`${side}PlotType`);
      select.innerHTML = available.map(function (type) { return `<option value="${type}">${escapeHtml(PLOTS[type].label)}</option>`; }).join('');
      select.value = state.plotTypes[side];
      const card = document.querySelector(`[data-plot-card="${side}"]`);
      card.dataset.unavailable = available.length ? 'false' : 'true';
    });
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('fitting');
}

  function chartLayout(xTitle, yTitle) {
    return {
      margin: { t: 18, r: 20, b: 58, l: 62 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      font: { family: 'Inter, system-ui, sans-serif', size: 11, color: '#334155' },
      legend: { orientation: 'h', y: 1.12, x: 0 },
      xaxis: { title: xTitle, automargin: true, gridcolor: '#e8eef2', zerolinecolor: '#c8d3dc' },
      yaxis: { title: yTitle, automargin: true, gridcolor: '#e8eef2', zerolinecolor: '#c8d3dc' },
      hovermode: 'closest',
    };
  }

  function tracesFor(type) {
    const result = state.result;
    const prepared = state.prepared;
    const xName = state.dataset.names[state.config.x];
    const yName = state.dataset.names[state.config.y];
    const x = prepared.x;
    const y = prepared.y;
    const rowNumbers = prepared.rows.map(function (row) { return row.index; });
    const identityMinimum = Math.min.apply(null, y.concat(result.pred));
    const identityMaximum = Math.max.apply(null, y.concat(result.pred));
    if (type === 'fit-bands') {
      const bands = result.predictionBands;
      const traces = [];
      if (result.predictionBandAvailable) {
        traces.push(
          { x: bands.map(function (point) { return point.x; }), y: bands.map(function (point) { return point.predLo; }), mode: 'lines', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, name: 'prediction lower' },
          { x: bands.map(function (point) { return point.x; }), y: bands.map(function (point) { return point.predHi; }), mode: 'lines', fill: 'tonexty', fillcolor: 'rgba(61, 142, 145, 0.10)', line: { width: 0 }, name: `${number((1 - state.config.alpha) * 100, 1)}% prediction band` }
        );
      }
      traces.push(
        { x: bands.map(function (point) { return point.x; }), y: bands.map(function (point) { return point.meanLo; }), mode: 'lines', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, name: 'mean lower' },
        { x: bands.map(function (point) { return point.x; }), y: bands.map(function (point) { return point.meanHi; }), mode: 'lines', fill: 'tonexty', fillcolor: 'rgba(61, 142, 145, 0.22)', line: { width: 0 }, name: `${number((1 - state.config.alpha) * 100, 1)}% mean interval` },
        { x: bands.map(function (point) { return point.x; }), y: bands.map(function (point) { return point.fit; }), mode: 'lines', line: { width: 3 }, name: 'fitted mean' },
        { x, y, mode: 'markers', marker: { size: 8, line: { width: 1 } }, name: 'observed data', text: rowNumbers.map(function (row) { return `source row ${row}`; }) }
      );
      return { traces, layout: chartLayout(xName, yName) };
    }
    if (type === 'residual-fitted') {
      return {
        traces: [
          { x: result.pred, y: result.residuals, mode: 'markers', marker: { size: 8 }, name: 'residuals', text: rowNumbers.map(function (row) { return `source row ${row}`; }) },
          { x: [Math.min.apply(null, result.pred), Math.max.apply(null, result.pred)], y: [0, 0], mode: 'lines', line: { dash: 'dash' }, name: 'zero' },
        ],
        layout: chartLayout('fitted response', 'observed − fitted'),
      };
    }
    if (type === 'qq') {
      const qq = FIT.qqData(result.residuals);
      const low = Math.min.apply(null, qq.theory.concat(qq.sample));
      const high = Math.max.apply(null, qq.theory.concat(qq.sample));
      return {
        traces: [
          { x: qq.theory, y: qq.sample, mode: 'markers', marker: { size: 8 }, name: 'ordered residuals' },
          { x: [low, high], y: [low, high], mode: 'lines', line: { dash: 'dash' }, name: 'normal reference' },
        ],
        layout: chartLayout('fitted normal quantile', 'residual quantile'),
      };
    }
    if (type === 'observed-predicted') {
      return {
        traces: [
          { x: result.pred, y, mode: 'markers', marker: { size: 8 }, name: 'observations', text: rowNumbers.map(function (row) { return `source row ${row}`; }) },
          { x: [identityMinimum, identityMaximum], y: [identityMinimum, identityMaximum], mode: 'lines', line: { dash: 'dash' }, name: 'identity' },
        ],
        layout: chartLayout('predicted response', 'observed response'),
      };
    }
    if (type === 'residual-order') {
      return {
        traces: [
          { x: rowNumbers, y: result.residuals, mode: 'lines+markers', name: 'residual sequence' },
          { x: [Math.min.apply(null, rowNumbers), Math.max.apply(null, rowNumbers)], y: [0, 0], mode: 'lines', line: { dash: 'dash' }, name: 'zero' },
        ],
        layout: chartLayout('source row', 'residual'),
      };
    }
    if (type === 'cooks') {
      const threshold = 4 / result.n;
      return {
        traces: [
          { x: rowNumbers, y: result.influence.cooksDistance, type: 'bar', name: 'Cook-style distance' },
          { x: [Math.min.apply(null, rowNumbers), Math.max.apply(null, rowNumbers)], y: [threshold, threshold], mode: 'lines', line: { dash: 'dash' }, name: '4/n heuristic' },
        ],
        layout: chartLayout('source row', 'Cook-style distance'),
      };
    }
    if (type === 'leverage') {
      const threshold = 2 * result.parameterCount / result.n;
      return {
        traces: [
          { x: rowNumbers, y: result.influence.leverage, type: 'bar', name: 'leverage' },
          { x: [Math.min.apply(null, rowNumbers), Math.max.apply(null, rowNumbers)], y: [threshold, threshold], mode: 'lines', line: { dash: 'dash' }, name: '2p/n heuristic' },
        ],
        layout: chartLayout('source row', 'leverage'),
      };
    }
    if (type === 'parameter-ci') {
      const parameters = result.parameterSummary;
      return {
        traces: [{
          x: parameters.map(function (parameter) { return parameter.value; }),
          y: parameters.map(function (parameter) { return parameter.name; }),
          mode: 'markers',
          marker: { size: 9 },
          error_x: {
            type: 'data',
            symmetric: false,
            array: parameters.map(function (parameter) { return Number.isFinite(parameter.ci[1]) ? parameter.ci[1] - parameter.value : 0; }),
            arrayminus: parameters.map(function (parameter) { return Number.isFinite(parameter.ci[0]) ? parameter.value - parameter.ci[0] : 0; }),
          },
          name: 'local interval',
        }],
        layout: chartLayout('parameter value', 'parameter'),
      };
    }
    if (type === 'bootstrap') {
      const summary = result.bootstrap.summary;
      return {
        traces: summary.map(function (parameter) {
          return { x: parameter.values, type: 'histogram', opacity: 0.56, name: parameter.name, histnorm: 'probability density', nbinsx: 28 };
        }),
        layout: Object.assign(chartLayout('bootstrap parameter value', 'density'), { barmode: 'overlay' }),
      };
    }
    if (type === 'profile') {
      return {
        traces: result.profileLikelihood.map(function (profile) {
          return { x: profile.values.map(function (point) { return point.value; }), y: profile.values.map(function (point) { return point.sse; }), mode: 'lines', name: profile.name };
        }),
        layout: chartLayout('fixed parameter value', 'weighted SSE'),
      };
    }
    if (type === 'sensitivity') {
      return {
        traces: result.sensitivity.map(function (series) { return { x: series.x, y: series.values, mode: 'lines', name: `∂y/∂${series.name}` }; }),
        layout: chartLayout(xName, 'local sensitivity'),
      };
    }
    if (type === 'ellipse') {
      const ellipse = result.confidenceEllipse;
      return {
        traces: [
          { x: ellipse.points.map(function (point) { return point.x; }), y: ellipse.points.map(function (point) { return point.y; }), mode: 'lines', name: `${number(ellipse.level * 100, 1)}% local ellipse` },
          { x: [result.coef[0]], y: [result.coef[1]], mode: 'markers', marker: { size: 10 }, name: 'estimate' },
        ],
        layout: chartLayout(ellipse.xName, ellipse.yName),
      };
    }
    if (type === 'correlation') {
      const correlation = result.parameterCorrelation;
      return {
        traces: [{ z: correlation.matrix, x: correlation.names, y: correlation.names, type: 'heatmap', zmin: -1, zmax: 1, text: correlation.matrix.map(function(row){return row.map(function(value){return Number.isFinite(value)?number(value,3):'—';});}), texttemplate: '%{text}', hovertemplate: '%{y} vs %{x}: %{z:.4f}<extra></extra>' }],
        layout: chartLayout('parameter', 'parameter'),
      };
    }
    if (type === 'objective') {
      const history = result.objectiveHistory;
      return {
        traces: [{ x: history.map(function (point) { return point.iteration; }), y: history.map(function (point) { return point.objective; }), mode: 'lines+markers', name: 'weighted SSE' }],
        layout: chartLayout('iteration', 'objective'),
      };
    }
    throw new Error(`Unsupported plot type: ${type}.`);
  }

  function renderPlot(side) {
    if (!state.result) return Promise.resolve();
    const host = $(`${side}Plot`);
    if (!host || host.offsetParent === null) return Promise.resolve();
    const type = state.plotTypes[side];
    const definition = PLOTS[type];
    const spec = tracesFor(type);
    $(`${side}PlotTitle`).textContent = definition.title;
    $(`${side}PlotEvidence`).textContent = definition.evidence;
    state.lastPlotSide = side;
    return PLOT.render(host, spec.traces, spec.layout, { responsive: true, displaylogo: false, scrollZoom: false });
  }

  function visiblePlotSides() {
    const grid = $('plotGrid');
    if (!grid || grid.dataset.layout !== 'focus') return ['left', 'right'];
    return [state.focusSide === 'right' ? 'right' : 'left'];
  }

  function renderPlots() {
    const available = availablePlotTypes(); ensurePlotSelections(available);
    requestAnimationFrame(function () { requestAnimationFrame(function () { visiblePlotSides().forEach(renderPlot); }); });
  }

  function diagnosticHtml() {
    const result = state.result;
    const rows = result.parameterSummary.map(function (parameter) {
      const interval = Number.isFinite(parameter.ci[0]) ? `[${number(parameter.ci[0])}, ${number(parameter.ci[1])}]` : 'unavailable';
      return `<tr><th>${escapeHtml(parameter.name)}</th><td>${number(parameter.value)}</td><td>${number(parameter.se)}</td><td>${escapeHtml(interval)}</td></tr>`;
    }).join('');
    const warnings = result.warnings.length
      ? `<h3>Warnings</h3><ul>${result.warnings.map(function (warning) { return `<li>${escapeHtml(warning)}</li>`; }).join('')}</ul>`
      : '<p>No automatic warning was triggered. This is not evidence that the model is adequate.</p>';
    const bootstrap = result.bootstrap && result.bootstrap.requested > 0
      ? `<p><b>Pairs bootstrap:</b> ${result.bootstrap.replicates}/${result.bootstrap.requested} successful resamples; seed ${result.bootstrap.seed}; ${result.bootstrap.failed} failed.</p>`
      : '<p><b>Pairs bootstrap:</b> not requested.</p>';
    const ident = result.identifiability || {};
    const corr = (ident.highCorrelationPairs || []).map(function(pair){ return `${escapeHtml(pair.left)}–${escapeHtml(pair.right)}: ${number(pair.correlation,3)}`; }).join('; ') || 'none above |0.95|';
    const profiles = (ident.profile || []).map(function(item){ return `<li><b>${escapeHtml(item.name)}:</b> ${escapeHtml(item.verdict)}; lower side ${item.leftCrosses?'bounded':'not bounded'}, upper side ${item.rightCrosses?'bounded':'not bounded'}.</li>`; }).join('') || '<li>Profile scans were not computed.</li>';
    const design = result.experimentalDesignAdvice || {};
    return `<div class="scientific-boundary"><h3>Identifiability verdict</h3><p><b>${escapeHtml(ident.practicalVerdict || 'not assessed')}.</b> ${escapeHtml(ident.sentence || '')}</p><p><b>Structural identifiability:</b> ${escapeHtml(ident.structuralVerdict || 'not assessed')}.</p><p><b>High local parameter correlations:</b> ${corr}</p><ul>${profiles}</ul><p><b>Experimental-design heuristic:</b> ${escapeHtml(design.sentence || 'unavailable')}</p><p>${escapeHtml(design.limitation || '')}</p></div><table class="diagnostic-table"><thead><tr><th>Parameter</th><th>Estimate</th><th>Local SE</th><th>${number((1 - state.config.alpha) * 100, 1)}% local interval</th></tr></thead><tbody>${rows}</tbody></table>
      <p><b>Weighting:</b> ${escapeHtml(result.weighting)} · <b>iterations:</b> ${result.iterations} · <b>accepted/rejected:</b> ${result.acceptedSteps}/${result.rejectedSteps} · <b>evaluations:</b> ${result.evaluations}</p>
      <p><b>Information criteria:</b> ${escapeHtml(result.informationCriterionBasis)}; compare only fits to the same response rows and likelihood specification.</p>
      <p><b>Normal-matrix diagonal condition indicator:</b> ${number(result.conditionIndicator)}. This is a scale warning, not a full condition-number certificate.</p>
      ${bootstrap}${warnings}`;
  }

  function renderResult() {
    const result = state.result;
    const config = state.config;
    const prepared = state.prepared;
    $('fittingTopStatus').textContent = result.converged ? 'Computed' : 'Unconfirmed convergence';
    $('fittingRuntime').textContent = `${number(state.runtime, 1)} ms`;
    $('fittingRowsMetric').textContent = `${prepared.usableRows}/${prepared.sourceRows}`;
    $('fittingModelMetric').textContent = result.model;
    $('fittingTermination').textContent = result.terminationReason;
    $('fittingRmse').textContent = number(result.rmse);
    $('fittingR2').textContent = number(result.r2);
    $('fittingAic').textContent = number(result.aic);
    $('fittingInfluence').textContent = number(result.maxCook);
    $('fittingDiagnostics').classList.remove('empty');
    $('fittingDiagnostics').innerHTML = diagnosticHtml();
    $('fittingResultKind').textContent = `${result.model} · ${result.weighting} · n=${result.n} · ${result.converged ? 'converged' : 'convergence not established'}`;
    $('provenanceStatus').textContent = result.converged ? 'Browser-computed fit' : 'Browser-computed candidate; convergence tolerance not met';
    $('provenanceMethod').textContent = FIT.modelInfo(config.model).linear ? 'Weighted linear least squares' : 'Damped Levenberg–Marquardt nonlinear least squares';
    $('provenanceData').textContent = `${prepared.sourceRows} source rows; ${prepared.usableRows} used; ${prepared.dropped} excluded; ${prepared.imputed} imputed`;
    $('provenanceAssumptions').textContent = assumptionsFor(config);
    $('provenanceReproducibility').textContent = `Configuration + bootstrap seed ${config.bootstrapSeed}; computed evidence must be regenerated`;
    $('provenanceWarning').textContent = result.warnings.length ? result.warnings.join(' ') : 'No automatic warning was triggered. Independent validation is still required.';
    renderPlots();
  }

  function clearPlot(side) {
    const host = $(`${side}Plot`);
    PLOT.clear(host, 'Run the fit to create a plot.');
    $(`${side}PlotEvidence`).textContent = 'No plot has been computed.';
  }

  function clearComputedEvidence(message) {
    state.result = null;
    state.prepared = null;
    state.config = null;
    state.runtime = 0;
    ['left', 'right'].forEach(clearPlot);
    $('fittingResultKind').textContent = 'No computed fit';
    $('fittingTopStatus').textContent = 'Ready';
    $('fittingRuntime').textContent = '—';
    $('fittingRowsMetric').textContent = '—';
    $('fittingModelMetric').textContent = '—';
    $('fittingTermination').textContent = '—';
    $('fittingRmse').textContent = '—';
    $('fittingR2').textContent = '—';
    $('fittingAic').textContent = '—';
    $('fittingInfluence').textContent = '—';
    $('fittingDiagnostics').classList.add('empty');
    $('fittingDiagnostics').textContent = message || 'Run a fit to see parameter estimates, uncertainty, residual evidence and warnings.';
    $('provenanceStatus').textContent = 'Not computed';
    $('provenanceMethod').textContent = 'Not run';
    $('provenanceData').textContent = state.dataset ? `${state.dataset.rowCount} parsed rows; no fit` : 'Not parsed';
    $('provenanceAssumptions').textContent = 'Not assessed';
    $('provenanceReproducibility').textContent = 'Configuration only';
    $('provenanceWarning').textContent = 'No numerical result exists yet.';
  }

  function effectiveLayout(requested) {
    return root.FokoLayoutStability.effectiveLayout(requested, { breakpoint: 1024, compatibleCount: 2 });
  }

  function applyLayout(requested, updateRequested) {
    if (updateRequested !== false) state.layout = requested === 'focus' ? 'focus' : 'two';
    const report = root.FokoLayoutStability.apply({
      grid: $('plotGrid'),
      preferred: state.layout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2
    });
    if (state.result) renderPlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('fitting');
    return report;
  }

  function restoreConfig(config, message) {
    if (!config || typeof config !== 'object') throw new Error('Stored fitting configuration is invalid.');
    $('fittingData').value = config.data || '';
    $('fittingDelimiter').value = config.delimiter || 'auto';
    $('fittingMissingPolicy').value = config.missingPolicy || 'analysis-complete';
    $('fittingModel').value = config.model || 'linear';
    $('fittingWeighting').value = config.weighting || 'ordinary';
    $('fittingInitial').value = config.initial || '';
    $('fittingAlpha').value = finite(config.alpha) ? config.alpha : 0.05;
    $('fittingBootstrapReps').value = Number.isInteger(config.bootstrapReplicates) ? config.bootstrapReplicates : 300;
    $('fittingSeed').value = Number.isInteger(config.bootstrapSeed) ? config.bootstrapSeed : 9144;
    $('fittingMaxIterations').value = Number.isInteger(config.maxIterations) ? config.maxIterations : 300;
    $('fittingProfile').checked = config.computeProfile !== false;
    state.currentName = config.example && PRESETS[config.example] ? config.example : state.currentName;
    state.desiredRoles = null;
    const dataset = parseDatasetFromEditor(true);
    if (Number.isInteger(config.x) && dataset.columns[config.x]) $('fittingX').value = String(config.x);
    if (Number.isInteger(config.y) && dataset.columns[config.y]) $('fittingY').value = String(config.y);
    if (Number.isInteger(config.sigma) && dataset.columns[config.sigma]) $('fittingSigma').value = String(config.sigma);
    else $('fittingSigma').value = '';
    state.layout = ['two', 'focus'].includes(config.layout) ? config.layout : 'two';
    state.focusSide = ['left', 'right'].includes(config.focusSide) ? config.focusSide : 'left';
    if (config.plotTypes) state.plotTypes = Object.assign(state.plotTypes, config.plotTypes);
    renderPresetLibrary();
    updateEquation();
    clearComputedEvidence(message || 'Configuration restored. Computed parameters and diagnostics were not restored.');
    applyLayout(state.layout, false);
  }

  function serializableResult() {
    if (!state.result) throw new Error('Run a fit before exporting results.');
    return {
      release: RELEASE,
      model: state.result.model,
      equation: state.result.equation,
      weighting: state.result.weighting,
      converged: state.result.converged,
      terminationReason: state.result.terminationReason,
      n: state.result.n,
      df: state.result.df,
      parameters: state.result.parameterSummary,
      rmse: state.result.rmse,
      r2: state.result.r2,
      adjustedR2: state.result.adjustedR2,
      aic: state.result.aic,
      bic: state.result.bic,
      informationCriterionBasis: state.result.informationCriterionBasis,
      predictionBandAvailable: state.result.predictionBandAvailable,
      sse: state.result.sse,
      weightedObjective: state.result.weightedObjective,
      conditionIndicator: state.result.conditionIndicator,
      influence: state.result.influence,
      bootstrap: state.result.bootstrap,
      warnings: state.result.warnings,
      configuration: state.config,
      dataPreparation: {
        sourceRows: state.prepared.sourceRows,
        usableRows: state.prepared.usableRows,
        dropped: state.prepared.dropped,
        imputed: state.prepared.imputed,
      },
    };
  }

  function exportParameterCsv() {
    if (!state.result) throw new Error('Run a fit before exporting.');
    const rows = [['parameter', 'estimate', 'local_se', 'interval_low', 'interval_high']];
    state.result.parameterSummary.forEach(function (parameter) { rows.push([parameter.name, parameter.value, parameter.se, parameter.ci[0], parameter.ci[1]]); });
    download('fokolab-fitting-parameters.csv', rows.map(function (row) { return row.map(csvCell).join(','); }).join('\n'), 'text/csv;charset=utf-8');
  }

  function exportFittedDataCsv() {
    if (!state.result) throw new Error('Run a fit before exporting.');
    const rows = [['source_row', 'x', 'y_observed', 'y_fitted', 'residual', 'standardized_residual', 'leverage', 'cook_style_distance']];
    state.prepared.rows.forEach(function (row, index) {
      rows.push([row.index, state.prepared.x[index], state.prepared.y[index], state.result.pred[index], state.result.residuals[index], state.result.influence.standardizedResiduals[index], state.result.influence.leverage[index], state.result.influence.cooksDistance[index]]);
    });
    download('fokolab-fitting-fitted-data.csv', rows.map(function (row) { return row.map(csvCell).join(','); }).join('\n'), 'text/csv;charset=utf-8');
  }

  function pythonValidationScript() {
    if (!state.result) throw new Error('Run a fit before exporting.');
    const config = state.config;
    const modelMap = {
      linear: 'lambda x, b0, b1: b0 + b1*x',
      quadratic: 'lambda x, b0, b1, b2: b0 + b1*x + b2*x**2',
      cubic: 'lambda x, b0, b1, b2, b3: b0 + b1*x + b2*x**2 + b3*x**3',
      exponential: 'lambda x, a, b: a*np.exp(b*x)',
      logistic: 'lambda x, K, r, x0: K/(1 + np.exp(-r*(x-x0)))',
      michaelis: 'lambda x, Vmax, Km: Vmax*x/(Km+x)',
    };
    return `# Foko Lab ${RELEASE} external validation scaffold\n# Browser estimates are starting values, not a substitute for independent model checking.\nimport numpy as np\nfrom scipy.optimize import curve_fit\n\nx = np.array(${JSON.stringify(state.prepared.x)}, dtype=float)\ny = np.array(${JSON.stringify(state.prepared.y)}, dtype=float)\nmodel = ${modelMap[config.model]}\np0 = np.array(${JSON.stringify(state.result.coef)}, dtype=float)\n${config.weighting === 'known-sigma' ? `sigma = np.array(${JSON.stringify(state.prepared.sigmas)}, dtype=float)\npopt, pcov = curve_fit(model, x, y, p0=p0, sigma=sigma, absolute_sigma=True, maxfev=${config.maxIterations * 20})` : `popt, pcov = curve_fit(model, x, y, p0=p0, maxfev=${config.maxIterations * 20})`}\nresidual = y - model(x, *popt)\nprint('parameters', popt)\nprint('standard errors', np.sqrt(np.diag(pcov)))\nprint('RMSE', np.sqrt(np.mean(residual**2)))\n# Add domain-specific residual, dependence, sensitivity and out-of-sample validation.\n`;
  }

  function exportCurrentPlot(format, side) {
    if (!state.result) throw new Error('Run a fit before exporting a plot.');
    const targetSide = side || state.lastPlotSide || state.focusSide;
    const host = $(`${targetSide}Plot`);
    root.Plotly.downloadImage(host, { format, filename: `fokolab-fitting-${state.plotTypes[targetSide]}`, width: 1400, height: 900, scale: 1 });
  }

  function safeAction(action) {
    try { action(); } catch (error) { $('fittingStatus').textContent = `Error: ${error.message}`; }
  }

  function bindEvents() {
    $('runFitting').addEventListener('click', runFitting);
    $('resetFitting').addEventListener('click', function () { loadPreset(state.currentName, false); });
    $('loadFitting').addEventListener('click', function () { loadPreset($('fittingSelect').value, false); });
    $('fittingSelect').addEventListener('change', function () { loadPreset(this.value, false); });
    $('fittingDeck').addEventListener('click', function (event) {
      const button = event.target.closest('[data-preset]');
      if (button) loadPreset(button.dataset.preset, false);
    });
    $('fittingFile').addEventListener('change', function () {
      const file = this.files && this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        $('fittingData').value = String(reader.result || '');
        state.currentName = '';
        try {
          parseDatasetFromEditor(true);
          clearComputedEvidence(`Uploaded data parsed from ${file.name}. Run the fit to create evidence.`);
          $('fittingStatus').textContent = `Uploaded data: ${file.name}`;
        } catch (error) { $('fittingStatus').textContent = `Upload error: ${error.message}`; }
      };
      reader.readAsText(file);
    });
    $('fittingDelimiter').addEventListener('change', function () {
      safeAction(function () { parseDatasetFromEditor(true); clearComputedEvidence('Delimiter changed. Computed evidence was invalidated.'); });
    });
    ['fittingModel', 'fittingWeighting'].forEach(function (id) {
      $(id).addEventListener('change', function () { updateEquation(); clearComputedEvidence('Model configuration changed. Computed evidence was invalidated.'); });
    });
    ['fittingData', 'fittingMissingPolicy', 'fittingX', 'fittingY', 'fittingSigma', 'fittingInitial', 'fittingAlpha', 'fittingBootstrapReps', 'fittingSeed', 'fittingMaxIterations', 'fittingProfile'].forEach(function (id) {
      $(id).addEventListener('change', function () { clearComputedEvidence('Input or fitting settings changed. Computed evidence was invalidated.'); });
    });
    ['left', 'right'].forEach(function (side) {
      $(`${side}PlotType`).addEventListener('change', function () { state.plotTypes[side] = this.value; renderPlot(side); });
    });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) {
      button.addEventListener('click', function () { applyLayout(button.dataset.layoutMode, true); });
    });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) {
      button.addEventListener('click', function () { state.focusSide = button.dataset.focusSide; state.layout = 'focus'; applyLayout('focus', true); });
    });
    document.querySelectorAll('[data-export-side]').forEach(function (button) {
      button.addEventListener('click', function () { safeAction(function () { exportCurrentPlot('png', button.dataset.exportSide); }); });
    });
    $('exportFittingPng').addEventListener('click', function () { safeAction(function () { exportCurrentPlot('png'); }); });
    $('exportFittingSvg').addEventListener('click', function () { safeAction(function () { exportCurrentPlot('svg'); }); });
    $('saveFittingSession').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig()));
      $('fittingStatus').textContent = 'Configuration saved locally. Computed evidence was not stored.';
    });
    $('restoreFittingSession').addEventListener('click', function () {
      safeAction(function () {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) throw new Error('No saved Curve Fitting configuration exists in this browser.');
        restoreConfig(JSON.parse(stored), 'Configuration restored. Computed parameters and diagnostics were not restored.');
      });
    });
    $('copyFittingShareUrl').addEventListener('click', function () {
      safeAction(function () {
        const url = new URL(window.location.href);
        url.searchParams.set('state', encodeState(currentConfig()));
        navigator.clipboard.writeText(url.toString());
        $('fittingStatus').textContent = 'Share URL copied. It contains configuration only, not computed evidence.';
      });
    });
    $('exportFittingSummary').addEventListener('click', function () { safeAction(exportParameterCsv); });
    $('exportFittingData').addEventListener('click', function () { safeAction(exportFittedDataCsv); });
    $('exportFittingJson').addEventListener('click', function () { safeAction(function () { download('fokolab-fitting-result.json', JSON.stringify(serializableResult(), null, 2), 'application/json;charset=utf-8'); }); });
    $('exportFittingPython').addEventListener('click', function () { safeAction(function () { download('fokolab-fitting-validation.py', pythonValidationScript(), 'text/x-python;charset=utf-8'); }); });
    document.querySelectorAll('[data-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = document.querySelector(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.side-nav .nav-item').forEach(function (item) { item.classList.toggle('active', item === button); });
      });
    });
    window.addEventListener('resize', function () { applyLayout(state.layout, false); });
  }

  function initialise() {
    renderPresetLibrary();
    bindEvents();
    const query = new URLSearchParams(window.location.search);
    const shared = query.get('state');
    if (shared) {
      try {
        restoreConfig(decodeState(shared), 'Shared configuration loaded. Computed parameters and diagnostics were not restored.');
        $('fittingStatus').textContent = 'Shared configuration loaded. Run the fit to regenerate evidence.';
        return;
      } catch (error) {
        $('fittingStatus').textContent = `Shared-state error: ${error.message}`;
      }
    }
    const requested = query.get('example');
    loadPreset(requested && PRESETS[requested] ? requested : state.currentName, false);
    setTimeout(runFitting, 60);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise);
  else initialise();
}(typeof window !== 'undefined' ? window : globalThis));
