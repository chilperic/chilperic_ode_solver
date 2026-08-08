(function (root) {
  'use strict';

  const Core = root.FokoSymbolicReference;
  const Steady = root.FokoSteadyCore;
  const Presets = root.FokoSymbolicPresets || {};
  const PLOT = root.FokoPlotLifecycle;
  if (!Core || !Steady || !PLOT) throw new Error('Symbolic Lab requires FokoSymbolicReference, FokoSteadyCore and FokoPlotLifecycle.');

  const RELEASE = '77.4.1';
  const STORAGE_KEY = 'fokolab-v72-symbolic-config';
  const LAYOUT_KEY = 'fokolab-v72-symbolic-layout';
  const VALID_LAYOUTS = new Set(['two', 'focus']);
  const VALID_SIDES = new Set(['left', 'right']);
  const $ = function (id) { return document.getElementById(id); };
  const state = {
    presetKey: 'logistic',
    result: null,
    preferredLayout: 'two',
    focusSide: 'left',
    plotType: { left: 'expression', right: 'derivative' },
    busy: false,
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character];
    });
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function finite(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function format(value, digits) {
    if (!Number.isFinite(value)) return 'not finite';
    const abs = Math.abs(value);
    if ((abs > 0 && abs < 1e-4) || abs >= 1e5) return value.toExponential(digits == null ? 4 : digits);
    return Number(value.toPrecision(digits == null ? 7 : digits)).toString();
  }
  function formatMs(value) { return Number.isFinite(value) ? `${value.toFixed(value < 10 ? 2 : 1)} ms` : '—'; }
  function parseNames(text, label) {
    const names = String(text || '').split(/[\s,;]+/).map(function (name) { return name.trim(); }).filter(Boolean);
    if (!names.length) throw new Error(label + ' requires at least one symbol.');
    const duplicates = names.filter(function (name, index) { return names.indexOf(name) !== index; });
    if (duplicates.length) throw new Error(label + ' contains duplicate symbol ' + duplicates[0] + '.');
    names.forEach(function (name) { if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Invalid symbol name: ' + name); });
    return names;
  }
  function renderPlotly(node, traces, layout) {
    return PLOT.render(node, traces, layout, plotConfig());
  }

  function plotLayout(title, xTitle, yTitle) {
    return {
      title: { text: title, font: { size: 15 } },
      margin: { l: 58, r: 24, t: 50, b: 54 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'system-ui, sans-serif', color: '#203047', size: 12 },
      xaxis: { title: xTitle || '', gridcolor: '#dce7ef', zerolinecolor: '#8da1b2', automargin: true },
      yaxis: { title: yTitle || '', gridcolor: '#dce7ef', zerolinecolor: '#8da1b2', automargin: true },
      showlegend: true,
      legend: { orientation: 'h', y: -0.22 },
      hovermode: 'closest',
    };
  }
  function plotConfig() { return { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }; }

  function currentPreset() { return Presets[state.presetKey] || Presets.logistic; }
  function setStatus(message, kind) {
    $('symbolicStatus').textContent = message;
    $('symbolicStatus').dataset.kind = kind || 'neutral';
  }
  function setBusy(busy, message) {
    state.busy = busy;
    $('runSymbolic').disabled = busy;
    $('resetSymbolic').disabled = busy;
    $('symbolicProgress').style.width = busy ? '55%' : '100%';
    if (message) setStatus(message, busy ? 'running' : 'ok');
  }
  function setError(error) {
    state.busy = false;
    $('runSymbolic').disabled = false;
    $('resetSymbolic').disabled = false;
    $('symbolicProgress').style.width = '0%';
    const message = error && error.message ? error.message : String(error);
    setStatus(message, 'error');
    $('symbolicTopStatus').textContent = 'Failed';
    $('symbolicDiagnostics').classList.remove('empty');
    $('symbolicDiagnostics').innerHTML = `<p class="v72-error">${escapeHtml(message)}</p>`;
  }

  function renderPresetOptions() {
    const keys = Object.keys(Presets);
    $('symbolicSelect').innerHTML = keys.map(function (key) {
      return `<option value="${escapeHtml(key)}">${escapeHtml(Presets[key].label)}</option>`;
    }).join('');
    $('symbolicSelect').value = state.presetKey;

    const familySelect = $('symbolicFamilyFilter');
    const families = Array.from(new Set(keys.map(function (key) { return Presets[key].family || 'Other'; }))).sort();
    const previousFamily = familySelect.value || 'all';
    familySelect.innerHTML = '<option value="all">All families</option>' + families.map(function (family) { return `<option value="${escapeHtml(family)}">${escapeHtml(family)}</option>`; }).join('');
    familySelect.value = families.includes(previousFamily) ? previousFamily : 'all';
    const query = String($('symbolicExampleSearch').value || '').trim().toLowerCase();
    const family = familySelect.value;
    const filtered = keys.filter(function (key) {
      const preset = Presets[key];
      const haystack = [preset.label, preset.family, preset.difficulty, preset.note].filter(Boolean).join(' ').toLowerCase();
      return (family === 'all' || preset.family === family) && (!query || haystack.includes(query));
    });
    $('symbolicExampleCount').textContent = `${filtered.length} of ${keys.length} examples`;
    $('symbolicDeck').innerHTML = filtered.length ? filtered.map(function (key) {
      const preset = Presets[key];
      return `<button type="button" class="model-card ${key === state.presetKey ? 'active' : ''}" data-symbolic-preset="${escapeHtml(key)}"><b>${escapeHtml(preset.label)}</b><small>${escapeHtml(preset.family)} · ${escapeHtml(preset.difficulty)}</small><span class="preset-action">Analyze</span></button>`;
    }).join('') : '<p class="field-help">No example matches this filter.</p>';
  }

  function loadPreset(key, compute) {
    if (!Presets[key]) throw new Error('Unknown symbolic example: ' + key);
    state.presetKey = key;
    const preset = Presets[key];
    renderPresetOptions();
    $('symbolicVariables').value = preset.variables.join(', ');
    $('symbolicParameters').value = preset.parameters.join(', ');
    $('symbolicExpressions').value = preset.expressions.join('\n');
    $('symbolicScope').value = preset.scope;
    $('symbolicXMin').value = preset.range[0];
    $('symbolicXMax').value = preset.range[1];
    $('symbolicSelectedExpression').value = String(preset.selectedExpression || 0);
    $('symbolicNarrative').textContent = preset.note;
    $('symbolicScientificNote').textContent = 'Supported grammar: explicit +, −, *, /, ^, parentheses, sin, cos, tan, exp, log and sqrt. Implicit multiplication and general special functions are rejected.';
    refreshExpressionAndVariableOptions(preset.selectedExpression || 0, preset.derivativeVariable || preset.variables[0]);
    clearComputedEvidence('Example loaded. Computed evidence was cleared.');
    if (compute !== false) runAnalysis();
  }

  function refreshExpressionAndVariableOptions(selectedIndex, derivativeVariable) {
    let variables = [];
    let expressions = [];
    try { variables = parseNames($('symbolicVariables').value, 'Variables'); } catch (_) { variables = []; }
    try { expressions = String($('symbolicExpressions').value || '').split(/\n+/).filter(function (line) { return line.trim(); }); } catch (_) { expressions = []; }
    const oldExpression = selectedIndex == null ? Number($('symbolicSelectedExpression').value || 0) : Number(selectedIndex);
    const oldVariable = derivativeVariable || $('symbolicDerivativeVariable').value;
    $('symbolicSelectedExpression').innerHTML = expressions.map(function (line, index) {
      const label = line.includes('=') ? line.split('=')[0].trim() : `f${index + 1}`;
      return `<option value="${index}">${escapeHtml(label || `f${index + 1}`)}</option>`;
    }).join('');
    $('symbolicSelectedExpression').value = String(Math.min(Math.max(0, oldExpression), Math.max(0, expressions.length - 1)));
    $('symbolicDerivativeVariable').innerHTML = variables.map(function (name) { return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`; }).join('');
    if (variables.includes(oldVariable)) $('symbolicDerivativeVariable').value = oldVariable;
  }

  function readConfig() {
    const variables = parseNames($('symbolicVariables').value, 'Variables');
    const parametersText = String($('symbolicParameters').value || '').trim();
    const parameters = parametersText ? parseNames(parametersText, 'Parameters') : [];
    const overlap = variables.filter(function (name) { return parameters.includes(name); });
    if (overlap.length) throw new Error(overlap[0] + ' cannot be both a variable and a parameter.');
    const expressions = Core.parseExpressions($('symbolicExpressions').value);
    if (expressions.length > 6) throw new Error('The browser reference scope is limited to six expressions. Export larger systems to SymPy.');
    const scope = Core.parseScope($('symbolicScope').value);
    variables.concat(parameters).forEach(function (name) {
      if (!Object.prototype.hasOwnProperty.call(scope, name)) throw new Error('Numeric scope is missing ' + name + '.');
    });
    const selectedIndex = Number($('symbolicSelectedExpression').value || 0);
    const derivativeVariable = $('symbolicDerivativeVariable').value || variables[0];
    const xMin = finite($('symbolicXMin').value, -5);
    const xMax = finite($('symbolicXMax').value, 5);
    const samples = Math.max(60, Math.min(1200, Math.round(finite($('symbolicSamples').value, 320))));
    const rootTolerance = Math.max(1e-12, finite($('symbolicRootTolerance').value, 1e-8));
    if (!(xMax > xMin)) throw new Error('x maximum must exceed x minimum.');
    return { variables, parameters, expressions, scope, selectedIndex, derivativeVariable, xMin, xMax, samples, rootTolerance };
  }

  function augmentEquilibrium(solution, config, analysis) {
    const scope = Object.assign({}, config.scope);
    config.variables.forEach(function (name, index) { scope[name] = solution.x[index]; });
    const J = Core.evaluateJacobian(analysis.jacobian, scope);
    const stability = Steady.classifyDynamicStability(J);
    return Object.assign({}, solution, { scope, jacobian: J, stability });
  }

  function computeEquilibria(config, analysis) {
    if (config.expressions.length !== config.variables.length || config.variables.length > 3) {
      return { status: 'not-applicable', reason: 'Numeric equilibrium search requires a square system with one to three variables.' };
    }
    const x0 = config.variables.map(function (name) { return config.scope[name]; });
    const residual = function (x) {
      const scope = Object.assign({}, config.scope);
      config.variables.forEach(function (name, index) { scope[name] = x[index]; });
      return config.expressions.map(function (expr) { return Core.evaluate(expr, scope); });
    };
    const multi = Steady.solveMultiStart({
      residual,
      x0,
      startScale: Math.max(1, Math.max.apply(Math, x0.map(Math.abs))),
      rootTolerance: Math.max(1e-7, config.rootTolerance * 100),
      tolerance: config.rootTolerance,
      maxIterations: 100,
      finiteDifferenceScale: 1e-6,
    });
    const unique = multi.uniqueSolutions.map(function (solution) { return augmentEquilibrium(solution, config, analysis); });
    return { status: 'computed', results: multi.results, uniqueSolutions: unique, startCount: multi.results.length };
  }

  function computeResult(config) {
    const started = performance.now();
    const analysis = Core.analyze(config.expressions, config.variables, config.selectedIndex, config.derivativeVariable, config.scope);
    const selected = config.expressions[config.selectedIndex];
    const simplifiedSelected = analysis.simplified[config.selectedIndex];
    const expressionSample = Core.sampleExpression(simplifiedSelected, config.derivativeVariable, config.scope, config.xMin, config.xMax, config.samples);
    const derivativeSample = Core.sampleExpression(analysis.derivative, config.derivativeVariable, config.scope, config.xMin, config.xMax, config.samples);
    const roots = config.variables.length === 1 && config.expressions.length === 1
      ? Core.findRoots1D(selected, config.variables[0], config.scope, config.xMin, config.xMax, { samples: config.samples, tolerance: config.rootTolerance })
      : [];
    const equilibria = computeEquilibria(config, analysis);
    return {
      release: RELEASE,
      config,
      analysis,
      expressionSample,
      derivativeSample,
      roots,
      equilibria,
      runtimeMs: performance.now() - started,
      selected,
      simplifiedSelected,
    };
  }

  function compatiblePlots(result) {
    const plots = [
      { id: 'expression', label: 'Selected expression curve', title: 'Expression curve', evidence: 'Numerical samples of the browser-parsed expression over the declared range. Gaps indicate non-finite or out-of-domain evaluations.' },
      { id: 'derivative', label: 'Symbolic derivative curve', title: 'Derivative curve', evidence: 'Numerical samples of the exact rule-derived derivative within the supported grammar.' },
      { id: 'jacobian', label: 'Jacobian heatmap', title: 'Jacobian at numeric scope', evidence: 'The browser differentiates each right-hand side with respect to each declared variable and evaluates the resulting matrix at the numeric scope.' },
      { id: 'values', label: 'Expression values at scope', title: 'Expression values', evidence: 'Signed right-hand-side or residual values at the supplied numeric scope.' },
      { id: 'complexity', label: 'Operation-count diagnostic', title: 'Expression complexity', evidence: 'A syntax-tree operation count. It is a descriptive parser metric, not computational complexity or model quality.' },
    ];
    if (result.roots.length) plots.push({ id: 'roots', label: 'One-dimensional root evidence', title: 'Detected roots', evidence: 'Roots are detected by sampled near-zero values and sign-change bisection over the finite declared interval. repeated tangent roots can be missed.' });
    if (result.config.variables.length === 2 && result.config.expressions.length >= 2) {
      plots.push({ id: 'vector-field', label: 'Two-dimensional vector field', title: 'Vector field', evidence: 'Local directions from the first two browser-parsed expressions. Arrow density and scale are visualization choices, not trajectories.' });
      plots.push({ id: 'nullclines', label: 'Residual contours / nullclines', title: 'Nullcline contours', evidence: 'Zero contours of the first two expressions on a finite rectangular grid. Grid resolution limits intersection accuracy.' });
    }
    if (result.equilibria.status === 'computed' && result.equilibria.uniqueSolutions.length) {
      plots.push({ id: 'equilibria', label: 'Finite multi-start equilibria', title: 'Equilibrium candidates', evidence: 'Distinct converged roots found from a deterministic finite start set. Absence of additional roots is not proved.' });
      if (result.equilibria.uniqueSolutions.every(function (solution) { return Array.isArray(solution.stability.eigenvalues) && solution.stability.eigenvalues.length; })) {
        plots.push({ id: 'stability', label: 'Local stability spectrum', title: 'Local stability evidence', evidence: 'Eigenvalue evidence from the Jacobian at detected equilibria. This is local and does not establish global dynamics.' });
      }
    }
    return plots;
  }

  function ensureDistinctPlots(plots) {
    const available = plots.map(function (plot) { return plot.id; });
    const used = new Set();
    ['left', 'right'].forEach(function (side, index) {
      let selected = state.plotType[side];
      if (!available.includes(selected) || used.has(selected)) selected = available.find(function (id) { return !used.has(id); }) || available[0];
      state.plotType[side] = selected;
      if (index < available.length) used.add(selected);
    });
  }

  function updatePlotSelectors() {
    if (!state.result) return;
    const plots = compatiblePlots(state.result);
    ensureDistinctPlots(plots);
    ['left', 'right'].forEach(function (side) {
      const select = $(`${side}PlotType`);
      select.innerHTML = plots.map(function (plot) { return `<option value="${plot.id}">${escapeHtml(plot.label)}</option>`; }).join('');
      select.value = state.plotType[side];
    });
    renderLayout();
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('symbolic');
}

  function renderExpressionPlot(node, result, derivative) {
    const sample = derivative ? result.derivativeSample : result.expressionSample;
    const name = derivative ? `d/d${result.config.derivativeVariable}` : 'expression';
    return renderPlotly(node, [{ x: sample.x, y: sample.y, mode: 'lines', name, line: { width: 3 } }], plotLayout(derivative ? 'Symbolic derivative' : 'Selected expression', result.config.derivativeVariable, derivative ? 'derivative' : 'value'), plotConfig());
  }

  function renderJacobian(node, result) {
    const z = result.analysis.jacobianNumeric;
    return renderPlotly(node, [{ z, x: result.config.variables, y: result.config.expressions.map(function (_, i) { return `f${i + 1}`; }), type: 'heatmap', colorscale: 'RdBu', zmid: 0, colorbar: { title: '∂f/∂x' } }], plotLayout('Jacobian evaluated at scope', 'variable', 'expression'), plotConfig());
  }

  function renderValues(node, result) {
    return renderPlotly(node, [{ x: result.analysis.evaluation.map(function (_, i) { return `f${i + 1}`; }), y: result.analysis.evaluation, type: 'bar', name: 'value' }], plotLayout('Expression values at numeric scope', 'expression', 'value'), plotConfig());
  }

  function renderComplexity(node, result) {
    return renderPlotly(node, [{ x: result.analysis.operationCounts.map(function (_, i) { return `f${i + 1}`; }), y: result.analysis.operationCounts, type: 'bar', name: 'operations' }], plotLayout('Syntax-tree operation count', 'expression', 'operations'), plotConfig());
  }

  function renderRoots(node, result) {
    const trace = { x: result.roots.map(function (row) { return row.value; }), y: result.roots.map(function (row) { return Math.max(row.residual, 1e-18); }), mode: 'markers+text', text: result.roots.map(function (row) { return `x=${format(row.value, 6)}`; }), textposition: 'top center', marker: { size: 11 }, name: 'detected root' };
    const layout = plotLayout('Detected one-dimensional roots', result.config.variables[0], '|residual|');
    layout.yaxis.type = 'log';
    return renderPlotly(node, [trace], layout, plotConfig());
  }

  function vectorGrid(result) {
    const n = 14;
    const xs = Core.linspace(result.config.xMin, result.config.xMax, n);
    const ys = Core.linspace(result.config.xMin, result.config.xMax, n);
    const xLines = [], yLines = [], magnitudes = [];
    let maxMagnitude = 0;
    const vectors = [];
    ys.forEach(function (y) {
      xs.forEach(function (x) {
        const scope = Object.assign({}, result.config.scope, { [result.config.variables[0]]: x, [result.config.variables[1]]: y });
        try {
          const u = Core.evaluate(result.config.expressions[0], scope);
          const v = Core.evaluate(result.config.expressions[1], scope);
          const magnitude = Math.hypot(u, v);
          if (Number.isFinite(magnitude)) { maxMagnitude = Math.max(maxMagnitude, magnitude); vectors.push({ x, y, u, v, magnitude }); }
        } catch (_) { /* domain gaps omitted */ }
      });
    });
    const scale = maxMagnitude > 0 ? (result.config.xMax - result.config.xMin) * 0.035 / maxMagnitude : 0;
    vectors.forEach(function (row) {
      xLines.push(row.x, row.x + row.u * scale, null);
      yLines.push(row.y, row.y + row.v * scale, null);
      magnitudes.push(row.magnitude);
    });
    return { xLines, yLines, magnitudes };
  }

  function renderVectorField(node, result) {
    const grid = vectorGrid(result);
    const traces = [{ x: grid.xLines, y: grid.yLines, mode: 'lines', line: { width: 1.4 }, name: 'local direction', hoverinfo: 'skip' }];
    if (result.equilibria.status === 'computed' && result.equilibria.uniqueSolutions.length) traces.push({ x: result.equilibria.uniqueSolutions.map(function (s) { return s.x[0]; }), y: result.equilibria.uniqueSolutions.map(function (s) { return s.x[1]; }), mode: 'markers', marker: { size: 11, symbol: 'x' }, name: 'finite-start roots' });
    return renderPlotly(node, traces, plotLayout('Two-dimensional vector field', result.config.variables[0], result.config.variables[1]), plotConfig());
  }

  function renderNullclines(node, result) {
    const n = 45;
    const xs = Core.linspace(result.config.xMin, result.config.xMax, n);
    const ys = Core.linspace(result.config.xMin, result.config.xMax, n);
    const z1 = [], z2 = [];
    ys.forEach(function (y) {
      const row1 = [], row2 = [];
      xs.forEach(function (x) {
        const scope = Object.assign({}, result.config.scope, { [result.config.variables[0]]: x, [result.config.variables[1]]: y });
        try { row1.push(Core.evaluate(result.config.expressions[0], scope)); } catch (_) { row1.push(null); }
        try { row2.push(Core.evaluate(result.config.expressions[1], scope)); } catch (_) { row2.push(null); }
      });
      z1.push(row1); z2.push(row2);
    });
    const traces = [
      { x: xs, y: ys, z: z1, type: 'contour', contours: { start: 0, end: 0, size: 1, coloring: 'none' }, line: { width: 3 }, showscale: false, name: 'f1=0' },
      { x: xs, y: ys, z: z2, type: 'contour', contours: { start: 0, end: 0, size: 1, coloring: 'none' }, line: { width: 3, dash: 'dash' }, showscale: false, name: 'f2=0' },
    ];
    return renderPlotly(node, traces, plotLayout('Finite-grid nullcline contours', result.config.variables[0], result.config.variables[1]), plotConfig());
  }

  function renderEquilibria(node, result) {
    const rows = result.equilibria.uniqueSolutions;
    if (result.config.variables.length === 1) {
      return renderPlotly(node, [{ x: rows.map(function (s) { return s.x[0]; }), y: rows.map(function (s) { return Math.max(s.residualNorm, 1e-18); }), mode: 'markers+text', text: rows.map(function (_, i) { return `root ${i + 1}`; }), textposition: 'top center', marker: { size: 12 }, name: 'roots' }], Object.assign(plotLayout('Finite multi-start root candidates', result.config.variables[0], 'residual norm'), { yaxis: { type: 'log', title: 'residual norm', gridcolor: '#dce7ef' } }), plotConfig());
    } else {
      return renderPlotly(node, [{ x: rows.map(function (s) { return s.x[0]; }), y: rows.map(function (s) { return s.x[1]; }), mode: 'markers+text', text: rows.map(function (_, i) { return `root ${i + 1}`; }), textposition: 'top center', marker: { size: 12 }, name: 'roots' }], plotLayout('Finite multi-start equilibrium candidates', result.config.variables[0], result.config.variables[1]), plotConfig());
    }
  }

  function renderStability(node, result) {
    const rows = result.equilibria.uniqueSolutions;
    const traces = [];
    rows.forEach(function (solution, index) {
      const eigenvalues = solution.stability.eigenvalues || [];
      traces.push({ x: eigenvalues.map(function (v) { return v.real; }), y: eigenvalues.map(function (v) { return v.imag; }), mode: 'markers+text', text: eigenvalues.map(function (_, j) { return `r${index + 1}:λ${j + 1}`; }), textposition: 'top center', marker: { size: 11 }, name: `root ${index + 1}` });
    });
    return renderPlotly(node, traces, plotLayout('Jacobian eigenvalues at detected roots', 'real part', 'imaginary part'), plotConfig());
  }

  function renderPlot(side) {
    if (!state.result) return;
    const node = $(`${side}Plot`);
    if (!node || node.offsetParent === null) return;
    const plot = compatiblePlots(state.result).find(function (entry) { return entry.id === state.plotType[side]; });
    if (!plot) return;
    $(`${side}PlotTitle`).textContent = plot.title;
    $(`${side}PlotEvidence`).textContent = plot.evidence;
    if (plot.id === 'expression') renderExpressionPlot(node, state.result, false);
    else if (plot.id === 'derivative') renderExpressionPlot(node, state.result, true);
    else if (plot.id === 'jacobian') renderJacobian(node, state.result);
    else if (plot.id === 'values') renderValues(node, state.result);
    else if (plot.id === 'complexity') renderComplexity(node, state.result);
    else if (plot.id === 'roots') renderRoots(node, state.result);
    else if (plot.id === 'vector-field') renderVectorField(node, state.result);
    else if (plot.id === 'nullclines') renderNullclines(node, state.result);
    else if (plot.id === 'equilibria') renderEquilibria(node, state.result);
    else if (plot.id === 'stability') renderStability(node, state.result);
  }

  function visiblePlotSides() {
    const grid = $('plotGrid');
    if (!grid || grid.dataset.layout !== 'focus') return ['left', 'right'];
    return [state.focusSide === 'right' ? 'right' : 'left'];
  }

  function renderAllPlots() {
    requestAnimationFrame(function () { requestAnimationFrame(function () { visiblePlotSides().forEach(renderPlot); }); });
  }

  function renderEquationOutput(result) {
    const expressions = result.analysis.simplified.map(function (expr, index) {
      const lhs = result.config.variables[index]
        ? `\\frac{d ${Core.latexIdentifier(result.config.variables[index])}}{d t}`
        : `f_{${index + 1}}`;
      return `<div class="symbolic-equation" data-latex="${escapeHtml(lhs + ' = ' + Core.toLatex(expr))}"></div>`;
    }).join('');
    const derivative = `<div class="symbolic-equation" data-latex="${escapeHtml('\\frac{\\partial f_{' + (result.config.selectedIndex + 1) + '}}{\\partial ' + Core.latexIdentifier(result.config.derivativeVariable) + '} = ' + Core.toLatex(result.analysis.derivative))}"></div>`;
    const jacobian = `<div class="symbolic-equation symbolic-matrix" data-latex="${escapeHtml('J = ' + Core.formatJacobianLatex(result.analysis.jacobian))}"></div>`;
    $('symbolicEquations').innerHTML = `<h3>Simplified expressions</h3>${expressions}<h3>Selected derivative</h3>${derivative}<h3>Symbolic Jacobian</h3>${jacobian}`;
    document.querySelectorAll('#symbolicEquations [data-latex]').forEach(function (node) {
      root.FokoMathRender.render(node, node.dataset.latex, { displayMode: true });
    });
  }

  function warningsFor(result) {
    const warnings = [];
    const supported = new Set(result.config.variables.concat(result.config.parameters));
    const unknown = result.analysis.symbols.filter(function (name) { return !supported.has(name); });
    if (unknown.length) warnings.push('Expressions contain undeclared symbols: ' + unknown.join(', ') + '.');
    if (result.roots.length === 0 && result.config.variables.length === 1) warnings.push('No sign-change root was detected in the finite interval. This does not prove that no repeated or out-of-range root exists.');
    if (result.equilibria.status === 'computed' && !result.equilibria.uniqueSolutions.length) warnings.push('The finite deterministic start set produced no converged root. This is not proof of non-existence.');
    if (result.config.variables.length > 3) warnings.push('Numeric equilibrium search is disabled above three variables in the browser reference scope.');
    if (result.analysis.jacobianNumeric.some(function (row) { return row.some(function (value) { return Math.abs(value) > 1e8; }); })) warnings.push('The Jacobian contains very large entries at the numeric scope; scaling and units should be checked.');
    return warnings;
  }

  function renderDiagnostics(result) {
    const roots = result.roots.length ? result.roots.map(function (row) { return `${format(row.value, 7)} (|f|=${format(row.residual, 3)})`; }).join('; ') : 'none detected';
    let equilibria = result.equilibria.reason || 'not computed';
    if (result.equilibria.status === 'computed') equilibria = result.equilibria.uniqueSolutions.length
      ? result.equilibria.uniqueSolutions.map(function (solution) { return '[' + solution.x.map(function (v) { return format(v, 7); }).join(', ') + `], ${solution.stability.label}`; }).join('; ')
      : 'none converged in the finite start set';
    const warnings = warningsFor(result);
    const rows = [
      ['Selected expression', Core.toString(result.selected)],
      ['Simplified expression', Core.toString(result.simplifiedSelected)],
      [`Derivative with respect to ${result.config.derivativeVariable}`, Core.toString(result.analysis.derivative)],
      ['Value at numeric scope', format(result.analysis.evaluation[result.config.selectedIndex], 9)],
      ['One-dimensional roots', roots],
      ['Finite multi-start equilibria', equilibria],
      ['Symbols found', result.analysis.symbols.join(', ') || 'none'],
      ['Operation count', result.analysis.operationCounts.join(', ')],
    ];
    $('symbolicDiagnostics').classList.remove('empty');
    $('symbolicDiagnostics').innerHTML = `<table><tbody>${rows.map(function (row) { return `<tr><th>${escapeHtml(row[0])}</th><td>${escapeHtml(row[1])}</td></tr>`; }).join('')}</tbody></table>${warnings.length ? `<div class="v72-warning"><b>Warnings</b><ul>${warnings.map(function (warning) { return `<li>${escapeHtml(warning)}</li>`; }).join('')}</ul></div>` : '<p class="v72-ok">No browser-side warning was triggered. Independent mathematical validation may still be required.</p>'}`;
  }

  function updateInspector(result) {
    $('symbolicTopStatus').textContent = 'Computed';
    $('symbolicRuntime').textContent = formatMs(result.runtimeMs);
    $('symbolicDimension').textContent = `${result.config.expressions.length} × ${result.config.variables.length}`;
    $('symbolicOperationMetric').textContent = $('symbolicOperation').selectedOptions[0].textContent;
    $('symbolicRootMetric').textContent = result.roots.length ? String(result.roots.length) : (result.equilibria.status === 'computed' ? String(result.equilibria.uniqueSolutions.length) : 'n/a');
    $('symbolicExpressionCount').textContent = String(result.config.expressions.length);
    $('symbolicSymbolCount').textContent = String(result.analysis.symbols.length);
    $('symbolicJacobianShape').textContent = `${result.analysis.jacobian.length}×${result.analysis.jacobian[0].length}`;
    $('symbolicScopeMetric').textContent = String(Object.keys(result.config.scope).length);
    $('provenanceStatus').textContent = 'Browser-computed limited symbolic and numerical evidence';
    $('provenanceEngine').textContent = 'FokoSymbolicReference + FokoSteadyCore';
    $('provenanceMethod').textContent = 'Recursive-descent parser, rule differentiation, algebraic simplifier and finite numerical checks';
    $('provenanceData').textContent = `${result.config.expressions.length} expression(s), ${result.config.variables.length} variable(s), ${result.config.parameters.length} parameter(s)`;
    $('provenanceAssumptions').textContent = 'Real finite scope; explicit multiplication; supported elementary functions; finite root interval and deterministic start set';
    $('provenanceReproducibility').textContent = 'Configuration can be saved or shared; computed evidence is regenerated';
    $('provenanceWarning').textContent = 'General integration, exact equation solving, factorization, complex branch analysis and complete algebraic geometry are not browser-computed. Use the SymPy export route.';
  }

  function runAnalysis() {
    if (state.busy) return;
    try {
      setBusy(true, 'Parsing, differentiating and evaluating…');
      const config = readConfig();
      const result = computeResult(config);
      state.result = result;
      updatePlotSelectors();
      renderAllPlots();
      renderEquationOutput(result);
      renderDiagnostics(result);
      updateInspector(result);
      $('symbolicResultKind').textContent = `${result.config.expressions.length} expression(s) · ${result.config.variables.length} variable(s) · limited browser symbolic scope`;
      $('symbolicProgress').style.width = '100%';
      setBusy(false, 'Symbolic analysis complete. Exact transformations are limited to the supported expression grammar.');
    } catch (error) { setError(error); }
  }

  function clearComputedEvidence(message) {
    state.result = null;
    ['left', 'right'].forEach(function (side) {
      const node = $(`${side}Plot`);
      PLOT.clear(node, 'Compute to create a plot.');
      $(`${side}PlotEvidence`).textContent = 'No plot has been computed.';
    });
    $('symbolicEquations').innerHTML = '<div class="diagnostics empty">Compute to see simplified expressions, derivatives and the Jacobian.</div>';
    $('symbolicDiagnostics').className = 'diagnostics empty';
    $('symbolicDiagnostics').textContent = 'Compute to see transformations, numeric checks and limitations.';
    $('symbolicResultKind').textContent = 'No computed symbolic result';
    $('symbolicTopStatus').textContent = 'Ready';
    ['symbolicRuntime', 'symbolicDimension', 'symbolicOperationMetric', 'symbolicRootMetric', 'symbolicExpressionCount', 'symbolicSymbolCount', 'symbolicJacobianShape', 'symbolicScopeMetric'].forEach(function (id) { $(id).textContent = '—'; });
    setStatus(message || 'Ready. No symbolic result exists yet.', 'neutral');
  }

  function effectiveLayout() {
    return root.FokoLayoutStability.effectiveLayout(state.preferredLayout, { breakpoint: 1024, compatibleCount: 2 });
  }
  function resizeVisiblePlots() {
    ['leftPlot', 'rightPlot'].forEach(function (id) { PLOT.resize($(id)); });
  }
  function renderLayout() {
    const report = root.FokoLayoutStability.apply({
      grid: $('plotGrid'),
      preferred: state.preferredLayout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ layout: state.preferredLayout, focus: state.focusSide }));
    if (state.result) renderAllPlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('symbolic');
    return report;
  }

  function storedLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY));
      if (saved && VALID_LAYOUTS.has(saved.layout)) state.preferredLayout = saved.layout;
      if (saved && VALID_SIDES.has(saved.focus)) state.focusSide = saved.focus;
    } catch (_) { /* invalid storage ignored */ }
  }

  function currentConfig() {
    return {
      schema: 'fokolab-symbolic-config-v1',
      release: RELEASE,
      presetKey: state.presetKey,
      variables: $('symbolicVariables').value,
      parameters: $('symbolicParameters').value,
      expressions: $('symbolicExpressions').value,
      scope: $('symbolicScope').value,
      operation: $('symbolicOperation').value,
      selectedExpression: $('symbolicSelectedExpression').value,
      derivativeVariable: $('symbolicDerivativeVariable').value,
      xMin: $('symbolicXMin').value,
      xMax: $('symbolicXMax').value,
      samples: $('symbolicSamples').value,
      rootTolerance: $('symbolicRootTolerance').value,
      plots: clone(state.plotType),
      layout: { preferred: state.preferredLayout, focus: state.focusSide },
    };
  }
  function applyConfig(config, message) {
    if (!config || config.schema !== 'fokolab-symbolic-config-v1') throw new Error('Unsupported symbolic configuration.');
    state.presetKey = Presets[config.presetKey] ? config.presetKey : 'logistic';
    renderPresetOptions();
    $('symbolicVariables').value = config.variables || 'x';
    $('symbolicParameters').value = config.parameters || '';
    $('symbolicExpressions').value = config.expressions || 'x';
    $('symbolicScope').value = config.scope || 'x=0';
    $('symbolicOperation').value = config.operation || 'differentiate';
    $('symbolicXMin').value = config.xMin == null ? -5 : config.xMin;
    $('symbolicXMax').value = config.xMax == null ? 5 : config.xMax;
    $('symbolicSamples').value = config.samples == null ? 320 : config.samples;
    $('symbolicRootTolerance').value = config.rootTolerance == null ? 1e-8 : config.rootTolerance;
    refreshExpressionAndVariableOptions(Number(config.selectedExpression || 0), config.derivativeVariable);
    if (config.plots) state.plotType = Object.assign(state.plotType, config.plots);
    if (config.layout) {
      if (VALID_LAYOUTS.has(config.layout.preferred)) state.preferredLayout = config.layout.preferred;
      if (VALID_SIDES.has(config.layout.focus)) state.focusSide = config.layout.focus;
    }
    clearComputedEvidence(message || 'Configuration restored. Computed evidence was not restored and must be regenerated.');
    renderLayout();
  }
  function encodeConfig(config) {
    const utf8 = encodeURIComponent(JSON.stringify(config)).replace(/%([0-9A-F]{2})/g, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); });
    return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeConfig(value) {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    const encoded = Array.from(binary).map(function (character) { return `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`; }).join('');
    return JSON.parse(decodeURIComponent(encoded));
  }
  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select(); document.execCommand('copy'); textarea.remove();
  }
  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
  }
  function saveSession() { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig())); setStatus('Symbolic configuration saved. Computed evidence was not stored.', 'ok'); }
  function restoreSession() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('No saved Symbolic Lab configuration was found.');
    applyConfig(JSON.parse(raw));
  }
  async function copyShareUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('state', encodeConfig(currentConfig()));
    await copyText(url.toString());
    setStatus('Configuration-only share URL copied.', 'ok');
  }
  function exportJson() {
    const payload = { configuration: currentConfig(), result: state.result ? {
      simplified: state.result.analysis.simplified.map(Core.toString),
      derivative: Core.toString(state.result.analysis.derivative),
      jacobian: state.result.analysis.jacobian.map(function (row) { return row.map(Core.toString); }),
      jacobianNumeric: state.result.analysis.jacobianNumeric,
      evaluation: state.result.analysis.evaluation,
      roots: state.result.roots,
      equilibria: state.result.equilibria.status === 'computed' ? state.result.equilibria.uniqueSolutions.map(function (solution) { return { x: solution.x, residualNorm: solution.residualNorm, stability: solution.stability }; }) : state.result.equilibria,
      runtimeMs: state.result.runtimeMs,
    } : null };
    download('fokolab-symbolic-result-v77.4.1.json', JSON.stringify(payload, null, 2), 'application/json');
  }
  function exportCsv() {
    if (!state.result) throw new Error('Compute a result before exporting CSV.');
    const rows = [['row', ...state.result.config.variables], ...state.result.analysis.jacobianNumeric.map(function (row, index) { return [`f${index + 1}`, ...row]; })];
    download('fokolab-symbolic-jacobian-v77.4.1.csv', rows.map(function (row) { return row.join(','); }).join('\n') + '\n', 'text/csv');
  }
  function exportPython() {
    const config = readConfig();
    download('fokolab-symbolic-validation-v77.4.1.py', Core.generateSympyScript(config), 'text/x-python');
  }
  function exportPlot(side, formatName) {
    const node = $(`${side}Plot`);
    if (!state.result || !node || !node.data) throw new Error('No computed plot is available for export.');
    root.Plotly.downloadImage(node, { format: formatName, filename: `fokolab-symbolic-${state.plotType[side]}-v77.4.1`, width: 1200, height: 760, scale: 1 });
  }

  function importOdeHandoff() {
    const params = new URLSearchParams(location.search);
    if (params.get('import') !== 'session') return false;
    const raw = sessionStorage.getItem('foko-symbolic-import');
    if (!raw) return false;
    try {
      const payload = JSON.parse(raw);
      const variables = Array.isArray(payload.variables) ? payload.variables : [];
      const parameters = Array.isArray(payload.parameters) ? payload.parameters : [];
      const rhs = Array.isArray(payload.rhs) ? payload.rhs : [];
      if (!variables.length || !rhs.length) return false;
      state.presetKey = 'logistic';
      renderPresetOptions();
      $('symbolicVariables').value = variables.join(', ');
      $('symbolicParameters').value = parameters.join(', ');
      $('symbolicExpressions').value = rhs.map(function (expr, i) { return `${variables[i] || `f${i + 1}`} = ${expr}`; }).join('\n');
      const scope = payload.numericScope && typeof payload.numericScope === 'object' ? payload.numericScope : {};
      $('symbolicScope').value = Object.entries(scope).map(function (entry) { return `${entry[0]}=${entry[1]}`; }).join('\n');
      refreshExpressionAndVariableOptions(0, variables[0]);
      $('symbolicNarrative').textContent = `Imported configuration from ODE Lab: ${payload.name || 'unnamed model'}. Computed evidence must be regenerated.`;
      clearComputedEvidence('ODE configuration imported. Press Analyze to compute symbolic evidence.');
      return true;
    } catch (_) { return false; }
  }

  function bind() {
    $('runSymbolic').addEventListener('click', runAnalysis);
    $('resetSymbolic').addEventListener('click', function () { loadPreset(state.presetKey, true); });
    $('symbolicImport').addEventListener('change', function () { importSymbolicFile(this.files && this.files[0]); });
    $('loadSymbolic').addEventListener('click', function () { loadPreset($('symbolicSelect').value, true); });
    $('symbolicSelect').addEventListener('change', function () { loadPreset(this.value, true); });
    $('symbolicDeck').addEventListener('click', function (event) {
      const button = event.target.closest('[data-symbolic-preset]');
      if (button) loadPreset(button.dataset.symbolicPreset, true);
    });
    $('symbolicExampleSearch').addEventListener('input', renderPresetOptions);
    $('symbolicFamilyFilter').addEventListener('change', renderPresetOptions);
    ['symbolicVariables', 'symbolicExpressions'].forEach(function (id) { $(id).addEventListener('input', function () { refreshExpressionAndVariableOptions(); clearComputedEvidence('Input changed. Press Analyze to regenerate evidence.'); }); });
    ['symbolicParameters', 'symbolicScope', 'symbolicOperation', 'symbolicSelectedExpression', 'symbolicDerivativeVariable', 'symbolicXMin', 'symbolicXMax', 'symbolicSamples', 'symbolicRootTolerance'].forEach(function (id) { $(id).addEventListener('change', function () { clearComputedEvidence('Settings changed. Press Analyze to regenerate evidence.'); }); });
    ['left', 'right'].forEach(function (side) {
      $(`${side}PlotType`).addEventListener('change', function () { state.plotType[side] = this.value; if (state.result) { updatePlotSelectors(); renderAllPlots(); } });
    });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) { button.addEventListener('click', function () { if (VALID_LAYOUTS.has(button.dataset.layoutMode)) { state.preferredLayout = button.dataset.layoutMode; renderLayout(); } }); });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) { button.addEventListener('click', function () { const side = button.dataset.focusSide; if (VALID_SIDES.has(side)) { state.focusSide = side; state.preferredLayout = 'focus'; renderLayout(); } }); });
    document.querySelectorAll('[data-export-side]').forEach(function (button) { button.addEventListener('click', function () { exportPlot(button.dataset.exportSide, 'png'); }); });
    $('exportSymbolicPng').addEventListener('click', function () { exportPlot(state.focusSide, 'png'); });
    $('exportSymbolicSvg').addEventListener('click', function () { exportPlot(state.focusSide, 'svg'); });
    $('saveSymbolicSession').addEventListener('click', saveSession);
    $('restoreSymbolicSession').addEventListener('click', function () { try { restoreSession(); } catch (error) { setError(error); } });
    $('copySymbolicShareUrl').addEventListener('click', function () { copyShareUrl().catch(setError); });
    $('exportSymbolicCsv').addEventListener('click', function () { try { exportCsv(); } catch (error) { setError(error); } });
    $('exportSymbolicJson').addEventListener('click', exportJson);
    $('exportSymbolicPython').addEventListener('click', function () { try { exportPython(); } catch (error) { setError(error); } });
    root.addEventListener('resize', function () { renderLayout(); });
  }

  function init() {
    storedLayout();
    bind();
    renderPresetOptions();
    const params = new URLSearchParams(location.search);
    if (params.has('state')) {
      try { applyConfig(decodeConfig(params.get('state')), 'Shared configuration loaded. Computed evidence was not restored.'); return; }
      catch (error) { setStatus('Share state could not be decoded: ' + error.message, 'error'); }
    }
    if (importOdeHandoff()) return;
    const requested = params.get('example');
    loadPreset(requested && Presets[requested] ? requested : 'logistic', true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}(typeof globalThis !== 'undefined' ? globalThis : this));
