/* Foko Lab v72.6 Linear Algebra authored workspace.
 * The controller binds authored markup to the pure FokoLinalgReference core.
 */
(function (root) {
  'use strict';

  const CORE = root.FokoLinalgReference;
  const PRESETS = root.FokoLinalgPresets || {};
  const PLOT = root.FokoPlotLifecycle;
  const RELEASE = '72.48.0';
  const STORAGE_KEY = 'fokolab:v72.6:linalg-config';
  if (!CORE || !PLOT) throw new Error('Linear Algebra Lab requires FokoLinalgReference and FokoPlotLifecycle.');

  const $ = function (id) { return document.getElementById(id); };
  const state = {
    currentName: Object.keys(PRESETS)[0] || '',
    matrix: null,
    vector: null,
    summary: null,
    result: null,
    config: null,
    runtime: 0,
    layout: 'two',
    focusSide: 'left',
    plotTypes: { left: 'matrix', right: 'singular-values' },
    lastPlotSide: 'left'
  };

  const PLOTS = {
    matrix: { label: 'Matrix heatmap', title: 'Matrix entries', evidence: 'The heatmap shows the entered values only. Visual patterns do not establish rank, stability or conditioning.' },
    'singular-values': { label: 'Singular-value spectrum', title: 'Singular-value diagnostics', evidence: 'Singular values are estimated from eigenvalues of AᵀA for small dense matrices. Very small values are sensitive to scaling and floating-point error.' },
    'eigen-values': { label: 'Symmetric eigenvalues', title: 'Symmetric eigenspectrum', evidence: 'Real eigenvalues are computed only when A is symmetric within tolerance. The residual norms quantify numerical consistency of each eigenpair.' },
    residual: { label: 'Residual components', title: 'Equation residual', evidence: 'Residual components show Ax−b, reconstruction error or eigenpair residuals. A small residual does not remove sensitivity caused by poor conditioning.' },
    solution: { label: 'Solution / coefficients', title: 'Computed vector', evidence: 'The displayed vector is the numerical solution or least-squares coefficient estimate. Uncertainty in A and b is not propagated.' },
    transform: { label: '2D transformed grid', title: 'Two-dimensional linear map', evidence: 'Available only for a 2×2 matrix. The regular grid is mapped by A; geometry depends on the chosen coordinate basis and scale.' },
    pca: { label: 'PCA score map', title: 'First two principal-component scores', evidence: 'Rows are treated as observations and columns as variables. PCA is descriptive and sensitive to centering, scaling and outliers.' },
    'explained-variance': { label: 'PCA explained variance', title: 'Variance fractions', evidence: 'Variance fractions summarize the sample covariance matrix. They do not imply causal or mechanistic importance.' },
    markov: { label: 'Stationary candidate', title: 'Stationary distribution candidate', evidence: 'The bars show a power-iteration candidate satisfying Pᵀπ≈π. Uniqueness, irreducibility and mixing time are not certified.' },
    nullspace: { label: 'Null-space basis', title: 'Null-space basis vectors', evidence: 'Each row is a computed basis vector v with Av≈0 under the selected tolerance. Rank and nullity are tolerance-dependent.' },
    reconstruction: { label: 'Reconstruction error', title: 'Matrix reconstruction residual', evidence: 'The heatmap shows A A⁻¹−I, PA−LU, or a related reconstruction when available. It is a numerical check, not a proof of exact invertibility.' }
  };
  root.FokoLinalgPlotMeta = PLOTS;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, digits) {
    const x = Number(value);
    if (!Number.isFinite(x)) return x === Infinity ? '∞' : '—';
    const d = digits == null ? 4 : digits;
    if (x !== 0 && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-4)) return x.toExponential(3);
    return x.toFixed(d).replace(/\.?0+$/, '');
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function encodeState(value) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
  function decodeState(value) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }

  function configFromInputs() {
    return {
      matrixText: $('linalgMatrix').value,
      vectorText: $('linalgVector').value,
      operation: $('linalgOperation').value,
      tolerance: Math.max(1e-15, Number($('linalgTolerance').value) || 1e-12),
      maxIterations: Math.max(10, Math.floor(Number($('linalgMaxIterations').value) || 5000))
    };
  }

  function applyConfig(config) {
    $('linalgMatrix').value = config.matrixText || '';
    $('linalgVector').value = config.vectorText || '';
    $('linalgOperation').value = config.operation || 'summary';
    $('linalgTolerance').value = String(config.tolerance == null ? 1e-12 : config.tolerance);
    $('linalgMaxIterations').value = String(config.maxIterations == null ? 5000 : config.maxIterations);
    clearComputedEvidence('Configuration loaded. Compute to regenerate matrix evidence.');
    previewInput();
  }

  function importLinalgFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const raw = String(reader.result || '');
        if (/\.json$/i.test(file.name)) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) applyConfig({ matrixText: parsed.map(function (row) { return row.join(','); }).join('\n'), vectorText: '', operation: 'summary' });
          else applyConfig(parsed.config || parsed);
        } else applyConfig(Object.assign(configFromInputs(), { matrixText: raw.trim(), vectorText: '' }));
        $('linalgStatus').textContent = 'Imported input. Compute to generate numerical evidence.';
      } catch (error) { $('linalgStatus').textContent = 'Import failed: ' + error.message; }
      $('linalgImport').value = '';
    };
    reader.onerror = function () { $('linalgStatus').textContent = 'Could not read the selected matrix file.'; };
    reader.readAsText(file);
  }

  function renderPresetLibrary() {
    const names = Object.keys(PRESETS);
    $('linalgSelect').innerHTML = names.map(function (name) { return '<option value="' + escapeHtml(name) + '">' + escapeHtml(PRESETS[name].title) + '</option>'; }).join('');
    $('linalgDeck').innerHTML = names.map(function (name) {
      return '<button class="' + (name === state.currentName ? 'active' : '') + '" data-preset="' + escapeHtml(name) + '" type="button"><b>' + escapeHtml(PRESETS[name].title) + '</b><small>' + escapeHtml(PRESETS[name].operation) + '</small></button>';
    }).join('');
    $('linalgSelect').value = state.currentName;
  }

  function loadPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    state.currentName = name;
    $('linalgSelect').value = name;
    $('linalgMatrix').value = preset.matrix;
    $('linalgVector').value = preset.vector;
    $('linalgOperation').value = preset.operation;
    $('linalgNarrative').textContent = preset.title;
    $('linalgScientificNote').textContent = preset.note;
    document.querySelectorAll('#linalgDeck [data-preset]').forEach(function (button) { button.classList.toggle('active', button.dataset.preset === name); });
    clearComputedEvidence('Example loaded. Compute to create numerical evidence.');
    previewInput();
  }

  function previewInput() {
    try {
      const A = CORE.parseMatrix($('linalgMatrix').value);
      const b = CORE.parseVector($('linalgVector').value, true);
      $('linalgInputSummary').innerHTML = '<b>' + A.length + '×' + A[0].length + '</b> matrix · <b>' + b.length + '</b> vector entries · ' + (A.length === A[0].length ? 'square' : 'rectangular');
      $('linalgStatus').textContent = 'Input parsed. Compute to generate results.';
    } catch (error) {
      $('linalgInputSummary').textContent = error.message;
      $('linalgStatus').textContent = 'Input is invalid.';
    }
  }

  function computeResult(A, b, config) {
    const options = { tolerance: config.tolerance, rankTolerance: Math.sqrt(config.tolerance), maxSweeps: Math.min(config.maxIterations, 500), maxIterations: config.maxIterations };
    const summary = CORE.matrixSummary(A, options);
    let output = { operation: config.operation, summary: summary };
    if (config.operation === 'solve') output.solve = CORE.solveLinear(A, b, config.tolerance);
    else if (config.operation === 'inverse') output.inverse = CORE.inverse(A, config.tolerance);
    else if (config.operation === 'least-squares') output.leastSquares = CORE.leastSquares(A, b, config.tolerance);
    else if (config.operation === 'eigen') output.eigen = CORE.symmetricEigenDecomposition(A, { tolerance: config.tolerance, maxSweeps: Math.min(config.maxIterations, 500) });
    else if (config.operation === 'nullspace') output.nullspace = CORE.nullSpace(A, config.tolerance);
    else if (config.operation === 'pca') output.pca = CORE.pca(A, { tolerance: config.tolerance, maxSweeps: Math.min(config.maxIterations, 500) });
    else if (config.operation === 'markov') output.markov = CORE.stationaryDistribution(A, { tolerance: config.tolerance, maxIterations: config.maxIterations });
    return output;
  }

  function run() {
    const started = performance.now();
    $('linalgProgress').style.width = '35%';
    try {
      const config = configFromInputs();
      const A = CORE.parseMatrix(config.matrixText);
      const b = CORE.parseVector(config.vectorText, true);
      if (['solve', 'least-squares'].indexOf(config.operation) >= 0 && b.length !== A.length) throw new Error('Operation ' + config.operation + ' requires vector b to have one entry per matrix row.');
      state.matrix = A; state.vector = b; state.config = config;
      state.result = computeResult(A, b, config);
      state.summary = state.result.summary;
      state.runtime = performance.now() - started;
      renderResult();
      $('linalgStatus').textContent = 'Computation completed. Inspect residual and conditioning evidence.';
      $('linalgProgress').style.width = '100%';
      setTimeout(function () { $('linalgProgress').style.width = '0%'; }, 350);
    } catch (error) {
      state.result = null;
      $('linalgTopStatus').textContent = 'Failed';
      $('linalgStatus').textContent = error.message;
      $('provenanceStatus').textContent = 'Computation failed';
      $('provenanceWarning').textContent = error.message;
      $('linalgDiagnostics').classList.remove('empty');
      $('linalgDiagnostics').textContent = error.message;
      $('linalgProgress').style.width = '0%';
    }
  }

  function operationResidual() {
    const result = state.result || {};
    if (result.solve) return result.solve.residual;
    if (result.leastSquares) return result.leastSquares.residual;
    if (result.inverse) return [result.inverse.residualNorm];
    if (result.eigen) return result.eigen.residuals;
    if (result.nullspace) return result.nullspace.residualNorms;
    if (result.markov) return [result.markov.residualNorm];
    return [];
  }

  function residualMetric() {
    const values = operationResidual();
    return values.length ? Math.max.apply(null, values.map(Math.abs)) : null;
  }

  function availablePlotTypes() {
    const available = ['matrix', 'singular-values'];
    const A = state.matrix || [];
    if (A.length === 2 && A[0] && A[0].length === 2) available.push('transform');
    if (state.result && state.result.solve) available.push('solution', 'residual');
    if (state.result && state.result.leastSquares) available.push('solution', 'residual');
    if (state.result && state.result.inverse) available.push('reconstruction', 'residual');
    if (state.result && state.result.eigen) available.push('eigen-values', 'residual');
    if (state.result && state.result.nullspace) available.push('nullspace', 'residual');
    if (state.result && state.result.pca) available.push('pca', 'explained-variance', 'eigen-values');
    if (state.result && state.result.markov) available.push('markov', 'residual');
    return Array.from(new Set(available));
  }

  function ensurePlotSelections(available) {
    const defaults = ['matrix', 'singular-values'];
    const used = new Set();
    ['left', 'right'].forEach(function (side, index) {
      const card = document.querySelector('[data-plot-card="' + side + '"]');
      const isAvailable = index < Math.min(2, available.length);
      if (card) card.dataset.unavailable = isAvailable ? 'false' : 'true';
      let desired = state.plotTypes[side];
      if (!isAvailable) return;
      if (available.indexOf(desired) < 0 || used.has(desired)) desired = defaults[index] || available.find(function (type) { return !used.has(type); }) || available[0];
      state.plotTypes[side] = desired; used.add(desired);
      const select = $(side + 'PlotType');
      select.innerHTML = available.map(function (type) { return '<option value="' + type + '">' + escapeHtml(PLOTS[type].label) + '</option>'; }).join('');
      select.value = desired;
    });
    $('plotGrid').dataset.compatibleCount = String(Math.min(2, available.length));
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('linalg');
}

  function chartLayout(xTitle, yTitle) {
    return {
      margin: { t: 24, r: 18, b: 52, l: 58 },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      font: { family: 'Inter, system-ui, sans-serif', color: '#172033', size: 11 },
      xaxis: { title: xTitle, gridcolor: '#e7ebf1', zerolinecolor: '#bac4d0' },
      yaxis: { title: yTitle, gridcolor: '#e7ebf1', zerolinecolor: '#bac4d0' },
      legend: { orientation: 'h', y: 1.08 }
    };
  }

  function transformedGrid(A) {
    const traces = [];
    for (let k = -4; k <= 4; k += 1) {
      const x1 = []; const y1 = []; const x2 = []; const y2 = [];
      for (let t = -4; t <= 4; t += 0.2) {
        const p1 = CORE.matvec(A, [k, t]); const p2 = CORE.matvec(A, [t, k]);
        x1.push(p1[0]); y1.push(p1[1]); x2.push(p2[0]); y2.push(p2[1]);
      }
      traces.push({ x: x1, y: y1, mode: 'lines', line: { width: 1 }, hoverinfo: 'skip', showlegend: false });
      traces.push({ x: x2, y: y2, mode: 'lines', line: { width: 1 }, hoverinfo: 'skip', showlegend: false });
    }
    return traces;
  }

  function plotSpec(type) {
    const A = state.matrix; const result = state.result; const summary = state.summary;
    if (type === 'matrix') return { traces: [{ z: A, type: 'heatmap', colorscale: 'Viridis', colorbar: { title: 'value' } }], layout: chartLayout('column', 'row') };
    if (type === 'singular-values') return { traces: [{ x: summary.singularValues.map(function (_, i) { return i + 1; }), y: summary.singularValues, type: 'bar', name: 'σᵢ' }], layout: Object.assign(chartLayout('index', 'singular value'), { yaxis: { title: 'singular value', type: summary.singularValues.some(function (v) { return v > 0 && v < 1e-3; }) ? 'log' : 'linear', gridcolor: '#e7ebf1' } }) };
    if (type === 'eigen-values') {
      const values = result.eigen ? result.eigen.values : result.pca.eigenvalues;
      return { traces: [{ x: values.map(function (_, i) { return i + 1; }), y: values, type: 'bar', name: 'λᵢ' }], layout: chartLayout('index', 'eigenvalue') };
    }
    if (type === 'residual') {
      const residual = operationResidual();
      return { traces: [{ x: residual.map(function (_, i) { return i + 1; }), y: residual, type: 'bar', name: 'residual' }], layout: chartLayout('component', 'residual') };
    }
    if (type === 'solution') {
      const values = result.solve ? result.solve.solution : result.leastSquares.coefficients;
      return { traces: [{ x: values.map(function (_, i) { return 'x' + (i + 1); }), y: values, type: 'bar', name: 'computed vector' }], layout: chartLayout('component', 'value') };
    }
    if (type === 'transform') return { traces: transformedGrid(A), layout: Object.assign(chartLayout('transformed x', 'transformed y'), { yaxis: { title: 'transformed y', scaleanchor: 'x', gridcolor: '#e7ebf1' } }) };
    if (type === 'pca') return { traces: [{ x: result.pca.scores.map(function (row) { return row[0]; }), y: result.pca.scores.map(function (row) { return row[1] || 0; }), mode: 'markers+text', text: result.pca.scores.map(function (_, i) { return String(i + 1); }), textposition: 'top center', name: 'rows' }], layout: chartLayout('PC1 score', 'PC2 score') };
    if (type === 'explained-variance') return { traces: [{ x: result.pca.explainedVarianceRatio.map(function (_, i) { return i + 1; }), y: result.pca.explainedVarianceRatio, type: 'bar', name: 'fraction' }], layout: chartLayout('principal component', 'variance fraction') };
    if (type === 'markov') return { traces: [{ x: result.markov.distribution.map(function (_, i) { return 'state ' + (i + 1); }), y: result.markov.distribution, type: 'bar', name: 'π' }], layout: chartLayout('state', 'probability') };
    if (type === 'nullspace') return { traces: result.nullspace.basis.map(function (basis, i) { return { x: basis.map(function (_, j) { return j + 1; }), y: basis, mode: 'lines+markers', name: 'basis ' + (i + 1) }; }), layout: chartLayout('component', 'basis value') };
    if (type === 'reconstruction') {
      const residualMatrix = result.inverse.reconstruction.map(function (row, i) { return row.map(function (value, j) { return value - (i === j ? 1 : 0); }); });
      return { traces: [{ z: residualMatrix, type: 'heatmap', colorscale: 'RdBu', zmid: 0, colorbar: { title: 'error' } }], layout: chartLayout('column', 'row') };
    }
    throw new Error('Unsupported plot type: ' + type);
  }

  function renderPlot(side) {
    if (!state.result) return Promise.resolve();
    const host = $(side + 'Plot');
    if (!host || host.offsetParent === null) return Promise.resolve();
    const type = state.plotTypes[side]; const definition = PLOTS[type]; const spec = plotSpec(type);
    $(side + 'PlotTitle').textContent = definition.title;
    $(side + 'PlotEvidence').textContent = definition.evidence;
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

  function diagnosticsHtml() {
    const result = state.result; const summary = state.summary;
    const rows = [];
    rows.push('<tr><th>Shape</th><td>' + summary.rows + '×' + summary.columns + '</td></tr>');
    rows.push('<tr><th>Rank estimate</th><td>' + summary.rank + ' at tolerance ' + number(Math.sqrt(state.config.tolerance)) + '</td></tr>');
    rows.push('<tr><th>Condition estimate</th><td>' + number(summary.conditionEstimate) + '</td></tr>');
    rows.push('<tr><th>Frobenius norm</th><td>' + number(summary.frobeniusNorm) + '</td></tr>');
    if (summary.square) rows.push('<tr><th>Determinant</th><td>' + number(summary.determinant) + '</td></tr>');
    if (result.solve) rows.push('<tr><th>Relative solve residual</th><td>' + number(result.solve.relativeResidual) + '</td></tr>');
    if (result.leastSquares) rows.push('<tr><th>Least-squares residual norm</th><td>' + number(result.leastSquares.residualNorm) + '</td></tr>');
    if (result.inverse) rows.push('<tr><th>Inverse reconstruction norm</th><td>' + number(result.inverse.residualNorm) + '</td></tr>');
    if (result.eigen) rows.push('<tr><th>Maximum eigenpair residual</th><td>' + number(Math.max.apply(null, result.eigen.residuals)) + '</td></tr>');
    if (result.nullspace) rows.push('<tr><th>Nullity</th><td>' + result.nullspace.nullity + '</td></tr>');
    if (result.markov) rows.push('<tr><th>Stationary residual</th><td>' + number(result.markov.residualNorm) + '</td></tr>');
    const warnings = [];
    if (summary.conditionEstimate > 1e8) warnings.push('The condition estimate is large; small perturbations in the inputs may produce large changes in the answer.');
    if (summary.rank < Math.min(summary.rows, summary.columns)) warnings.push('The matrix is numerically rank deficient at the selected tolerance.');
    if (state.config.operation === 'pca') warnings.push('PCA is unscaled: variables with larger numerical variance can dominate.');
    if (state.config.operation === 'markov') warnings.push('Power iteration does not certify uniqueness, irreducibility or mixing time.');
    return '<table class="diagnostic-table"><tbody>' + rows.join('') + '</tbody></table><p><b>Method note:</b> ' + escapeHtml(summary.method) + '</p>' + (warnings.length ? '<h3>Warnings</h3><ul>' + warnings.map(function (warning) { return '<li>' + escapeHtml(warning) + '</li>'; }).join('') + '</ul>' : '<p>No automatic numerical warning was triggered. This is not proof that the result is scientifically adequate.</p>');
  }

  function methodDescription() {
    const operation = state.config.operation;
    return {
      summary: 'Dense matrix diagnostics using AᵀA singular-value estimates',
      solve: 'LU factorization with partial pivoting and residual evaluation',
      inverse: 'Repeated pivoted solves with A A⁻¹−I reconstruction residual',
      'least-squares': 'Modified Gram–Schmidt QR least squares',
      eigen: 'Jacobi rotations for real symmetric eigensystems',
      nullspace: 'Tolerance-based reduced row-echelon form',
      pca: 'Centered covariance eigendecomposition',
      markov: 'Power iteration for a row-stochastic finite transition matrix'
    }[operation];
  }

  function renderResult() {
    const summary = state.summary; const residual = residualMetric();
    $('linalgTopStatus').textContent = 'Computed';
    $('linalgRuntime').textContent = number(state.runtime, 1) + ' ms';
    $('linalgShape').textContent = summary.rows + '×' + summary.columns;
    $('linalgOperationMetric').textContent = state.config.operation;
    $('linalgResidualMetric').textContent = residual == null ? 'n/a' : number(residual);
    $('linalgRank').textContent = String(summary.rank);
    $('linalgCondition').textContent = number(summary.conditionEstimate);
    $('linalgDeterminant').textContent = summary.square ? number(summary.determinant) : 'n/a';
    $('linalgNorm').textContent = number(summary.frobeniusNorm);
    $('linalgDiagnostics').classList.remove('empty');
    $('linalgDiagnostics').innerHTML = diagnosticsHtml();
    $('linalgResultKind').textContent = state.config.operation + ' · ' + summary.rows + '×' + summary.columns + ' · rank ' + summary.rank;
    $('provenanceStatus').textContent = 'Browser-computed small dense result';
    $('provenanceMethod').textContent = methodDescription();
    $('provenanceData').textContent = summary.rows + ' rows × ' + summary.columns + ' columns; vector length ' + state.vector.length;
    $('provenanceAssumptions').textContent = 'Finite dense entries; tolerance ' + state.config.tolerance + '. Operation-specific assumptions are reported in the diagnostics.';
    $('provenanceReproducibility').textContent = 'Configuration only; result must be recomputed';
    $('provenanceWarning').textContent = summary.conditionEstimate > 1e8 ? 'High sensitivity warning: condition estimate exceeds 10⁸.' : 'No automatic warning was triggered. Independent numerical validation remains necessary.';
    renderPlots();
  }

  function clearPlot(side) {
    const host = $(side + 'Plot');
    PLOT.clear(host, 'Compute to create a plot.');
    $(side + 'PlotEvidence').textContent = 'No plot has been computed.';
  }

  function clearComputedEvidence(message) {
    state.matrix = null; state.vector = null; state.summary = null; state.result = null; state.config = null; state.runtime = 0;
    ['left', 'right'].forEach(clearPlot);
    $('linalgResultKind').textContent = 'No computed matrix result'; $('linalgTopStatus').textContent = 'Ready'; $('linalgRuntime').textContent = '—'; $('linalgShape').textContent = '—'; $('linalgOperationMetric').textContent = '—'; $('linalgResidualMetric').textContent = '—'; $('linalgRank').textContent = '—'; $('linalgCondition').textContent = '—'; $('linalgDeterminant').textContent = '—'; $('linalgNorm').textContent = '—';
    $('linalgDiagnostics').classList.add('empty'); $('linalgDiagnostics').textContent = message || 'Compute to see numerical output, residuals and limitations.';
    $('provenanceStatus').textContent = 'Not computed'; $('provenanceMethod').textContent = 'Not run'; $('provenanceData').textContent = 'Not parsed'; $('provenanceAssumptions').textContent = 'Not assessed'; $('provenanceReproducibility').textContent = 'Configuration only'; $('provenanceWarning').textContent = 'No numerical result exists yet.';
  }

  function effectiveLayout(requested) {
    const count = Number($('plotGrid').dataset.compatibleCount || 2);
    return root.FokoLayoutStability.effectiveLayout(requested, { breakpoint: 1024, compatibleCount: count });
  }
  function applyLayout(requested, updateState) {
    if (updateState !== false) state.layout = requested === 'focus' ? 'focus' : 'two';
    const count = Number($('plotGrid').dataset.compatibleCount || 2);
    const report = root.FokoLayoutStability.apply({
      grid: $('plotGrid'),
      preferred: state.layout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: count
    });
    if (state.result) renderPlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('linalg');
    return report;
  }

  function exportCurrent(format, side) {
    if (!state.result) return;
    const host = $((side || state.lastPlotSide) + 'Plot');
    root.Plotly.downloadImage(host, { format: format, filename: 'fokolab-linalg-' + state.plotTypes[side || state.lastPlotSide], width: 1200, height: 760 });
  }

  function serializableResult() { return { release: RELEASE, config: state.config, summary: state.summary, result: state.result, runtimeMs: state.runtime }; }
  function resultCsv() {
    const rows = [['metric', 'value'], ['rows', state.summary.rows], ['columns', state.summary.columns], ['rank', state.summary.rank], ['condition_estimate', state.summary.conditionEstimate], ['frobenius_norm', state.summary.frobeniusNorm], ['determinant', state.summary.determinant], ['residual_metric', residualMetric()]];
    return rows.map(function (row) { return row.join(','); }).join('\n') + '\n';
  }
  function pythonScript() {
    return '# Foko Lab v' + RELEASE + ' validation scaffold\nimport numpy as np\n\nA = np.array(' + JSON.stringify(state.matrix) + ', dtype=float)\nb = np.array(' + JSON.stringify(state.vector) + ', dtype=float)\nprint("shape", A.shape)\nprint("rank", np.linalg.matrix_rank(A))\nprint("singular values", np.linalg.svd(A, compute_uv=False))\nif A.shape[0] == A.shape[1] and b.size == A.shape[0]:\n    try:\n        x = np.linalg.solve(A, b)\n        print("solve residual", np.linalg.norm(A @ x - b))\n    except np.linalg.LinAlgError as exc:\n        print("solve unavailable", exc)\n';
  }

  function bindEvents() {
    $('runLinalg').addEventListener('click', run);
    $('resetLinalg').addEventListener('click', function () { loadPreset(state.currentName); });
    $('linalgImport').addEventListener('change', function () { importLinalgFile(this.files && this.files[0]); });
    $('loadLinalg').addEventListener('click', function () { loadPreset($('linalgSelect').value); });
    $('linalgSelect').addEventListener('change', function () { state.currentName = this.value; loadPreset(this.value); });
    $('linalgDeck').addEventListener('click', function (event) { const button = event.target.closest('[data-preset]'); if (button) loadPreset(button.dataset.preset); });
    ['linalgMatrix', 'linalgVector'].forEach(function (id) { $(id).addEventListener('input', previewInput); });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) { button.addEventListener('click', function () { applyLayout(button.dataset.layoutMode, true); }); });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) { button.addEventListener('click', function () { state.focusSide = button.dataset.focusSide; applyLayout('focus', true); }); });
    ['left', 'right'].forEach(function (side) { $(side + 'PlotType').addEventListener('change', function () { state.plotTypes[side] = this.value; renderPlot(side); }); });
    document.querySelectorAll('[data-export-side]').forEach(function (button) { button.addEventListener('click', function () { exportCurrent('png', button.dataset.exportSide); }); });
    $('exportLinalgPng').addEventListener('click', function () { exportCurrent('png'); });
    $('exportLinalgSvg').addEventListener('click', function () { exportCurrent('svg'); });
    $('saveLinalgSession').addEventListener('click', function () { localStorage.setItem(STORAGE_KEY, JSON.stringify(configFromInputs())); $('linalgStatus').textContent = 'Configuration saved locally. Computed evidence was not stored.'; });
    $('restoreLinalgSession').addEventListener('click', function () { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) { $('linalgStatus').textContent = 'No saved configuration exists.'; return; } applyConfig(JSON.parse(raw)); $('linalgStatus').textContent = 'Configuration restored. Computed evidence was not restored.'; });
    $('copyLinalgShareUrl').addEventListener('click', function () { const url = new URL(window.location.href); url.searchParams.set('state', encodeState(configFromInputs())); navigator.clipboard.writeText(url.toString()).then(function () { $('linalgStatus').textContent = 'Share URL copied. It contains configuration only.'; }); });
    $('exportLinalgCsv').addEventListener('click', function () { if (state.result) download('fokolab-linalg-summary.csv', resultCsv(), 'text/csv'); });
    $('exportLinalgJson').addEventListener('click', function () { if (state.result) download('fokolab-linalg-result.json', JSON.stringify(serializableResult(), null, 2), 'application/json'); });
    $('exportLinalgPython').addEventListener('click', function () { if (state.result) download('fokolab_linalg_validate.py', pythonScript(), 'text/x-python'); });
    document.querySelectorAll('[data-jump]').forEach(function (button) { button.addEventListener('click', function () { const target = document.querySelector(button.dataset.jump); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    window.addEventListener('resize', function () { applyLayout(state.layout, false); });
  }

  function restoreFromUrl() {
    const encoded = new URL(window.location.href).searchParams.get('state');
    if (!encoded) return false;
    try { applyConfig(decodeState(encoded)); $('linalgStatus').textContent = 'Configuration loaded from URL. Compute to regenerate evidence.'; return true; }
    catch (error) { $('linalgStatus').textContent = 'Share state could not be decoded.'; return false; }
  }

  function boot() {
    renderPresetLibrary(); bindEvents();
    if (!restoreFromUrl()) { const requested = new URL(window.location.href).searchParams.get('example'); loadPreset(requested && PRESETS[requested] ? requested : state.currentName); setTimeout(run, 40); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}(typeof window !== 'undefined' ? window : globalThis));
