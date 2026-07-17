/* Foko Lab Sensitivity Analysis workspace.
 * Owns editable ODE configuration, worker lifecycle, evidence, exports and plots.
 */
(function (root) {
  'use strict';

  const PRESETS = root.FokoSensitivityPresets || {};
  const INPUT = root.FokoNumericalInputs;
  const CORE = root.FokoSensitivityCore;
  const PLOT = root.FokoPlotLifecycle;
  const RELEASE = '72.46.0';
  const STORAGE_KEY = 'fokolab:v72.44:sensitivity-config';
  if (!INPUT || !CORE || !PLOT) throw new Error('Sensitivity Lab requires FokoNumericalInputs, FokoSensitivityCore and FokoPlotLifecycle.');

  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const state = {
    current: Object.keys(PRESETS)[0] || '', model: null, result: null, worker: null,
    layout: 'two', focusSide: 'left', plotTypes: { left: 'ranking', right: 'signed' },
    lastPlotSide: 'left', dirty: true, runToken: 0, lastScalarMetric: 'final', capacityBlocked: false
  };
  const PLOTS = {
    ranking: { label: 'Influence ranking', title: 'Parameter influence ranking', evidence: 'Magnitude ranking uses local elasticity where defined, normalized Morris μ*, raw Jansen total-order estimates, or the diagonal of the range-scaled information matrix.' },
    signed: { label: 'Signed local sensitivity', title: 'Signed local sensitivity', evidence: 'Signed elasticities are dimensionless when the base output is non-zero. Otherwise the plot uses the derivative scaled by the declared parameter range.' },
    heatmap: { label: 'Trajectory sensitivity through time', title: 'Selected-state trajectory sensitivity', evidence: 'Central finite-difference derivative of the selected state trajectory. This is not an adjoint or forward sensitivity-equation solve.' },
    'parameter-jacobian': { label: 'Parameter Jacobian heatmap', title: 'Mean absolute parameter Jacobian', evidence: 'Mean absolute ∂fᵢ/∂pⱼ along the nominal trajectory. This is a right-hand-side Jacobian, not the propagated trajectory sensitivity ∂x/∂p.' },
    'state-jacobian': { label: 'State Jacobian heatmap', title: 'Mean absolute state Jacobian', evidence: 'Mean absolute ∂fᵢ/∂xⱼ along the nominal trajectory. It describes local vector-field coupling and does not by itself establish stability.' },
    'influence-map': { label: 'Parameter × state influence', title: 'Trajectory influence across states', evidence: 'Time-mean absolute finite-difference trajectory sensitivity for every state and varied parameter. Magnitudes retain state units and depend on the declared time window.' },
    ofat: { label: 'OFAT response curves', title: 'One-factor-at-a-time response', evidence: 'One parameter varies across its declared range while all others remain nominal. OFAT does not include interactions and is not a global decomposition.' },
    tornado: { label: 'Tornado plot', title: 'Bounded OFAT endpoint changes', evidence: 'Output changes at the declared minimum and maximum of each parameter relative to the nominal output. The perturbation convention is the full declared range.' },
    directional: { label: 'Directional response', title: 'Range-normalized directional profile', evidence: 'The user direction is normalized in parameter-range coordinates and followed symmetrically around the nominal point. The local slope depends on that normalization.' },
    'response-surface': { label: 'Two-parameter response surface', title: 'Bounded two-parameter response surface', evidence: 'Two parameters vary over a bounded grid while all others remain nominal. This is a response surface, not a complete variance decomposition.' },
    convergence: { label: 'Perturbation convergence', title: 'Finite-difference step convergence', evidence: 'Agreement as the perturbation is reduced supports numerical consistency. It does not prove global relevance or differentiability at thresholds.' },
    morris: { label: 'Morris μ*–σ map', title: 'Morris screening diagnostics', evidence: 'Seeded random one-at-a-time trajectories on normalized independent ranges. μ* ranks overall influence; σ combines nonlinearity and interactions.' },
    trajectories: { label: 'Morris path outputs', title: 'Morris path outputs', evidence: 'Scalar output along each one-at-a-time path. Path order, random seed, trajectory count and grid levels affect the result.' },
    'morris-effects': { label: 'Elementary-effect distributions', title: 'Morris elementary-effect distributions', evidence: 'Box summaries retain sign and spread across computed trajectories. Wide or multimodal effects can reflect nonlinearity, interactions, or both.' },
    'morris-convergence': { label: 'Morris convergence', title: 'Morris trajectory convergence', evidence: 'Prefix μ* estimates show whether the influence ranking stabilizes as trajectories accumulate. They are not independent replications.' },
    'morris-rank': { label: 'Morris rank stability', title: 'Morris bootstrap rank stability', evidence: 'Rank intervals and top-rank probabilities resample the computed trajectories. They quantify internal sampling instability, not model-form uncertainty.' },
    sobol: { label: 'First/total indices', title: 'Jansen first- and total-order indices', evidence: 'Independent uniform input ranges only. Estimates and bootstrap intervals are not clipped, so Monte Carlo error remains visible.' },
    'sobol-second': { label: 'Second-order interactions', title: 'Saltelli pairwise interaction matrix', evidence: 'Pairwise interactions use a symmetrized Saltelli estimator. They require second-order mode, independent inputs and a substantially larger sample budget.' },
    'sobol-gap': { label: 'Interaction gap', title: 'Total-minus-first interaction gap', evidence: 'The total-minus-first gap is aggregate higher-order influence involving each parameter; it is not a pairwise decomposition.' },
    'sobol-uncertainty': { label: 'Bootstrap uncertainty', title: 'Bootstrap uncertainty intervals', evidence: 'Intervals resample the existing Monte Carlo rows. They do not replace independent repeated designs or correct structural bias.' },
    'sobol-rank': { label: 'Rank stability', title: 'Bootstrap rank stability', evidence: 'Median rank, 95% rank interval and top-rank probability are conditional on the computed Monte Carlo design.' },
    'sobol-output': { label: 'Output distribution', title: 'Sampled output distribution', evidence: 'Histogram of outputs from the two independent base matrices. It describes the declared independent uniform input domain only.' },
    'sobol-convergence': { label: 'Sampling convergence', title: 'Global-sensitivity sampling convergence', evidence: 'Prefix estimates from the same seeded sample matrices. Stable-looking prefixes are necessary but not sufficient evidence of convergence.' },
    'sobol-time': { label: 'Total effect through time', title: 'Time-resolved total-order sensitivity', evidence: 'Jansen total-order estimates are recomputed at each downsampled time point from the same seeded design. Near-zero output-variance times are left unresolved.' },
    'variance-contribution': { label: 'Variance contribution summary', title: 'Variance contribution accounting', evidence: 'Raw sums of first-order and pairwise estimates plus the unresolved remainder. Negative or greater-than-one components remain visible as Monte Carlo diagnostics.' },
    'global-scatter': { label: 'Parameter–output scatter matrix', title: 'Sampled parameter–output relationships', evidence: 'A bounded subset of the actual independent-uniform design. Scatter structure can reveal monotonicity, nonlinear response and failed assumptions, but is not itself a sensitivity index.' },
    'dependence-mi': { label: 'Mutual information screening', title: 'Histogram mutual-information screening', evidence: 'Quantile-bin normalized mutual information with a coarse permutation test. It is estimator-dependent and not a variance fraction.' },
    'dependence-hsic': { label: 'HSIC screening', title: 'Kernel dependence screening', evidence: 'Normalized RBF-HSIC with median-distance bandwidth and a coarse permutation test. It is a dependence diagnostic, not a Sobol index.' },
    fim: { label: 'Scaled information matrix', title: 'Range-scaled local information matrix', evidence: 'Finite-difference trajectory sensitivities scaled by parameter range/current magnitude and a constant independent noise scale.' },
    spectrum: { label: 'Information spectrum', title: 'Information-matrix eigenvalue spectrum', evidence: 'Small directions indicate weak local information under the declared output, time grid, parameter scaling, perturbation and noise model.' },
    alignment: { label: 'Sensitivity-column alignment', title: 'Normalized sensitivity-column alignment', evidence: 'Normalized information entries measure alignment of local sensitivity columns. They are not posterior parameter correlations.' }
  };
  root.FokoSensitivityPlotMeta = PLOTS;

  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function number(value, digits) { const x = Number(value); if (!Number.isFinite(x)) return '—'; if (x !== 0 && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-4)) return x.toExponential(3); return x.toFixed(digits == null ? 4 : digits).replace(/\.?0+$/, ''); }
  function download(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type: type || 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }
  function encodeState(value) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
  function decodeState(value) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }
  function warningsText(warnings) { return (warnings || []).map(w => w.message || String(w)).join(' '); }
  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }

  function renderTable(rootId, headers, rows, onEdit, onDelete, readOnlyColumns) {
    const rootNode = $(rootId); rootNode.innerHTML = '';
    const head = document.createElement('div'); head.className = 'table-head';
    headers.forEach(h => { const d = document.createElement('div'); d.textContent = h; head.append(d); });
    head.append(document.createElement('div')); rootNode.append(head);
    rows.forEach((row, rowIndex) => {
      const line = document.createElement('div'); line.className = 'table-row';
      row.forEach((value, colIndex) => {
        const input = document.createElement('input'); input.value = value;
        input.setAttribute('aria-label', `${headers[colIndex]} row ${rowIndex + 1}`);
        if ((readOnlyColumns || []).includes(colIndex)) { input.readOnly = true; input.setAttribute('aria-readonly', 'true'); }
        else input.addEventListener('input', () => { onEdit(rowIndex, colIndex, input.value); markDirty('Inputs changed. Run the analysis to replace stale evidence.'); });
        line.append(input);
      });
      if (onDelete) {
        const del = document.createElement('button'); del.type = 'button'; del.className = 'delete'; del.textContent = '×';
        del.setAttribute('aria-label', `Delete row ${rowIndex + 1}`);
        del.addEventListener('click', () => { onDelete(rowIndex); renderEditors(); markDirty('Model structure changed. Run the analysis to recompute.'); });
        line.append(del);
      } else {
        const placeholder = document.createElement('span'); placeholder.className = 'delete delete-placeholder'; placeholder.setAttribute('aria-hidden', 'true'); line.append(placeholder);
      }
      rootNode.append(line);
    });
  }

  function renderEditors() {
    if (!state.model) return;
    renderTable('sensitivityEquationRows', ['state', 'd(state)/dt'], state.model.vars.map((name, i) => [name, state.model.eqs[i]]), (r, c, value) => {
      if (c === 0) { state.model.vars[r] = value; renderEditors(); }
      else state.model.eqs[r] = value;
      refreshOutputVariables();
    }, r => {
      state.model.vars.splice(r, 1); state.model.eqs.splice(r, 1); state.model.y0.splice(r, 1); refreshOutputVariables();
    });
    renderTable('sensitivityInitialRows', ['state', 'initial value'], state.model.vars.map((name, i) => [name, state.model.y0[i]]), (r, c, value) => {
      if (c === 1) state.model.y0[r] = Number(value);
    }, null, [0]);
    const entries = Object.entries(state.model.params || {});
    renderTable('sensitivityParameterRows', ['parameter', 'value', 'min', 'max'], entries.map(([name, values]) => [name, values[0], values[1], values[2]]), (r, c, value) => {
      const old = Object.keys(state.model.params)[r]; if (!old) return;
      if (c === 0) { const values = state.model.params[old]; delete state.model.params[old]; state.model.params[value] = values; renderEditors(); }
      else state.model.params[old][c - 1] = Number(value);
      updateBudget();
    }, r => { const key = Object.keys(state.model.params)[r]; delete state.model.params[key]; refreshSurfaceParameters(); updateBudget(); });
    refreshSurfaceParameters();
  }

  function refreshOutputVariables() {
    const select = $('sensitivityOutputVar'); const current = select.value || state.model.outputVar;
    select.innerHTML = state.model.vars.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    select.value = state.model.vars.includes(current) ? current : (state.model.vars[0] || '');
  }
  function refreshSurfaceParameters() {
    const names = Object.keys(state.model && state.model.params || {});
    const first = $('sensitivitySurfaceFirst'); const second = $('sensitivitySurfaceSecond');
    const currentFirst = first.value; const currentSecond = second.value;
    const options = names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    first.innerHTML = options; second.innerHTML = options;
    first.value = names.includes(currentFirst) ? currentFirst : (names[0] || '');
    second.value = names.includes(currentSecond) && currentSecond !== first.value ? currentSecond : (names.find(name => name !== first.value) || names[0] || '');
  }
  function populateControls() {
    $('sensitivityT0').value = state.model.t0; $('sensitivityT1').value = state.model.t1; $('sensitivityPoints').value = state.model.points;
    $('sensitivitySolver').value = state.model.method || 'rk45'; $('sensitivityRtol').value = state.model.rtol || 1e-6; $('sensitivityAtol').value = state.model.atol || 1e-9;
    $('sensitivityStepSize').value = state.model.stepSize || 'auto'; $('sensitivityInitialStep').value = state.model.initialStep || 'auto';
    $('sensitivityMaxStep').value = state.model.maxStep || 'auto'; $('sensitivitySafety').value = state.model.safety || 0.9;
    renderEditors(); refreshOutputVariables(); $('sensitivityOutputVar').value = state.model.outputVar || state.model.vars[0];
    state.lastScalarMetric = state.model.outputMetric && state.model.outputMetric !== 'trajectory' ? state.model.outputMetric : state.lastScalarMetric;
    $('sensitivityOutputMetric').value = state.lastScalarMetric || 'final'; refreshSurfaceParameters(); syncMethodControls(); updateBudget();
  }
  function modelFromInputs() {
    state.model.t0 = Number($('sensitivityT0').value); state.model.t1 = Number($('sensitivityT1').value); state.model.points = Number($('sensitivityPoints').value);
    state.model.method = $('sensitivitySolver').value; state.model.rtol = Number($('sensitivityRtol').value); state.model.atol = Number($('sensitivityAtol').value);
    state.model.stepSize = $('sensitivityStepSize').value; state.model.initialStep = $('sensitivityInitialStep').value; state.model.maxStep = $('sensitivityMaxStep').value;
    state.model.safety = Number($('sensitivitySafety').value); state.model.outputVar = $('sensitivityOutputVar').value;
    state.model.outputMetric = $('sensitivityMethod').value === 'fim' ? 'trajectory' : $('sensitivityOutputMetric').value;
    return clone(state.model);
  }
  function analysisFromInputs() {
    return {
      method: $('sensitivityMethod').value, relativeStep: Number($('sensitivityRelativeStep').value), samples: Number($('sensitivitySamples').value),
      trajectories: Number($('sensitivityTrajectories').value), levels: Number($('sensitivityLevels').value), seed: Number($('sensitivitySeed').value),
      sigma: Number($('sensitivitySigma').value), secondOrder: $('sensitivitySecondOrder').checked, bootstrapReplicates: Number($('sensitivityBootstrap').value),
      ofatPoints: Number($('sensitivityOfatPoints').value), direction: $('sensitivityDirection').value, directionalSpan: Number($('sensitivityDirectionalSpan').value), directionPoints: Number($('sensitivityDirectionPoints').value),
      responseSurface: $('sensitivityResponseSurface').checked, surfaceFirst: $('sensitivitySurfaceFirst').value, surfaceSecond: $('sensitivitySurfaceSecond').value, surfacePoints: Number($('sensitivitySurfacePoints').value),
      dependence: $('sensitivityDependence').checked, dependencePermutations: Number($('sensitivityDependencePermutations').value),
      parameterCount: Object.keys(state.model && state.model.params || {}).length, stateCount: state.model && state.model.vars ? state.model.vars.length : 1, outputPoints: Number($('sensitivityPoints').value || state.model && state.model.points || 100)
    };
  }
  function configFromInputs() { return { release: RELEASE, model: modelFromInputs(), analysis: analysisFromInputs(), plots: clone(state.plotTypes), layout: state.layout, focusSide: state.focusSide }; }

  function applyConfig(config, label) {
    if (config && config.configuration) config = config.configuration;
    if (!config || !config.model) throw new Error('Sensitivity configuration is missing a model.');
    cancelRun(false); state.model = clone(config.model); state.plotTypes = Object.assign({ left: 'ranking', right: 'signed' }, config.plots || {});
    state.layout = config.layout || 'two'; state.focusSide = config.focusSide || 'left';
    if (config.analysis) {
      Object.entries({ sensitivityMethod: 'method', sensitivityRelativeStep: 'relativeStep', sensitivitySamples: 'samples', sensitivityTrajectories: 'trajectories', sensitivityLevels: 'levels', sensitivitySeed: 'seed', sensitivitySigma: 'sigma', sensitivityBootstrap: 'bootstrapReplicates', sensitivityOfatPoints: 'ofatPoints', sensitivityDirection: 'direction', sensitivityDirectionalSpan: 'directionalSpan', sensitivityDirectionPoints: 'directionPoints', sensitivitySurfaceFirst: 'surfaceFirst', sensitivitySurfaceSecond: 'surfaceSecond', sensitivitySurfacePoints: 'surfacePoints', sensitivityDependencePermutations: 'dependencePermutations' }).forEach(([id, key]) => {
        if (config.analysis[key] != null) $(id).value = config.analysis[key];
      });
      if (config.analysis.secondOrder != null) $('sensitivitySecondOrder').checked = Boolean(config.analysis.secondOrder);
      if (config.analysis.responseSurface != null) $('sensitivityResponseSurface').checked = Boolean(config.analysis.responseSurface);
      if (config.analysis.dependence != null) $('sensitivityDependence').checked = Boolean(config.analysis.dependence);
    }
    populateControls();
    if (config.analysis) {
      if (config.analysis.surfaceFirst && Array.from($('sensitivitySurfaceFirst').options).some(option => option.value === config.analysis.surfaceFirst)) $('sensitivitySurfaceFirst').value = config.analysis.surfaceFirst;
      if (config.analysis.surfaceSecond && Array.from($('sensitivitySurfaceSecond').options).some(option => option.value === config.analysis.surfaceSecond)) $('sensitivitySurfaceSecond').value = config.analysis.surfaceSecond;
      syncMethodControls();
    }
    clearResult(`${label || 'Configuration'} loaded. Run the analysis to compute evidence.`); applyLayout(state.layout, false);
  }

  function renderPresetLibrary() {
    const names = Object.keys(PRESETS); $('sensitivitySelect').innerHTML = names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(PRESETS[name].title)}</option>`).join('');
    $('sensitivityDeck').innerHTML = names.map(name => `<button type="button" data-preset="${escapeHtml(name)}" class="${name === state.current ? 'active' : ''}"><b>${escapeHtml(PRESETS[name].title)}</b><small>${escapeHtml(PRESETS[name].family)}</small></button>`).join('');
    $('sensitivitySelect').value = state.current;
  }
  function loadPreset(name) {
    const preset = PRESETS[name]; if (!preset) return; cancelRun(false); state.current = name; state.model = clone(preset);
    $('sensitivitySelect').value = name; $('sensitivityNarrative').textContent = preset.note;
    document.querySelectorAll('#sensitivityDeck [data-preset]').forEach(button => button.classList.toggle('active', button.dataset.preset === name));
    populateControls(); clearResult('Example loaded. Review inputs, then run sensitivity analysis.');
  }

  function syncExportState() {
    const computed = Boolean(state.result && !state.dirty);
    ['exportSensitivityCsv', 'exportSensitivityJson', 'exportSensitivityPng', 'exportSensitivitySvg'].forEach(id => { if ($(id)) $(id).disabled = !computed; });
  }
  function markDirty(message) {
    state.dirty = true;
    if (state.result) {
      document.querySelector('.results-card')?.classList.add('stale-results'); setText('sensitivityTopStatus', 'Stale');
      setText('provenanceStatus', 'Inputs changed'); setText('provenanceWarning', 'The visible plots were computed from previous inputs and are marked stale. Result and image exports are disabled until recomputation.');
    }
    syncExportState(); updateBudget(); if (message) setText('sensitivityStatus', message);
  }
  function clearResult(message) {
    state.result = null; state.dirty = true; document.querySelector('.results-card')?.classList.remove('stale-results');
    ['left', 'right'].forEach(side => PLOT.clear($(side + 'Plot'), message || 'Run sensitivity analysis to create this plot.'));
    $('sensitivityDiagnostics').classList.add('empty'); $('sensitivityDiagnostics').textContent = 'Run an analysis to see estimator settings, warnings and ranking evidence.';
    setText('sensitivityTopStatus', 'Ready'); setText('sensitivityRuntime', '—'); setText('sensitivityMethodMetric', '—'); setText('sensitivityEvaluations', '—');
    setText('provenanceStatus', 'Not computed'); setText('provenanceMethod', 'Not run'); setText('provenanceWarning', 'No result exists yet.');
    syncExportState(); if (message) setText('sensitivityStatus', message); updatePlotOptions();
  }

  function validateParameterRanges(model) {
    const entries = Object.entries(model.params || {}); if (!entries.length) throw new Error('Sensitivity analysis requires at least one parameter.');
    entries.forEach(([name, values]) => {
      const value = Number(values[0]); const min = Number(values[1]); const max = Number(values[2]);
      if (![value, min, max].every(Number.isFinite)) throw new Error(`Parameter ${name} value and range must be finite.`);
      if (!(max > min)) throw new Error(`Parameter ${name} requires a non-zero [min,max] sensitivity range.`);
      if (value < min || value > max) throw new Error(`Parameter ${name} current value must lie inside its sensitivity range.`);
    });
  }
  function syncRunAvailability() {
    const running = Boolean(state.worker);
    $('runSensitivity').disabled = running || state.capacityBlocked;
    $('cancelSensitivity').disabled = !running;
  }
  function updateBudget() {
    if (!state.model) return;
    const output = $('sensitivityBudget');
    try {
      const analysis = analysisFromInputs();
      const checked = INPUT.validateSensitivity(analysis);
      state.capacityBlocked = Boolean(checked.capacity && checked.capacity.blocked);
      output.classList.toggle('capacity-blocked', state.capacityBlocked);
      output.classList.toggle('capacity-warning', Boolean(checked.capacity && checked.capacity.warningLevel));
      const pairs = checked.secondOrder ? ` Pairwise interactions: ${checked.capacity.pairCount}.` : '';
      output.textContent = `${checked.capacity.message}${pairs}`;
      syncRunAvailability();
      return checked;
    } catch (error) {
      state.capacityBlocked = true;
      output.classList.add('capacity-blocked'); output.classList.remove('capacity-warning');
      output.textContent = `Computation cannot start: ${error.message}`;
      syncRunAvailability();
      return null;
    }
  }

  function syncMethodControls() {
    const method = $('sensitivityMethod').value;
    const local = method === 'local'; const global = method === 'sobol'; const canSurface = Object.keys(state.model && state.model.params || {}).length >= 2;
    if (!canSurface) $('sensitivityResponseSurface').checked = false;
    const enabled = {
      sensitivityRelativeStep: local || method === 'fim', sensitivitySamples: global,
      sensitivitySecondOrder: global, sensitivityBootstrap: method === 'morris' || global,
      sensitivityTrajectories: method === 'morris', sensitivityLevels: method === 'morris', sensitivitySeed: method === 'morris' || global, sensitivitySigma: method === 'fim',
      sensitivityOfatPoints: local, sensitivityDirection: local, sensitivityDirectionalSpan: local, sensitivityDirectionPoints: local,
      sensitivityResponseSurface: local && canSurface, sensitivitySurfaceFirst: local && canSurface && $('sensitivityResponseSurface').checked, sensitivitySurfaceSecond: local && canSurface && $('sensitivityResponseSurface').checked, sensitivitySurfacePoints: local && canSurface && $('sensitivityResponseSurface').checked,
      sensitivityDependence: global, sensitivityDependencePermutations: global && $('sensitivityDependence').checked
    };
    Object.entries(enabled).forEach(([id, active]) => { $(id).disabled = !active; $(id).closest('label')?.classList.toggle('control-inactive', !active); });
    const metric = $('sensitivityOutputMetric');
    if (method === 'fim') {
      if (metric.value !== 'trajectory') state.lastScalarMetric = metric.value;
      metric.disabled = true; $('sensitivityMethodNote').textContent = 'FIM uses a downsampled trajectory vector (up to 48 points); the scalar output-metric selector is not used.';
    } else {
      metric.disabled = false; metric.value = state.lastScalarMetric || 'final';
      $('sensitivityMethodNote').textContent = method === 'local' ? 'Local analysis computes trajectory derivatives, vector-field Jacobians, OFAT, tornado, a range-normalized direction profile and an optional bounded two-parameter surface.'
        : method === 'morris' ? 'Morris reports μ, μ*, σ, elementary-effect distributions, trajectory-prefix convergence and bootstrap rank stability.'
          : 'Global variance analysis reports Jansen first/total indices, bootstrap uncertainty, time-resolved total effects and sampled relationships. Optional second-order mode adds Saltelli pairwise interactions; limited MI/HSIC adds bounded permutation screening.';
    }
    updateBudget();
  }


  function startRun() {
    cancelRun(false); const model = modelFromInputs(); validateParameterRanges(model);
    const checked = INPUT.validateOde(Object.assign({}, model, { paramDefs: model.params, params: model.params }));
    const analysis = analysisFromInputs(); const checkedAnalysis = INPUT.validateSensitivity(analysis);
    if (checkedAnalysis.capacity && checkedAnalysis.capacity.blocked) throw new Error(checkedAnalysis.capacity.message);
    state.runToken += 1; const token = state.runToken;
    state.worker = new Worker('src/v72/sensitivity-worker.js?v=72.46.0'); syncRunAvailability();
    $('sensitivityProgress').style.width = '4%'; setText('sensitivityStatus', `Starting about ${checkedAnalysis.expectedEvaluations.toLocaleString()} ODE solves in a worker…`);
    setText('sensitivityTopStatus', 'Running'); document.querySelector('.results-card')?.classList.add('stale-results');
    state.worker.onmessage = function (event) {
      if (token !== state.runToken) return; const data = event.data || {};
      if (data.type === 'progress') { $('sensitivityProgress').style.width = Math.round(100 * data.progress) + '%'; setText('sensitivityStatus', data.text || 'Running…'); return; }
      if (data.type === 'result') finishRun(data);
    };
    state.worker.onerror = event => { if (token === state.runToken) finishRun({ ok: false, error: event.message || 'Sensitivity worker failed.' }); };
    state.worker.postMessage({ type: 'run', model: Object.assign({}, model, { paramDefs: model.params, params: model.params }), analysis, outputVar: model.outputVar, outputMetric: model.outputMetric });
    return checked;
  }
  function cancelRun(visible) {
    if (state.worker) { state.worker.terminate(); state.worker = null; } state.runToken += 1;
    $('sensitivityProgress').style.width = '0%'; syncRunAvailability();
    if (visible) { setText('sensitivityStatus', 'Analysis cancelled. No partial result was published.'); setText('sensitivityTopStatus', state.result ? (state.dirty ? 'Stale' : 'Computed') : 'Ready'); }
  }
  function finishRun(data) {
    if (state.worker) { state.worker.terminate(); state.worker = null; }
    syncRunAvailability(); $('sensitivityProgress').style.width = data.ok ? '100%' : '0%';
    setTimeout(() => { $('sensitivityProgress').style.width = '0%'; }, 350);
    if (!data.ok) { setText('sensitivityStatus', data.error || 'Sensitivity analysis failed.'); setText('sensitivityTopStatus', 'Failed'); setText('provenanceStatus', 'Computation failed'); setText('provenanceWarning', data.error || 'Unknown numerical failure.'); syncExportState(); return; }
    state.result = data; state.dirty = false; document.querySelector('.results-card')?.classList.remove('stale-results');
    setText('sensitivityStatus', 'Sensitivity analysis completed. Inspect estimator and solver limitations before interpreting rankings.');
    updateEvidence(); updatePlotOptions(); applyLayout(state.layout); syncExportState();
  }

  function availablePlots() {
    if (!state.result) return ['ranking']; const method = state.result.method;
    if (method === 'local') { const plots = ['ranking', 'signed', 'heatmap', 'parameter-jacobian', 'state-jacobian', 'influence-map', 'ofat', 'tornado', 'convergence']; if (state.result.analysis.directional && state.result.analysis.directional.available !== false) plots.splice(8, 0, 'directional'); if (state.result.analysis.responseSurface) plots.push('response-surface'); return plots; }
    if (method === 'morris') return ['ranking', 'morris', 'morris-effects', 'morris-convergence', 'morris-rank', 'trajectories'];
    if (method === 'sobol') {
      const plots = ['ranking', 'sobol', 'sobol-gap', 'sobol-time', 'variance-contribution', 'global-scatter', 'sobol-uncertainty', 'sobol-rank', 'sobol-output', 'sobol-convergence'];
      if (state.result.analysis.secondOrderEnabled) plots.splice(2, 0, 'sobol-second');
      if (state.result.analysis.dependence) plots.push('dependence-mi', 'dependence-hsic');
      return plots;
    }
    return ['ranking', 'fim', 'spectrum', 'alignment'];
  }
  function updatePlotOptions() {
    const available = availablePlots(); const used = new Set();
    ['left', 'right'].forEach(side => {
      let desired = state.plotTypes[side]; if (!available.includes(desired) || used.has(desired)) desired = available.find(value => !used.has(value)) || available[0];
      state.plotTypes[side] = desired; used.add(desired); const select = $(side + 'PlotType');
      select.innerHTML = available.map(type => `<option value="${type}">${escapeHtml(PLOTS[type].label)}</option>`).join(''); select.value = desired;
    });
    $('plotGrid').dataset.compatibleCount = String(Math.min(2, available.length)); if (root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('sensitivity');
  }
  function selectPlot(side, value) {
    const other = side === 'left' ? 'right' : 'left'; const previous = state.plotTypes[side];
    if (state.plotTypes[other] === value) { state.plotTypes[other] = previous; $(other + 'PlotType').value = previous; renderPlot(other); }
    state.plotTypes[side] = value; state.lastPlotSide = side; renderPlot(side);
  }
  function chartLayout(xTitle, yTitle) {
    return { margin: { t: 28, r: 18, b: 58, l: 64 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', font: { family: 'Inter, system-ui, sans-serif', color: '#172033', size: 11 }, xaxis: { title: xTitle, automargin: true, gridcolor: '#e7ebf1' }, yaxis: { title: yTitle, automargin: true, gridcolor: '#e7ebf1' }, legend: { orientation: 'h', y: 1.08 } };
  }
  function rankingRows() {
    const analysis = state.result.analysis;
    if (state.result.method === 'local') return analysis.rows.map(row => ({ name: row.name, value: Number.isFinite(row.elasticity) ? Math.abs(row.elasticity) : Math.abs(row.rangeScaled), secondary: row.derivative, label: Number.isFinite(row.elasticity) ? '|elasticity|' : '|range-scaled derivative|' }));
    if (state.result.method === 'morris') return analysis.rows.map(row => ({ name: row.name, value: row.muStar, secondary: row.sigma, label: 'μ*' }));
    if (state.result.method === 'sobol') return analysis.rows.map(row => ({ name: row.name, value: row.total, secondary: row.first, label: 'total-order estimate' }));
    return analysis.names.map((name, i) => ({ name, value: analysis.matrix[i][i], secondary: analysis.eigenvalues[i], label: 'scaled information diagonal' }));
  }
  function plotSpec(type) {
    const result = state.result; const analysis = result && result.analysis; if (!result) return { traces: [], layout: chartLayout('', '') };
    if (type === 'ranking') {
      const rows = rankingRows().sort((a, b) => b.value - a.value);
      return { traces: [{ type: 'bar', orientation: 'h', y: rows.map(row => row.name).reverse(), x: rows.map(row => row.value).reverse(), name: rows[0]?.label || 'influence' }], layout: chartLayout('influence magnitude', 'parameter') };
    }
    if (type === 'signed') {
      const useElasticity = analysis.rows.some(row => Number.isFinite(row.elasticity));
      return { traces: [{ type: 'bar', x: analysis.rows.map(row => row.name), y: analysis.rows.map(row => Number.isFinite(row.elasticity) ? row.elasticity : row.rangeScaled), name: useElasticity ? 'elasticity' : 'range-scaled derivative' }], layout: chartLayout('parameter', useElasticity ? 'signed elasticity' : 'signed range-scaled derivative') };
    }
    if (type === 'heatmap') return { traces: [{ type: 'heatmap', x: analysis.trajectory.time, y: analysis.trajectory.rows.map(row => row.name), z: analysis.trajectory.rows.map(row => row.values), colorscale: 'RdBu', zmid: 0, colorbar: { title: '∂state/∂p' } }], layout: chartLayout('time', 'parameter') };
    if (type === 'parameter-jacobian') return { traces: [{ type: 'heatmap', x: analysis.jacobians.parameters, y: analysis.jacobians.states, z: analysis.jacobians.parameterMeanAbsolute, colorscale: 'Viridis', colorbar: { title: 'mean |∂f/∂p|' }, text: analysis.jacobians.parameterMeanAbsolute.map(row => row.map(value => number(value, 3))), texttemplate: '%{text}' }], layout: chartLayout('parameter', 'equation / state derivative') };
    if (type === 'state-jacobian') return { traces: [{ type: 'heatmap', x: analysis.jacobians.states, y: analysis.jacobians.states, z: analysis.jacobians.stateMeanAbsolute, colorscale: 'Viridis', colorbar: { title: 'mean |∂f/∂x|' }, text: analysis.jacobians.stateMeanAbsolute.map(row => row.map(value => number(value, 3))), texttemplate: '%{text}' }], layout: chartLayout('state variable', 'equation / state derivative') };
    if (type === 'influence-map') return { traces: [{ type: 'heatmap', x: analysis.trajectory.parameterNames, y: analysis.trajectory.stateNames, z: analysis.trajectory.influenceMatrix, colorscale: 'Viridis', colorbar: { title: 'time-mean |∂x/∂p|' } }], layout: chartLayout('parameter', 'state') };
    if (type === 'ofat') return { traces: analysis.ofat.rows.map(row => ({ type: 'scatter', mode: 'lines+markers', name: row.name, x: row.normalized.map(value => 100 * value), y: row.outputs, customdata: row.values, hovertemplate: `${row.name}: %{customdata}<br>relative range displacement: %{x:.1f}%<br>output: %{y}<extra></extra>` })), layout: chartLayout('displacement from nominal (% of declared range)', 'scalar output') };
    if (type === 'tornado') { const rows = analysis.ofat.rows.slice().sort((a,b) => Math.max(Math.abs(b.lowChange), Math.abs(b.highChange)) - Math.max(Math.abs(a.lowChange), Math.abs(a.highChange))); return { traces: [{ type:'bar', orientation:'h', name:'at minimum', y:rows.map(row=>row.name), x:rows.map(row=>row.lowChange) }, { type:'bar', orientation:'h', name:'at maximum', y:rows.map(row=>row.name), x:rows.map(row=>row.highChange) }], layout:Object.assign(chartLayout('change from nominal output','parameter'),{barmode:'group'}) }; }
    if (type === 'directional') return { traces: [{ type:'scatter', mode:'lines+markers', x:analysis.directional.steps, y:analysis.directional.outputs, name:'directional profile' }, { type:'scatter', mode:'markers', x:[0], y:[analysis.directional.outputs[Math.floor(analysis.directional.outputs.length/2)]], name:'nominal', marker:{size:11} }], layout:chartLayout('range-normalized direction coordinate','scalar output') };
    if (type === 'response-surface') return { traces: [{ type:'surface', x:analysis.responseSurface.x, y:analysis.responseSurface.y, z:analysis.responseSurface.z, colorscale:'Viridis', colorbar:{title:'output'} }], layout:Object.assign(chartLayout(analysis.responseSurface.first,analysis.responseSurface.second),{scene:{xaxis:{title:analysis.responseSurface.first},yaxis:{title:analysis.responseSurface.second},zaxis:{title:'output'}},margin:{t:24,r:18,b:28,l:28}}) };
    if (type === 'convergence') {
      const names = analysis.rows.map(row => row.name);
      return { traces: names.map(name => ({ type: 'scatter', mode: 'lines+markers', name, x: analysis.convergence.map(item => item.step), y: analysis.convergence.map(item => Math.abs(item.rows.find(row => row.name === name).derivative)) })), layout: Object.assign(chartLayout('relative perturbation', '|derivative|'), { xaxis: { title: 'relative perturbation', type: 'log', autorange: 'reversed', automargin: true, gridcolor: '#e7ebf1' } }) };
    }
    if (type === 'morris') return { traces: [{ type: 'scatter', mode: 'markers+text', textposition: 'top center', text: analysis.rows.map(row => row.name), x: analysis.rows.map(row => row.muStar), y: analysis.rows.map(row => row.sigma), error_x: { type: 'data', array: analysis.rows.map(row => Number.isFinite(row.muStarSe) ? 1.96 * row.muStarSe : 0), visible: true }, marker: { size: 10 } }], layout: chartLayout('μ* on normalized range', 'σ') };
    if (type === 'morris-effects') return { traces: analysis.rows.map(row => ({ type: 'box', name: row.name, y: row.effects, boxpoints: analysis.trajectories <= 40 ? 'all' : 'outliers', jitter: 0.25, pointpos: 0 })), layout: chartLayout('parameter', 'elementary effect') };
    if (type === 'morris-convergence') return { traces: analysis.rows.map(row => ({ type: 'scatter', mode: 'lines+markers', name: row.name, x: analysis.convergence.map(item => item.trajectories), y: analysis.convergence.map(item => item.rows.find(candidate => candidate.name === row.name).muStar) })), layout: chartLayout('trajectories used', 'prefix μ*') };
    if (type === 'morris-rank') {
      const rows = analysis.rankStability.slice().sort((a, b) => a.medianRank - b.medianRank);
      return { traces: [{ type: 'scatter', mode: 'markers', x: rows.map(row => row.medianRank), y: rows.map(row => row.name), error_x: { type: 'data', symmetric: false, array: rows.map(row => row.rankHigh - row.medianRank), arrayminus: rows.map(row => row.medianRank - row.rankLow), visible: true }, marker: { size: rows.map(row => 8 + 12 * (Number.isFinite(row.topProbability) ? row.topProbability : 0)), color: rows.map(row => row.topProbability), colorscale: 'Viridis', cmin: 0, cmax: 1, colorbar: { title: 'P(rank 1)' } } }], layout: Object.assign(chartLayout('bootstrap rank (lower is stronger)', 'parameter'), { xaxis: { title: 'bootstrap rank (lower is stronger)', autorange: 'reversed', dtick: 1, automargin: true, gridcolor: '#e7ebf1' } }) };
    }
    if (type === 'trajectories') return { traces: analysis.traces.map((path, i) => ({ type: 'scatter', mode: 'lines+markers', name: `path ${i + 1}`, x: path.map(point => point.step), y: path.map(point => point.output), showlegend: analysis.traces.length <= 12 })), layout: chartLayout('Morris step', 'scalar output') };
    if (type === 'sobol') {
      const minValue = Math.min(-0.1, ...analysis.rows.map(row => Math.min(row.first, row.total)));
      const maxValue = Math.max(1.05, ...analysis.rows.map(row => Math.max(row.first, row.total)));
      return { traces: [
        { type: 'bar', name: 'first-order', x: analysis.rows.map(row => row.name), y: analysis.rows.map(row => row.first), error_y: { type: 'data', array: analysis.rows.map(row => Number.isFinite(row.firstSe) ? 1.96 * row.firstSe : 0), visible: true } },
        { type: 'bar', name: 'total-order', x: analysis.rows.map(row => row.name), y: analysis.rows.map(row => row.total), error_y: { type: 'data', array: analysis.rows.map(row => Number.isFinite(row.totalSe) ? 1.96 * row.totalSe : 0), visible: true } }
      ], layout: Object.assign(chartLayout('parameter', 'sensitivity estimate'), { barmode: 'group', yaxis: { title: 'sensitivity estimate', range: [minValue * 1.1, maxValue * 1.1], automargin: true, gridcolor: '#e7ebf1', zeroline: true } }) };
    }

    if (type === 'sobol-second') return { traces: [{ type: 'heatmap', x: analysis.names, y: analysis.names, z: analysis.secondOrderMatrix, zmid: 0, colorscale: 'RdBu', colorbar: { title: 'S₂ estimate' }, text: analysis.secondOrderMatrix.map(row => row.map(value => number(value, 3))), texttemplate: '%{text}' }], layout: chartLayout('parameter', 'parameter') };
    if (type === 'sobol-gap') return { traces: [{ type: 'bar', x: analysis.rows.map(row => row.name), y: analysis.rows.map(row => row.gap), name: 'total − first' }], layout: chartLayout('parameter', 'aggregate interaction gap') };
    if (type === 'sobol-uncertainty') return { traces: [
      { type: 'scatter', mode: 'markers', name: 'first-order', x: analysis.rows.map(row => row.first), y: analysis.rows.map(row => row.name), error_x: { type: 'data', symmetric: false, array: analysis.rows.map(row => Math.max(0, row.firstHigh - row.first)), arrayminus: analysis.rows.map(row => Math.max(0, row.first - row.firstLow)), visible: true } },
      { type: 'scatter', mode: 'markers', name: 'total-order', x: analysis.rows.map(row => row.total), y: analysis.rows.map(row => row.name), error_x: { type: 'data', symmetric: false, array: analysis.rows.map(row => Math.max(0, row.totalHigh - row.total)), arrayminus: analysis.rows.map(row => Math.max(0, row.total - row.totalLow)), visible: true } }
    ], layout: chartLayout('estimate with bootstrap 95% interval', 'parameter') };
    if (type === 'sobol-rank') {
      const rows = analysis.rows.slice().sort((a, b) => a.medianRank - b.medianRank);
      return { traces: [{ type: 'scatter', mode: 'markers', x: rows.map(row => row.medianRank), y: rows.map(row => row.name), error_x: { type: 'data', symmetric: false, array: rows.map(row => row.rankHigh - row.medianRank), arrayminus: rows.map(row => row.medianRank - row.rankLow), visible: true }, marker: { size: rows.map(row => 8 + 12 * (Number.isFinite(row.topProbability) ? row.topProbability : 0)), color: rows.map(row => row.topProbability), colorscale: 'Viridis', cmin: 0, cmax: 1, colorbar: { title: 'P(rank 1)' } } }], layout: Object.assign(chartLayout('bootstrap total-order rank', 'parameter'), { xaxis: { title: 'bootstrap total-order rank', autorange: 'reversed', dtick: 1, automargin: true, gridcolor: '#e7ebf1' } }) };
    }
    if (type === 'sobol-output') return { traces: [{ type: 'bar', x: analysis.outputHistogram.map(row => row.center), y: analysis.outputHistogram.map(row => row.count), name: 'base-matrix outputs' }], layout: chartLayout('model output', 'sample count') };
    if (type === 'sobol-convergence') {
      return { traces: analysis.rows.map(row => ({ type: 'scatter', mode: 'lines+markers', name: row.name, x: analysis.convergence.map(item => item.samples), y: analysis.convergence.map(item => item.rows.find(candidate => candidate.name === row.name).total) })), layout: Object.assign(chartLayout('base samples', 'total-order estimate'), { xaxis: { title: 'base samples', type: 'log', automargin: true, gridcolor: '#e7ebf1' } }) };
    }
    if (type === 'sobol-time') return { traces: [{ type:'heatmap', x:analysis.timeSensitivity.time, y:analysis.timeSensitivity.names, z:analysis.timeSensitivity.totalMatrix, colorscale:'Viridis', colorbar:{title:'total-order'} }], layout:chartLayout('time','parameter') };
    if (type === 'variance-contribution') { const v=analysis.varianceContribution; return { traces:[{type:'bar',x:['first-order sum','pairwise sum','unresolved / higher-order + MC remainder'],y:[v.firstOrder,v.pairwise,v.unresolved],text:[number(v.firstOrder,3),number(v.pairwise,3),number(v.unresolved,3)],textposition:'auto'}], layout:chartLayout('contribution category','raw variance-share estimate') }; }
    if (type === 'global-scatter') { const top=analysis.rows.slice().sort((a,b)=>b.total-a.total).slice(0,4).map(row=>row.name); const dimensions=top.map(name=>({label:name,values:analysis.sampleRows.map(row=>row[name])})).concat([{label:'output',values:analysis.sampleRows.map(row=>row.__output)}]); return { traces:[{type:'splom',dimensions,marker:{size:4,opacity:0.55},diagonal:{visible:false},showupperhalf:false}], layout:Object.assign(chartLayout('',''),{dragmode:'select',hovermode:'closest',margin:{t:28,r:18,b:44,l:44}}) }; }
    if (type === 'dependence-mi') return { traces:[{type:'bar',x:analysis.dependence.rows.map(row=>row.name),y:analysis.dependence.rows.map(row=>row.mutualInformation),text:analysis.dependence.rows.map(row=>`p=${number(row.mutualInformationP,3)}`),textposition:'auto'}],layout:chartLayout('parameter','normalized histogram MI') };
    if (type === 'dependence-hsic') return { traces:[{type:'bar',x:analysis.dependence.rows.map(row=>row.name),y:analysis.dependence.rows.map(row=>row.hsic),text:analysis.dependence.rows.map(row=>`p=${number(row.hsicP,3)}`),textposition:'auto'}],layout:chartLayout('parameter','normalized RBF-HSIC') };
    if (type === 'fim') return { traces: [{ type: 'heatmap', x: analysis.names, y: analysis.names, z: analysis.matrix, colorscale: 'Viridis', colorbar: { title: 'scaled information' } }], layout: chartLayout('parameter', 'parameter') };
    if (type === 'alignment') return { traces: [{ type: 'heatmap', x: analysis.names, y: analysis.names, z: analysis.alignment, zmin: -1, zmax: 1, zmid: 0, colorscale: 'RdBu', colorbar: { title: 'alignment' } }], layout: chartLayout('parameter', 'parameter') };
    if (type === 'spectrum') return { traces: [{ type: 'scatter', mode: 'lines+markers', x: analysis.eigenvalues.map((_, i) => i + 1), y: analysis.eigenvalues.map(value => Math.max(value, 1e-30)), name: 'scaled information eigenvalue' }], layout: Object.assign(chartLayout('ordered direction', 'eigenvalue'), { yaxis: { title: 'eigenvalue', type: 'log', automargin: true, gridcolor: '#e7ebf1' } }) };
    return { traces: [], layout: chartLayout('', '') };
  }
  function renderPlot(side) {
    const type = state.plotTypes[side]; const meta = PLOTS[type] || PLOTS.ranking;
    setText(side + 'PlotTitle', meta.title); setText(side + 'PlotEvidence', meta.evidence);
    if (!state.result) return PLOT.clear($(side + 'Plot'), 'Run sensitivity analysis to create this plot.');
    const spec = plotSpec(type); return PLOT.render($(side + 'Plot'), spec.traces, spec.layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] });
  }
  function renderPlots() { renderPlot('left'); renderPlot('right'); if (root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('sensitivity'); }
  function applyLayout(layout) {
    state.layout = layout; document.querySelectorAll('[data-layout-mode]').forEach(button => button.classList.toggle('active', button.dataset.layoutMode === layout));
    const report = root.FokoLayoutStability.apply({ grid: $('plotGrid'), preferred: layout, focus: state.focusSide, breakpoint: 1024, compatibleCount: Math.min(2, availablePlots().length) });
    if (state.result) renderPlots(); return report;
  }

  function updateEvidence() {
    const analysis = state.result.analysis; const solver = state.result.solverSummary || {}; const warnings = warningsText(state.result.warnings);
    setText('sensitivityTopStatus', 'Computed'); setText('sensitivityRuntime', (state.result.runtime / 1000).toFixed(3) + ' s'); setText('sensitivityMethodMetric', state.result.method);
    setText('sensitivityEvaluations', number(solver.odeSolves || analysis.evaluations, 0)); setText('sensitivityParameterCount', String(Object.keys(state.result.model.paramDefs || {}).length));
    setText('sensitivityOutputMetricCard', state.result.outputMetric === 'trajectory' ? `trajectory(${state.result.outputVar})` : `${state.result.outputMetric}(${state.result.outputVar})`);
    setText('sensitivityRtolMetric', Number(state.result.model.rtol).toExponential(1)); setText('sensitivityAtolMetric', Number(state.result.model.atol).toExponential(1));
    setText('provenanceStatus', 'Computed'); setText('provenanceMethod', state.result.method);
    setText('provenanceScope', `${state.result.outputMetric === 'trajectory' ? 'downsampled trajectory' : state.result.outputMetric} of ${state.result.outputVar} on t=[${number(state.result.model.t0)}, ${number(state.result.model.t1)}]`);
    setText('provenanceReliability', state.result.method === 'local' ? 'Local and perturbation-dependent' : state.result.method === 'fim' ? 'Local, scaled and noise-model-dependent' : 'Finite-sample screening estimate');
    const combinedWarnings = [analysis.warning, warnings, ...(solver.warnings || [])].filter(Boolean).join(' '); setText('provenanceWarning', combinedWarnings);
    const rows = rankingRows().sort((a, b) => b.value - a.value);
    const special = state.result.method === 'fim' ? `<p><b>Estimated rank:</b> ${analysis.rank}/${analysis.names.length}. <b>Condition:</b> ${Number.isFinite(analysis.condition) ? number(analysis.condition) : 'rank deficient / infinite'}.</p>`
      : state.result.method === 'sobol' ? `<p><b>Base samples:</b> ${number(analysis.samples, 0)}. <b>Bootstrap replicates:</b> ${number(analysis.bootstrapReplicates, 0)}. <b>Second-order pairs:</b> ${analysis.secondOrderEnabled ? number(analysis.secondOrder.length, 0) : 'disabled'}. <b>Dependence screening:</b> ${analysis.dependence ? `${analysis.dependence.sampleCount} samples / ${analysis.dependence.permutations} permutations` : 'disabled'}.</p>`
        : state.result.method === 'morris' ? `<p><b>Trajectories:</b> ${number(analysis.trajectories, 0)}. <b>Grid levels:</b> ${number(analysis.levels, 0)}. <b>Bootstrap replicates:</b> ${number(analysis.bootstrapReplicates, 0)}.</p>`
          : state.result.method === 'local' ? `<p><b>OFAT points:</b> ${number(analysis.ofat && analysis.ofat.points,0)} per parameter. <b>Directional derivative:</b> ${analysis.directional && analysis.directional.available !== false ? number(analysis.directional.derivative) : 'unavailable at current bounds'}. <b>Response surface:</b> ${analysis.responseSurface ? `${analysis.responseSurface.points}×${analysis.responseSurface.points}` : 'disabled'}.</p>` : '';
    $('sensitivityDiagnostics').classList.remove('empty');
    $('sensitivityDiagnostics').innerHTML = `<p><b>Top ranking:</b> ${rows.slice(0, 5).map(row => `${escapeHtml(row.name)} (${number(row.value)})`).join(' · ')}</p><p><b>ODE solves:</b> ${number(solver.odeSolves || analysis.evaluations, 0)} of about ${number(state.result.estimatedOdeSolves, 0)}. <b>Function evaluations:</b> ${number(solver.functionEvaluations, 0)}. <b>Accepted/rejected steps:</b> ${number(solver.acceptedSteps, 0)}/${number(solver.rejectedSteps, 0)}.</p><p><b>Maximum rejection ratio:</b> ${number(solver.maxRejectionRatio)}. <b>Largest local timescale ratio:</b> ${number(solver.maxTimescaleRatio)}.</p>${special}<p>${escapeHtml(analysis.warning || '')}</p>${warnings ? `<p><b>Input warning:</b> ${escapeHtml(warnings)}</p>` : ''}${(solver.warnings || []).length ? `<p><b>Solver warning:</b> ${escapeHtml(solver.warnings.join(' '))}</p>` : ''}`;
  }

  function resultConfiguration() { return state.result && state.result.configuration ? clone(state.result.configuration) : null; }
  function serializable() { return { release: RELEASE, configuration: resultConfiguration(), result: state.result }; }
  function summaryCsv() {
    if (!state.result || state.dirty) return '';
    const rows = [['parameter', 'primary', 'secondary', 'method']]; rankingRows().forEach(row => rows.push([row.name, row.value, row.secondary, state.result.method])); return rows.map(row => row.join(',')).join('\n') + '\n';
  }
  function pythonScript() {
    const cfg = configFromInputs();
    return `# Foko Lab v${RELEASE} sensitivity validation scaffold\n# Recreate the ODE with scipy.integrate.solve_ivp and use SALib or explicit finite differences.\nimport json\nconfiguration = json.loads(r'''${JSON.stringify(cfg)}''')\nprint(json.dumps(configuration, indent=2))\n# Browser results are not imported here as ground truth. Recompute independently.\n`;
  }
  function exportCurrent(format) {
    if (!state.result || state.dirty) return; const host = $(state.lastPlotSide + 'Plot');
    root.Plotly.downloadImage(host, { format, filename: `fokolab-sensitivity-${state.plotTypes[state.lastPlotSide]}`, width: 1200, height: 760 });
  }
  function copyText(text, success) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => setText('sensitivityStatus', success)).catch(() => setText('sensitivityStatus', 'Clipboard access failed. Export Model JSON instead.'));
    else setText('sensitivityStatus', 'Clipboard API is unavailable. Export Model JSON instead.');
  }

  function bind() {
    $('runSensitivity').addEventListener('click', () => { try { startRun(); } catch (error) { setText('sensitivityStatus', error.message); setText('sensitivityTopStatus', 'Invalid input'); setText('provenanceWarning', error.message); } });
    $('cancelSensitivity').addEventListener('click', () => cancelRun(true)); $('resetSensitivity').addEventListener('click', () => loadPreset(state.current));
    $('loadSensitivity').addEventListener('click', () => loadPreset($('sensitivitySelect').value));
    $('sensitivitySelect').addEventListener('change', function () { state.current = this.value; setText('sensitivityNarrative', PRESETS[this.value]?.note || ''); });
    $('sensitivityDeck').addEventListener('click', event => { const button = event.target.closest('[data-preset]'); if (button) loadPreset(button.dataset.preset); });
    $('addSensitivityState').addEventListener('click', () => { const index = state.model.vars.length + 1; state.model.vars.push('u' + index); state.model.eqs.push('0'); state.model.y0.push(0); renderEditors(); refreshOutputVariables(); markDirty('State added.'); });
    $('addSensitivityParameter').addEventListener('click', () => { let index = 1; while (state.model.params['p' + index]) index += 1; state.model.params['p' + index] = [1, 0.5, 1.5]; renderEditors(); markDirty('Parameter added.'); });
    ['sensitivityT0', 'sensitivityT1', 'sensitivityPoints', 'sensitivitySolver', 'sensitivityRtol', 'sensitivityAtol', 'sensitivityStepSize', 'sensitivityInitialStep', 'sensitivityMaxStep', 'sensitivitySafety', 'sensitivityOutputVar', 'sensitivityOutputMetric', 'sensitivityRelativeStep', 'sensitivitySamples', 'sensitivitySecondOrder', 'sensitivityBootstrap', 'sensitivityTrajectories', 'sensitivityLevels', 'sensitivitySeed', 'sensitivitySigma', 'sensitivityOfatPoints', 'sensitivityDirection', 'sensitivityDirectionalSpan', 'sensitivityDirectionPoints', 'sensitivityResponseSurface', 'sensitivitySurfaceFirst', 'sensitivitySurfaceSecond', 'sensitivitySurfacePoints', 'sensitivityDependence', 'sensitivityDependencePermutations'].forEach(id => $(id).addEventListener('input', () => markDirty('Numerical or analysis settings changed. Run to recompute.')));
    $('sensitivityOutputMetric').addEventListener('change', function () { state.lastScalarMetric = this.value; });
    $('sensitivityMethod').addEventListener('change', () => { syncMethodControls(); markDirty('Sensitivity method changed. Run to recompute.'); });
    $('sensitivityResponseSurface').addEventListener('change', syncMethodControls);
    $('sensitivityDependence').addEventListener('change', syncMethodControls);
    document.querySelectorAll('[data-layout-mode]').forEach(button => button.addEventListener('click', () => applyLayout(button.dataset.layoutMode)));
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(button => button.addEventListener('click', () => { state.focusSide = button.dataset.focusSide; state.lastPlotSide = state.focusSide; applyLayout('focus'); }));
    ['left', 'right'].forEach(side => $(side + 'PlotType').addEventListener('change', function () { selectPlot(side, this.value); }));
    $('sensitivityImport').addEventListener('change', function () {
      const file = this.files && this.files[0]; if (!file) return; const reader = new FileReader();
      reader.onload = () => { try { applyConfig(JSON.parse(reader.result), `Imported ${file.name}`); } catch (error) { setText('sensitivityStatus', 'Import failed: ' + error.message); } this.value = ''; };
      reader.readAsText(file);
    });
    $('saveSensitivitySession').addEventListener('click', () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(configFromInputs())); setText('sensitivityStatus', 'Configuration saved locally. Computed evidence was not stored.'); });
    $('restoreSensitivitySession').addEventListener('click', () => { try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) throw new Error('No saved sensitivity configuration exists.'); applyConfig(JSON.parse(raw), 'Saved configuration'); } catch (error) { setText('sensitivityStatus', error.message); } });
    $('copySensitivityShareUrl').addEventListener('click', () => {
      const url = new URL(location.href); url.search = ''; url.searchParams.set('state', encodeState(configFromInputs()));
      if (url.toString().length > 7000) { setText('sensitivityStatus', 'This model is too large for a reliable share URL. Export Model JSON instead.'); return; }
      copyText(url.toString(), 'Share URL copied. It stores configuration only.');
    });
    $('exportSensitivityCsv').addEventListener('click', () => { if (!state.dirty) download('fokolab-sensitivity-summary.csv', summaryCsv(), 'text/csv'); });
    $('exportSensitivityJson').addEventListener('click', () => { if (!state.dirty) download('fokolab-sensitivity-result.json', JSON.stringify(serializable(), null, 2), 'application/json'); });
    $('exportSensitivityModel').addEventListener('click', () => download('fokolab-sensitivity-model.json', JSON.stringify(configFromInputs(), null, 2), 'application/json'));
    $('exportSensitivityPython').addEventListener('click', () => download('fokolab_sensitivity_validate.py', pythonScript(), 'text/x-python'));
    $('exportSensitivityPng').addEventListener('click', () => exportCurrent('png')); $('exportSensitivitySvg').addEventListener('click', () => exportCurrent('svg'));
    document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => document.querySelector('#' + button.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
    window.addEventListener('resize', () => applyLayout(state.layout));
  }
  function restoreFromUrl() {
    const encoded = new URL(location.href).searchParams.get('state'); if (!encoded) return false;
    try { applyConfig(decodeState(encoded), 'Shared configuration'); return true; } catch (error) { setText('sensitivityStatus', 'Share state could not be decoded: ' + error.message); return false; }
  }
  function boot() {
    renderPresetLibrary(); bind(); if (!restoreFromUrl()) loadPreset(state.current); updatePlotOptions(); applyLayout('two'); syncMethodControls(); syncExportState();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}(typeof window !== 'undefined' ? window : globalThis));
