/* Foko Lab v72.1 Steady-State workspace.
 * Authored DOM controller and Plotly adapter for the pure FokoSteadyCore.
 * It does not move or reconstruct page structure after load.
 */
(function (root) {
  'use strict';

  const Core = root.FokoSteadyCore;
  const $ = function (id) { return document.getElementById(id); };
  const clone = function (value) { return JSON.parse(JSON.stringify(value)); };
  const STORAGE_KEY = 'fokolab:v72:steady-session';
  const LAYOUT_KEY = 'fokolab:v72:steady-layout';
  const VALID_LAYOUTS = new Set(['two', 'focus']);
  const VALID_SIDES = new Set(['left', 'right']);
  const TAXONOMY = root.FokoAnalysisTaxonomy || null;

  const PRESETS = root.FokoSteadyPresets;
  if (!PRESETS) throw new Error('FokoSteadyPresets did not load.');

  const CORE_PRESETS = Object.keys(PRESETS).slice(0, 6);
  const state = {
    currentName: CORE_PRESETS[0],
    model: null,
    solution: null,
    multiStart: null,
    scan1D: [],
    scan2D: null,
    resultKind: 'none',
    plotType: { left: 'equilibrium', right: 'residual' },
    preferredLayout: 'two',
    focusSide: 'left',
    busy: false,
  };

  const PLOT_META = {
    equilibrium: { title: 'Equilibrium values', evidence: 'Values at the current root. A bar is shown only after the residual tolerance gate succeeds or as an explicitly approximate iterate.' },
    residual: { title: 'Newton residual history', evidence: 'Euclidean residual norm at each Newton iteration. The logarithmic axis exposes convergence, stagnation, or failure.' },
    jacobian: { title: 'Finite-difference Jacobian', evidence: 'Central finite-difference Jacobian evaluated at the reported root or final iterate. It is numerical, not symbolic.' },
    eigenvalues: { title: 'Local eigenvalues', evidence: 'Exact analytic eigenvalues of a 1×1 or 2×2 numerical Jacobian, shown only for a declared dynamical interpretation.' },
    roots: { title: 'Distinct multi-start roots', evidence: 'Roots found from a deterministic finite set of initial guesses. Absence from this set is not proof that another root does not exist.' },
    'residual-surface': { title: 'Residual-norm surface', evidence: 'Finite two-variable grid of log10 ||f(x)||₂ around the current root. Grid minima are visual candidates, not certified roots.' },
    nullclines: { title: 'Nullcline overlay', evidence: 'Zero contours of the first two residual equations over a finite window. Intersections are candidates; the contour grid can miss tangent or closely spaced roots.' },
    branch: { title: 'Sequential parameter branch', evidence: 'Each sampled parameter value is solved using the previous converged root as the next initial guess. This is not pseudo-arclength continuation.' },
    'scan-residual': { title: 'Scan residual evidence', evidence: 'Final residual norm at each sampled parameter. Missing or failed points remain visible as gaps or failure markers.' },
    'stability-margin': { title: 'Sampled stability margin', evidence: 'Largest real eigenvalue sampled along a 1D parameter scan. Sign crossings are candidates between grid points, not confirmed bifurcations.' },
    candidates: { title: 'Grid-dependent candidates', evidence: 'Candidate markers derived from sign changes or sampled slope reversals. They are explicitly unconfirmed and grid dependent.' },
    'map-convergence': { title: '2D convergence map', evidence: 'Grid cell value is one only when the final residual satisfies tolerance; zero means the browser solve did not converge.' },
    'map-residual': { title: '2D log residual map', evidence: 'Base-10 logarithm of the final residual norm over the sampled parameter grid.' },
    'map-stability': { title: '2D stability-margin map', evidence: 'Largest real eigenvalue where a supported dynamical classification exists. Blank cells are unsupported or non-converged.' },
    'map-variable': { title: '2D equilibrium-value map', evidence: 'Selected first state variable over the sampled parameter grid, shown only at converged cells.' },
    'jacobian-sign': { title: 'Jacobian sign structure', evidence: 'Sign of each numerical Jacobian entry at the reported root. Magnitude is intentionally suppressed; zero means numerically near zero at the current finite-difference scale.' },
    'stiffness-indicator': { title: 'Local stiffness indicator', evidence: 'Ratio of the largest to smallest non-zero local eigenvalue magnitude where a supported eigenspectrum exists. It is a local indicator, not a solver recommendation or global stiffness proof.' },
    'implicit-sensitivity': { title: 'Sequential-scan sensitivity', evidence: 'Finite-difference slope of the sampled equilibrium branch with respect to the scanned parameter. It is not analytic implicit-function sensitivity and inherits all scan-grid limitations.' },
  };
  root.FokoSteadyPlotMeta = PLOT_META;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  function normaliseSymbol(value) {
    return String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '').replace(/^(\d)/, '_$1');
  }

  function parseEquations(text) {
    return String(text || '')
      .replace(/[−–—]/g, '-')
      .split(/\n|\\\\/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        const withoutLabel = line.replace(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/, '');
        const equalParts = withoutLabel.split('=');
        if (equalParts.length === 2) return `(${equalParts[0]})-(${equalParts[1]})`;
        return withoutLabel;
      });
  }

  function validateModel(model) {
    if (!model || !Array.isArray(model.vars) || !Array.isArray(model.equations)) throw new Error('Model must contain vars and equations arrays.');
    if (model.vars.length === 0) throw new Error('At least one variable is required.');
    if (model.equations.length !== model.vars.length) throw new Error(`Expected ${model.vars.length} equations, found ${model.equations.length}.`);
    const names = model.vars.map(function (entry) { return normaliseSymbol(entry[0]); });
    if (names.some(function (name) { return !name; })) throw new Error('Every variable requires a valid name.');
    if (new Set(names).size !== names.length) throw new Error('Variable names must be unique.');
    const parameterNames = Object.keys(model.params || {});
    if (parameterNames.some(function (name) { return !normaliseSymbol(name); })) throw new Error('Every parameter requires a valid name.');
    if (new Set(parameterNames).size !== parameterNames.length) throw new Error('Parameter names must be unique.');
    const overlap = names.filter(function (name) { return parameterNames.includes(name); });
    if (overlap.length) throw new Error(`Names cannot be both variables and parameters: ${overlap.join(', ')}.`);
    model.vars.forEach(function (entry, index) {
      const guess = Number(entry[1]);
      if (!Number.isFinite(guess)) throw new Error(`Initial guess for ${names[index]} must be finite.`);
    });
    parameterNames.forEach(function (name) {
      if (!Number.isFinite(Number(model.params[name]))) throw new Error(`Parameter ${name} must be finite.`);
    });
    return names;
  }

  function compileModel(parameterOverride) {
    readEditorIntoModel();
    const names = validateModel(state.model);
    const parameters = Object.assign({}, state.model.params, parameterOverride || {});
    const allowed = new Set(names.concat(Object.keys(parameters), ['pi', 'e']));
    const functionNames = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp', 'log', 'sqrt', 'abs', 'min', 'max', 'pow', 'floor', 'ceil', 'round']);
    const compiled = state.model.equations.map(function (expression) {
      const node = root.math.parse(expression);
      const bad = [];
      node.traverse(function (child) {
        if (child.isSymbolNode && !allowed.has(child.name) && !functionNames.has(child.name)) bad.push(child.name);
      });
      if (bad.length) throw new Error(`Unknown symbol(s) ${Array.from(new Set(bad)).join(', ')} in ${expression}.`);
      return root.math.compile(expression);
    });
    return {
      names,
      parameters,
      residual: function (x) {
        const scope = Object.assign({}, parameters);
        names.forEach(function (name, index) { scope[name] = x[index]; });
        return compiled.map(function (expression) { return Number(expression.evaluate(scope)); });
      },
    };
  }

  function solverOptions() {
    return {
      tolerance: Number($('steadyTol').value),
      maxIterations: Number($('steadyMaxIter').value),
      damping: Number($('steadyDamping').value),
    };
  }

  function currentInterpretation() {
    return $('steadyInterpretation').value === 'dynamic' ? 'dynamic' : 'algebraic';
  }

  function setBusy(busy, message) {
    state.busy = busy;
    ['solveSteady', 'runMultiStart', 'runScan1D', 'runScan2D', 'resetSteady'].forEach(function (id) {
      const node = $(id);
      if (node) node.disabled = busy;
    });
    $('steadyStatus').classList.remove('bad');
    $('steadyStatus').textContent = message || (busy ? 'Computing…' : 'Ready.');
    if (!busy) $('steadyProgress').style.width = '0%';
  }

  function setProgress(fraction, message) {
    $('steadyProgress').style.width = `${Math.max(0, Math.min(1, Number(fraction) || 0)) * 100}%`;
    if (message) $('steadyStatus').textContent = message;
  }

  function setError(error) {
    setBusy(false, `Error: ${error.message || error}`);
    $('steadyStatus').classList.add('bad');
    $('steadyTopStatus').textContent = 'Error';
    $('provenanceStatus').textContent = 'Failed';
    $('provenanceWarning').hidden = false;
    $('provenanceWarning').textContent = error.message || String(error);
  }

  function stabilityFor(solution) {
    if (!solution || !solution.converged) return { status: 'not-computed', label: 'not computed', reason: 'No converged root exists.' };
    if (currentInterpretation() !== 'dynamic') return { status: 'not-applicable', label: 'not applicable', reason: 'The model is declared as algebraic constraints only.' };
    return Core.classifyDynamicStability(solution.jacobian);
  }


  function steadyStatusLabel(status) { return String(status || 'unavailable').replace(/-/g, ' '); }

  function renderSteadyTaxonomy() {
    const summary = $('steadyTaxonomySummary');
    const catalog = $('steadyTaxonomyCatalog');
    if (!summary || !catalog || !TAXONOMY) return;
    const groups = [
      ['Steady-state plots', TAXONOMY.steadyState.plots],
      ['Steady-state problems', TAXONOMY.steadyState.problems],
      ['Steady-state sensitivity methods', TAXONOMY.sensitivity.steadyState.methods],
      ['Steady-state sensitivity plots', TAXONOMY.sensitivity.steadyState.plots],
    ];
    const all = groups.flatMap(function (group) { return group[1]; });
    const active = all.filter(function (entry) { return ['browser-computed', 'derived-browser', 'limited-browser'].includes(entry.status); }).length;
    summary.textContent = `${active} of ${all.length} entries have a browser-computed or explicitly limited route.`;
    catalog.innerHTML = groups.map(function (group) {
      return `<details><summary>${escapeHtml(group[0])} · ${group[1].length}</summary><div class="capability-list">${group[1].map(function (entry) {
        const note = entry.scope || entry.reason || entry.runtime || '';
        return `<article class="capability-row" data-capability-status="${escapeHtml(entry.status)}"><div><b>${escapeHtml(entry.label)}</b><small>${escapeHtml(note)}</small></div><span>${escapeHtml(steadyStatusLabel(entry.status))}</span></article>`;
      }).join('')}</div></details>`;
    }).join('');
  }

  function loadPreset(name, updateUrl) {
    const presetName = PRESETS[name] ? name : CORE_PRESETS[0];
    state.currentName = presetName;
    state.model = clone(PRESETS[presetName]);
    state.model.params = Object.assign({}, state.model.params || {});
    $('steadyInterpretation').value = state.model.interpretation || 'algebraic';
    if (updateUrl) history.replaceState(null, '', `?example=${encodeURIComponent(presetName)}`);
    renderPresetLibrary();
    renderSteadyTaxonomy();
    renderEditor();
    applyPresetScanDefaults();
    clearComputedEvidence('Preset loaded. No result has been computed.');
  }

  function renderPresetLibrary() {
    const names = Object.keys(PRESETS);
    const select = $('steadySelect');
    const currentSelect = select.value;
    select.innerHTML = names.map(function (name) { return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`; }).join('');
    select.value = names.includes(state.currentName) ? state.currentName : currentSelect;

    const familySelect = $('steadyFamilyFilter');
    const families = Array.from(new Set(names.map(function (name) { return PRESETS[name].family || 'Other'; }))).sort();
    const previousFamily = familySelect.value || 'all';
    familySelect.innerHTML = '<option value="all">All families</option>' + families.map(function (family) { return `<option value="${escapeHtml(family)}">${escapeHtml(family)}</option>`; }).join('');
    familySelect.value = families.includes(previousFamily) ? previousFamily : 'all';

    const query = String($('steadyExampleSearch').value || '').trim().toLowerCase();
    const family = familySelect.value;
    const filtered = names.filter(function (name) {
      const preset = PRESETS[name];
      const haystack = [name, preset.family, preset.narrative, preset.provenance].filter(Boolean).join(' ').toLowerCase();
      return (family === 'all' || preset.family === family) && (!query || haystack.includes(query));
    });
    $('steadyExampleCount').textContent = `${filtered.length} of ${names.length} examples`;
    $('steadyDeck').innerHTML = filtered.length ? filtered.map(function (name) {
      const active = name === state.currentName ? ' active' : '';
      return `<button class="secondary${active}" data-steady-preset="${escapeHtml(name)}" type="button"><b>${escapeHtml(name)}</b><small>${escapeHtml(PRESETS[name].family)}</small><span class="preset-action">Load & solve</span></button>`;
    }).join('') : '<p class="field-help">No example matches this filter.</p>';
    document.querySelectorAll('[data-steady-preset]').forEach(function (button) {
      button.addEventListener('click', function () {
        loadPreset(button.dataset.steadyPreset, true);
        root.setTimeout(runSolve, 0);
      });
    });
  }

  function renderEditor() {
    $('steadyTitle').textContent = state.currentName;
    $('steadyFamily').textContent = state.model.family || 'Custom model';
    $('steadyNarrative').textContent = state.model.narrative || '';
    $('steadyEquations').value = state.model.equations.join('\n');
    $('steadyVars').innerHTML = '<div class="table-head"><div>Name</div><div>Initial guess</div><div></div></div>' + state.model.vars.map(function (entry, index) {
      return `<div class="table-row"><input aria-label="Variable ${index + 1} name" data-var-name="${index}" value="${escapeHtml(entry[0])}"/><input aria-label="Initial guess for ${escapeHtml(entry[0])}" data-var-guess="${index}" type="number" step="any" value="${escapeHtml(entry[1])}"/><button class="delete" data-var-delete="${index}" type="button" aria-label="Delete variable">×</button></div>`;
    }).join('');
    const parameterEntries = Object.entries(state.model.params || {});
    $('steadyParams').innerHTML = '<div class="table-head"><div>Name</div><div>Value</div><div></div></div>' + parameterEntries.map(function (entry, index) {
      return `<div class="table-row"><input aria-label="Parameter ${index + 1} name" data-param-name="${escapeHtml(entry[0])}" value="${escapeHtml(entry[0])}"/><input aria-label="Value for ${escapeHtml(entry[0])}" data-param-value="${escapeHtml(entry[0])}" type="number" step="any" value="${escapeHtml(entry[1])}"/><button class="delete" data-param-delete="${escapeHtml(entry[0])}" type="button" aria-label="Delete parameter">×</button></div>`;
    }).join('');
    bindEditorInputs();
    updateParameterOptions();
    renderEquationPreview();
    updateInterpretationHelp();
  }

  function bindEditorInputs() {
    $('steadyEquations').oninput = function () { renderEquationPreview(); clearComputedEvidence('Equations changed. Recompute before interpreting results.'); };
    document.querySelectorAll('[data-var-name]').forEach(function (input) {
      input.onchange = function () {
        const index = Number(input.dataset.varName);
        const name = normaliseSymbol(input.value);
        if (name) state.model.vars[index][0] = name;
        renderEditor();
        clearComputedEvidence('Variable names changed. Recompute before interpreting results.');
      };
    });
    document.querySelectorAll('[data-var-guess]').forEach(function (input) {
      input.oninput = function () { state.model.vars[Number(input.dataset.varGuess)][1] = Number(input.value); clearComputedEvidence('Initial guess changed. Recompute before interpreting results.'); };
    });
    document.querySelectorAll('[data-var-delete]').forEach(function (button) {
      button.onclick = function () {
        if (state.model.vars.length <= 1) return;
        const index = Number(button.dataset.varDelete);
        state.model.vars.splice(index, 1);
        state.model.equations.splice(index, 1);
        renderEditor();
        clearComputedEvidence('Variable deleted. Recompute before interpreting results.');
      };
    });
    document.querySelectorAll('[data-param-name]').forEach(function (input) {
      input.onchange = function () {
        const oldName = input.dataset.paramName;
        const newName = normaliseSymbol(input.value);
        if (newName && oldName !== newName) {
          const value = state.model.params[oldName];
          delete state.model.params[oldName];
          state.model.params[newName] = value;
        }
        renderEditor();
        clearComputedEvidence('Parameter names changed. Recompute before interpreting results.');
      };
    });
    document.querySelectorAll('[data-param-value]').forEach(function (input) {
      input.oninput = function () { state.model.params[input.dataset.paramValue] = Number(input.value); clearComputedEvidence('Parameter value changed. Recompute before interpreting results.'); };
    });
    document.querySelectorAll('[data-param-delete]').forEach(function (button) {
      button.onclick = function () {
        delete state.model.params[button.dataset.paramDelete];
        renderEditor();
        clearComputedEvidence('Parameter deleted. Recompute before interpreting results.');
      };
    });
  }

  function readEditorIntoModel() {
    state.model.equations = parseEquations($('steadyEquations').value);
    state.model.interpretation = currentInterpretation();
  }

  function renderEquationPreview() {
    const equations = parseEquations($('steadyEquations').value);
    const variableNames = state.model.vars.map(function (entry) { return entry[0]; });
    const latexRows = equations.map(function (expression, index) {
      let latex = expression;
      try { latex = root.math.parse(expression).toTex({ parenthesis: 'keep' }); } catch (_) { /* raw fallback */ }
      const label = (variableNames[index] || `f_${index + 1}`).replace(/_/g, '\\_');
      return `${label}:\;&${latex}=0`;
    }).join('\\\\[4pt]');
    const source = latexRows ? `\\begin{aligned}${latexRows}\\end{aligned}` : '\\text{No equations}';
    root.FokoMathRender.render($('steadyPreview'), source, { displayMode: true });
  }

  function updateParameterOptions() {
    const names = Object.keys(state.model.params || {});
    const options = names.length ? names.map(function (name) { return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`; }).join('') : '<option value="">No parameter</option>';
    const current1 = $('steadyScanParam').value;
    const current2 = $('steadyScanParam2').value;
    $('steadyScanParam').innerHTML = options;
    $('steadyScanParam2').innerHTML = options;
    if (names.includes(current1)) $('steadyScanParam').value = current1;
    if (names.includes(current2)) $('steadyScanParam2').value = current2;
    if (names.length > 1 && $('steadyScanParam2').value === $('steadyScanParam').value) $('steadyScanParam2').value = names[1];
  }

  function applyPresetScanDefaults() {
    const defaults = state.model.scan || {};
    updateParameterOptions();
    if (defaults.parameter && Object.prototype.hasOwnProperty.call(state.model.params, defaults.parameter)) $('steadyScanParam').value = defaults.parameter;
    $('steadyScanMin').value = defaults.min == null ? 0 : defaults.min;
    $('steadyScanMax').value = defaults.max == null ? 4 : defaults.max;
    $('steadyScanN').value = defaults.points == null ? 30 : defaults.points;
    const names = Object.keys(state.model.params || {});
    if (names.length > 1) $('steadyScanParam2').value = names.find(function (name) { return name !== $('steadyScanParam').value; }) || names[0];
    if (names.length) {
      const secondValue = Number(state.model.params[$('steadyScanParam2').value]);
      $('steadyScan2Min').value = Number.isFinite(secondValue) ? secondValue * 0.5 : 0;
      $('steadyScan2Max').value = Number.isFinite(secondValue) ? secondValue * 1.5 : 4;
    }
  }

  function updateInterpretationHelp() {
    const dynamic = currentInterpretation() === 'dynamic';
    $('interpretationHelp').textContent = dynamic
      ? 'Local stability is a property of the declared system dx/dt=f(x,p). The browser reports it only for converged 1×1 or 2×2 systems.'
      : 'This model is treated as algebraic constraints. Residual convergence may be reported, but dynamical stability is not applicable.';
  }

  function clearPlot(id, message) {
    const node = $(id);
    if (!node) return;
    root.FokoPlotLifecycle.clear(node, message);
  }

  function clearComputedEvidence(message) {
    state.solution = null;
    state.multiStart = null;
    state.scan1D = [];
    state.scan2D = null;
    state.resultKind = 'none';
    $('resultKind').textContent = 'No computed result';
    ['left', 'right'].forEach(function (side) { clearPlot(`${side}Plot`, 'Run a solve or parameter scan to create this view.'); });
    $('steadyTopStatus').textContent = 'Ready';
    ['steadyRuntime', 'steadyIterations', 'steadyResidual', 'steadyTermination', 'steadyMetricConverged', 'steadyMetricStability', 'steadyMetricAlt'].forEach(function (id) { $(id).textContent = '—'; });
    $('steadyMetricVars').textContent = state.model ? state.model.vars.length : '—';
    $('steadyDiagnostics').classList.add('empty');
    $('steadyDiagnostics').textContent = message || 'No numerical result exists.';
    $('provenanceStatus').textContent = 'Not computed';
    $('provenanceMethod').textContent = 'Damped Newton';
    $('provenanceScope').textContent = 'Browser-computed root finding';
    $('provenanceInterpretation').textContent = currentInterpretation() === 'dynamic' ? 'Declared equilibrium of dx/dt=f' : 'Algebraic constraints only';
    $('provenanceWarning').hidden = false;
    $('provenanceWarning').textContent = 'Configuration changes invalidate previously computed evidence.';
    updateAvailablePlots();
  }

  function physicalAdmissibility(values) {
    const constraints = state.model && state.model.physicalConstraints;
    if (!constraints || !Array.isArray(values)) return { status: 'not-declared', admissible: true, violations: [] };
    const names = state.model.vars.map(function (entry) { return entry[0]; });
    const violations = [];
    const tolerance = Math.max(1e-9, Number($('steadyTol').value || 1e-9) * 100);
    (constraints.nonnegative || []).forEach(function (name) {
      const index = names.indexOf(name);
      if (index >= 0 && Number(values[index]) < -tolerance) violations.push(`${name}=${Number(values[index]).toPrecision(5)} is negative`);
    });
    if (constraints.bounds && typeof constraints.bounds === 'object') {
      Object.entries(constraints.bounds).forEach(function (entry) {
        const index = names.indexOf(entry[0]);
        const limits = entry[1] || [];
        if (index < 0) return;
        if (Number.isFinite(Number(limits[0])) && Number(values[index]) < Number(limits[0]) - tolerance) violations.push(`${entry[0]} is below ${limits[0]}`);
        if (Number.isFinite(Number(limits[1])) && Number(values[index]) > Number(limits[1]) + tolerance) violations.push(`${entry[0]} is above ${limits[1]}`);
      });
    }
    if (constraints.conservedTotal) {
      const totalName = String(constraints.conservedTotal);
      const expected = Number(state.model.params && state.model.params[totalName]);
      const actual = values.reduce(function (sum, value) { return sum + Number(value); }, 0);
      if (Number.isFinite(expected) && Math.abs(actual - expected) > Math.max(tolerance, tolerance * Math.abs(expected))) {
        violations.push(`sum=${actual.toPrecision(6)} does not match ${totalName}=${expected}`);
      }
    }
    return { status: violations.length ? 'rejected' : 'admissible', admissible: violations.length === 0, violations };
  }

  function annotateMultiStart(multiStart) {
    if (!multiStart) return null;
    multiStart.uniqueSolutions.forEach(function (result) { result.admissibility = physicalAdmissibility(result.x); });
    multiStart.admissibleSolutions = multiStart.uniqueSolutions.filter(function (result) { return result.admissibility.admissible; });
    multiStart.rejectedSolutions = multiStart.uniqueSolutions.filter(function (result) { return !result.admissibility.admissible; });
    return multiStart;
  }

  function applySolution(solution, multiStart, runtimeOverride) {
    solution.admissibility = physicalAdmissibility(solution.x);
    multiStart = annotateMultiStart(multiStart);
    state.solution = solution;
    state.multiStart = multiStart || null;
    state.scan1D = [];
    state.scan2D = null;
    state.resultKind = multiStart ? 'multi-start' : 'root';
    solution.stability = stabilityFor(solution);
    const distinctRoots = multiStart ? (multiStart.admissibleSolutions || multiStart.uniqueSolutions).length : (solution.converged && solution.admissibility.admissible ? 1 : 0);
    $('resultKind').textContent = multiStart ? 'Deterministic multi-start result' : 'Single-root solve';
    $('steadyTopStatus').textContent = solution.converged ? (solution.admissibility.admissible ? 'Converged' : 'Converged · inadmissible') : 'Not converged';
    $('steadyRuntime').textContent = `${Number(runtimeOverride == null ? solution.runtimeMs : runtimeOverride).toFixed(1)} ms`;
    $('steadyIterations').textContent = String(solution.iterations);
    $('steadyResidual').textContent = Number.isFinite(solution.residualNorm) ? solution.residualNorm.toExponential(3) : 'non-finite';
    $('steadyTermination').textContent = solution.terminationReason.replace(/_/g, ' ');
    $('steadyMetricConverged').textContent = solution.converged ? 'yes' : 'no';
    $('steadyMetricStability').textContent = solution.stability.label;
    $('steadyMetricVars').textContent = String(state.model.vars.length);
    $('steadyMetricAlt').textContent = String(distinctRoots);
    $('provenanceStatus').textContent = solution.converged ? 'Computed: tolerance met' : 'Computed: tolerance not met';
    $('provenanceMethod').textContent = 'Damped Newton + finite-difference Jacobian';
    $('provenanceScope').textContent = multiStart ? 'Finite deterministic start set; not exhaustive' : 'One initial guess';
    $('provenanceInterpretation').textContent = currentInterpretation() === 'dynamic' ? 'Declared equilibrium of dx/dt=f' : 'Algebraic constraints only';
    const warningText = provenanceWarning(solution, multiStart);
    $('provenanceWarning').hidden = warningText.startsWith('No browser-side warning');
    $('provenanceWarning').textContent = warningText;
    renderSolutionDiagnostics(solution, multiStart);
    updateAvailablePlots();
    renderAllPlots();
  }

  function provenanceWarning(solution, multiStart) {
    const warnings = [];
    if (!solution.converged) warnings.push('The final residual did not meet tolerance; the displayed iterate is approximate.');
    if (currentInterpretation() === 'algebraic') warnings.push('Dynamical stability is not applicable to the declared algebraic interpretation.');
    else if (solution.stability.status !== 'computed') warnings.push(solution.stability.reason);
    if (solution.admissibility && !solution.admissibility.admissible) warnings.push(`The converged root violates declared physical constraints: ${solution.admissibility.violations.join('; ')}.`);
    if (multiStart) {
      warnings.push('Multi-start uses a finite deterministic set and cannot certify that all roots were found.');
      if (multiStart.rejectedSolutions && multiStart.rejectedSolutions.length) warnings.push(`${multiStart.rejectedSolutions.length} converged mathematical root(s) were excluded from physical interpretation by declared constraints.`);
    }
    if (Number.isFinite(solution.pivotRatio) && solution.pivotRatio > 1e10) warnings.push('The elimination pivot ratio is large, indicating possible local ill-conditioning.');
    return warnings.join(' ') || 'No browser-side warning was triggered. Independent validation may still be required.';
  }

  function renderSolutionDiagnostics(solution, multiStart) {
    const stability = solution.stability;
    const rows = [
      ['Root status', solution.converged ? 'Converged' : 'Not converged'],
      ['Termination', solution.terminationReason.replace(/_/g, ' ')],
      ['Final residual norm', Number.isFinite(solution.residualNorm) ? solution.residualNorm.toExponential(6) : 'non-finite'],
      ['Requested tolerance', solution.settings.tolerance.toExponential(3)],
      ['Iterations recorded', String(solution.history.length)],
      ['Jacobian', solution.jacobian.length ? `${solution.jacobian.length}×${solution.jacobian.length} finite difference` : 'not available'],
      ['Stability claim', stability.label],
      ['Stability basis', stability.reason],
      ['Pivot ratio', Number.isFinite(solution.pivotRatio) ? solution.pivotRatio.toExponential(3) : 'not available'],
      ['Physical admissibility', solution.admissibility ? solution.admissibility.status : 'not declared'],
    ];
    if (solution.admissibility && solution.admissibility.violations.length) rows.push(['Constraint violations', solution.admissibility.violations.join('; ')]);
    if (multiStart) {
      rows.push(['Mathematical roots in finite start set', String(multiStart.uniqueSolutions.length)]);
      rows.push(['Physically admissible roots', String((multiStart.admissibleSolutions || []).length)]);
      rows.push(['Rejected by declared constraints', String((multiStart.rejectedSolutions || []).length)]);
    }
    const values = state.model.vars.map(function (entry, index) {
      return `<tr><th>${escapeHtml(entry[0])}</th><td>${Number(solution.x[index]).toPrecision(9)}</td></tr>`;
    }).join('');
    $('steadyDiagnostics').classList.remove('empty');
    $('steadyDiagnostics').innerHTML = `<table><tbody>${rows.map(function (row) { return `<tr><th>${escapeHtml(row[0])}</th><td>${escapeHtml(row[1])}</td></tr>`; }).join('')}<tr><th colspan="2">Reported state</th></tr>${values}</tbody></table>`;
  }

  function runSolve() {
    if (state.busy) return;
    try {
      setBusy(true, 'Solving root…');
      const compiled = compileModel();
      const x0 = state.model.vars.map(function (entry) { return Number(entry[1]); });
      const solution = Core.solveNewton(Object.assign({ residual: compiled.residual, x0 }, solverOptions()));
      applySolution(solution, null);
      setBusy(false, solution.converged ? 'Root solve complete. Residual tolerance met.' : 'Root solve complete. Residual tolerance was not met.');
    } catch (error) { setError(error); }
  }

  function runMultiStart() {
    if (state.busy) return;
    try {
      setBusy(true, 'Running deterministic multi-start…');
      const compiled = compileModel();
      const x0 = state.model.vars.map(function (entry) { return Number(entry[1]); });
      const start = performance.now();
      const multi = Core.solveMultiStart(Object.assign({
        residual: compiled.residual,
        x0,
        startScale: Number($('steadyStartScale').value),
        rootTolerance: Math.max(1e-7, Number($('steadyTol').value) * 100),
      }, solverOptions()));
      annotateMultiStart(multi);
      const primary = multi.admissibleSolutions[0] || multi.uniqueSolutions[0] || multi.results[0];
      applySolution(primary, multi, performance.now() - start);
      setBusy(false, `Multi-start complete: ${multi.uniqueSolutions.length} mathematical root(s), ${multi.admissibleSolutions.length} physically admissible in the finite start set.`);
    } catch (error) { setError(error); }
  }

  function scanValues(prefix) {
    const minimum = Number($(prefix === 'primary' ? 'steadyScanMin' : 'steadyScan2Min').value);
    const maximum = Number($(prefix === 'primary' ? 'steadyScanMax' : 'steadyScan2Max').value);
    const count = Number($(prefix === 'primary' ? 'steadyScanN' : 'steadyScan2N').value);
    return Core.linspace(minimum, maximum, count);
  }

  function runScan1D() {
    if (state.busy) return;
    try {
      const parameter = $('steadyScanParam').value;
      if (!parameter) throw new Error('A scan parameter is required.');
      setBusy(true, `Scanning ${parameter}…`);
      const values = scanValues('primary');
      const x0 = state.solution && state.solution.converged ? state.solution.x.slice() : state.model.vars.map(function (entry) { return Number(entry[1]); });
      readEditorIntoModel();
      validateModel(state.model);
      const rows = Core.scanParameter(Object.assign({
        values,
        x0,
        variableNames: state.model.vars.map(function (entry) { return entry[0]; }),
        dynamicInterpretation: currentInterpretation() === 'dynamic',
        residualForParameter: function (value) { return compileModel({ [parameter]: value }).residual; },
        onProgress: function (fraction) { setProgress(fraction, `Scanning ${parameter}: ${Math.round(fraction * 100)}%`); },
      }, solverOptions()));
      rows.forEach(function (row) { row.admissibility = physicalAdmissibility(row.solution.x); });
      state.scan1D = rows;
      state.scan2D = null;
      state.resultKind = 'scan1d';
      const converged = rows.filter(function (row) { return row.converged && (!row.admissibility || row.admissibility.admissible); });
      if (converged.length) {
        state.solution = converged[converged.length - 1].solution;
        state.solution.stability = stabilityFor(state.solution);
      }
      applyScanDiagnostics(parameter, rows);
      updateAvailablePlots();
      renderAllPlots();
      setBusy(false, `1D parameter scan complete: ${converged.length}/${rows.length} sampled points converged.`);
    } catch (error) { setError(error); }
  }

  function applyScanDiagnostics(parameter, rows) {
    const mathematical = rows.filter(function (row) { return row.converged; });
    const converged = rows.filter(function (row) { return row.converged && (!row.admissibility || row.admissibility.admissible); });
    const rejected = mathematical.filter(function (row) { return row.admissibility && !row.admissibility.admissible; });
    const candidates = rows.flatMap(function (row) { return row.candidates || []; });
    const worstResidual = converged.length ? Math.max.apply(Math, converged.map(function (row) { return row.residualNorm; })) : Infinity;
    $('resultKind').textContent = `Sequential scan of ${parameter}`;
    $('steadyTopStatus').textContent = converged.length === rows.length ? 'Scan complete' : 'Scan incomplete';
    $('steadyRuntime').textContent = 'browser synchronous';
    $('steadyIterations').textContent = String(rows.reduce(function (sum, row) { return sum + row.iterations; }, 0));
    $('steadyResidual').textContent = Number.isFinite(worstResidual) ? worstResidual.toExponential(3) : 'no converged point';
    $('steadyTermination').textContent = `${converged.length}/${rows.length} converged`;
    $('steadyMetricConverged').textContent = `${converged.length}/${rows.length}`;
    const computedStability = rows.filter(function (row) { return row.stability && row.stability.status === 'computed'; });
    $('steadyMetricStability').textContent = computedStability.length ? 'sampled' : 'not applicable';
    $('steadyMetricVars').textContent = String(state.model.vars.length);
    $('steadyMetricAlt').textContent = '—';
    $('provenanceStatus').textContent = 'Computed parameter grid';
    $('provenanceMethod').textContent = 'Sequential damped Newton scan';
    $('provenanceScope').textContent = 'Sampled branch; not pseudo-arclength continuation';
    $('provenanceInterpretation').textContent = currentInterpretation() === 'dynamic' ? 'Sampled equilibria of dx/dt=f' : 'Sampled algebraic roots';
    $('provenanceWarning').hidden = false;
    $('provenanceWarning').textContent = 'Candidate crossings and turning points are grid-dependent heuristics. Failed or physically inadmissible sampled points must not be interpolated as verified roots.';
    $('steadyDiagnostics').classList.remove('empty');
    $('steadyDiagnostics').innerHTML = `<table><tbody>
      <tr><th>Parameter</th><td>${escapeHtml(parameter)}</td></tr>
      <tr><th>Sampled points</th><td>${rows.length}</td></tr>
      <tr><th>Physically admissible converged points</th><td>${converged.length}</td></tr>
      <tr><th>Rejected converged points</th><td>${rejected.length}</td></tr>
      <tr><th>Unconfirmed candidates</th><td>${candidates.length}</td></tr>
      <tr><th>Method boundary</th><td>Sequential parameter stepping; no pseudo-arclength correction.</td></tr>
      <tr><th>Interpretation</th><td>${currentInterpretation() === 'dynamic' ? 'Dynamical equilibrium where supported' : 'Algebraic roots only'}</td></tr>
    </tbody></table>`;
  }

  function nextFrame() {
    return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); });
  }

  async function runScan2D() {
    if (state.busy) return;
    try {
      const parameter1 = $('steadyScanParam').value;
      const parameter2 = $('steadyScanParam2').value;
      if (!parameter1 || !parameter2) throw new Error('Two scan parameters are required.');
      if (parameter1 === parameter2) throw new Error('Choose two different scan parameters.');
      setBusy(true, `Scanning ${parameter1} × ${parameter2}…`);
      readEditorIntoModel();
      validateModel(state.model);
      const values1 = scanValues('primary');
      const values2 = scanValues('secondary');
      const variableNames = state.model.vars.map(function (entry) { return entry[0]; });
      const baseGuess = state.solution && state.solution.converged ? state.solution.x.slice() : state.model.vars.map(function (entry) { return Number(entry[1]); });
      const rows = [];
      const start = performance.now();
      for (let j = 0; j < values2.length; j += 1) {
        let guess = baseGuess.slice();
        const cells = [];
        for (let i = 0; i < values1.length; i += 1) {
          const compiled = compileModel({ [parameter1]: values1[i], [parameter2]: values2[j] });
          const solution = Core.solveNewton(Object.assign({ residual: compiled.residual, x0: guess }, solverOptions()));
          if (solution.converged) guess = solution.x.slice();
          const stability = currentInterpretation() === 'dynamic' && solution.converged
            ? Core.classifyDynamicStability(solution.jacobian)
            : { status: 'not-applicable', label: 'not applicable' };
          const values = {};
          variableNames.forEach(function (name, index) { values[name] = solution.x[index]; });
          const admissibility = physicalAdmissibility(solution.x);
          cells.push({ parameter1: values1[i], parameter2: values2[j], solution, converged: solution.converged, admissibility, residualNorm: solution.residualNorm, stability, values });
        }
        rows.push(cells);
        setProgress((j + 1) / values2.length, `2D scan row ${j + 1}/${values2.length}`);
        await nextFrame();
      }
      state.scan2D = { parameter1, parameter2, values1, values2, variableNames, rows, runtimeMs: performance.now() - start };
      state.scan1D = [];
      state.resultKind = 'scan2d';
      applyScan2DDiagnostics();
      updateAvailablePlots();
      renderAllPlots();
      const cells = rows.flat();
      const convergedCount = cells.filter(function (cell) { return cell.converged && (!cell.admissibility || cell.admissibility.admissible); }).length;
      const rejectedCount = cells.filter(function (cell) { return cell.converged && cell.admissibility && !cell.admissibility.admissible; }).length;
      setBusy(false, `2D parameter scan complete: ${convergedCount}/${cells.length} physically admissible grid cells; ${rejectedCount} converged cells rejected by physical constraints.`);
    } catch (error) { setError(error); }
  }

  function applyScan2DDiagnostics() {
    const scan = state.scan2D;
    const cells = scan.rows.flat();
    const mathematical = cells.filter(function (cell) { return cell.converged; });
    const converged = cells.filter(function (cell) { return cell.converged && (!cell.admissibility || cell.admissibility.admissible); });
    const rejected = mathematical.filter(function (cell) { return cell.admissibility && !cell.admissibility.admissible; });
    $('resultKind').textContent = `2D scan: ${scan.parameter1} × ${scan.parameter2}`;
    $('steadyTopStatus').textContent = converged.length === cells.length ? 'Grid complete' : 'Grid incomplete';
    $('steadyRuntime').textContent = `${scan.runtimeMs.toFixed(1)} ms`;
    $('steadyIterations').textContent = String(cells.reduce(function (sum, cell) { return sum + cell.solution.iterations; }, 0));
    $('steadyResidual').textContent = converged.length ? Math.max.apply(Math, converged.map(function (cell) { return cell.residualNorm; })).toExponential(3) : 'no converged cell';
    $('steadyTermination').textContent = `${converged.length}/${cells.length} converged`;
    $('steadyMetricConverged').textContent = `${converged.length}/${cells.length}`;
    $('steadyMetricStability').textContent = cells.some(function (cell) { return cell.stability.status === 'computed'; }) ? 'sampled' : 'not applicable';
    $('steadyMetricVars').textContent = String(state.model.vars.length);
    $('steadyMetricAlt').textContent = '—';
    $('provenanceStatus').textContent = 'Computed 2D parameter grid';
    $('provenanceMethod').textContent = 'Independent row-wise sequential Newton scans';
    $('provenanceScope').textContent = 'Grid exploration; not 2-parameter continuation';
    $('provenanceInterpretation').textContent = currentInterpretation() === 'dynamic' ? 'Sampled equilibria of dx/dt=f' : 'Sampled algebraic roots';
    $('provenanceWarning').hidden = false;
    $('provenanceWarning').textContent = 'A 2D grid is not a continuation surface. Non-converged and physically inadmissible cells remain unsupported and must not be interpreted through visual interpolation.';
    $('steadyDiagnostics').classList.remove('empty');
    $('steadyDiagnostics').innerHTML = `<table><tbody>
      <tr><th>Parameters</th><td>${escapeHtml(scan.parameter1)} × ${escapeHtml(scan.parameter2)}</td></tr>
      <tr><th>Grid</th><td>${scan.values1.length} × ${scan.values2.length} = ${cells.length} cells</td></tr>
      <tr><th>Physically admissible cells</th><td>${converged.length}</td></tr>
      <tr><th>Rejected converged cells</th><td>${rejected.length}</td></tr>
      <tr><th>Method boundary</th><td>Grid of local Newton solves; not 2-parameter pseudo-arclength continuation.</td></tr>
    </tbody></table>`;
  }

  function availablePlotTypes() {
    if (state.resultKind === 'scan2d' && state.scan2D) {
      const types = ['map-convergence', 'map-residual', 'map-variable'];
      if (state.scan2D.rows.flat().some(function (cell) { return cell.stability.status === 'computed'; })) types.push('map-stability');
      return types;
    }
    if (state.resultKind === 'scan1d' && state.scan1D.length) {
      const types = ['branch', 'scan-residual'];
      const converged = state.scan1D.filter(function (row) { return row.converged; });
      if (state.scan1D.some(function (row) { return row.stability.status === 'computed'; })) types.push('stability-margin');
      if (converged.length >= 3) types.push('implicit-sensitivity');
      if (state.scan1D.some(function (row) { return row.candidates && row.candidates.length; })) types.push('candidates');
      return types;
    }
    if (state.solution) {
      const types = ['equilibrium', 'residual', 'jacobian', 'jacobian-sign'];
      if (state.model.vars.length === 2) types.push('residual-surface', 'nullclines');
      if (state.solution.stability && state.solution.stability.status === 'computed') types.push('eigenvalues', 'stiffness-indicator');
      if (state.multiStart && state.multiStart.uniqueSolutions.length > 1) types.push('roots');
      return types;
    }
    return [];
  }

  function chooseDefaultPlots(types) {
    const defaults = state.resultKind === 'scan2d'
      ? ['map-convergence', 'map-residual', types.includes('map-stability') ? 'map-stability' : 'map-variable']
      : state.resultKind === 'scan1d'
        ? ['branch', 'scan-residual', types.includes('stability-margin') ? 'stability-margin' : (types[2] || 'none')]
        : ['equilibrium', 'residual', 'jacobian'];
    ['left', 'right'].forEach(function (side, index) {
      if (!types.includes(state.plotType[side])) state.plotType[side] = defaults[index] && types.includes(defaults[index]) ? defaults[index] : (types[index] || 'none');
    });
  }

  function updateAvailablePlots() {
    const types = availablePlotTypes();
    chooseDefaultPlots(types);
    ['left', 'right'].forEach(function (side) {
      const select = $(`${side}PlotType`);
      select.innerHTML = types.length
        ? types.map(function (type) { return `<option value="${type}">${escapeHtml(PLOT_META[type].title)}</option>`; }).join('')
        : '<option value="none">No computed view</option>';
      select.value = types.includes(state.plotType[side]) ? state.plotType[side] : (types[0] || 'none');
      state.plotType[side] = select.value;
    });
    renderLayout();
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('steady');
}

  function plotLayout(title, xTitle, yTitle) {
    return {
      title: { text: title, font: { size: 15 } },
      xaxis: { title: xTitle, zeroline: false, automargin: true },
      yaxis: { title: yTitle, zeroline: false, automargin: true },
      margin: { l: 62, r: 24, t: 56, b: 58 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: '#ffffff',
      font: { family: 'Inter, system-ui, sans-serif', color: '#11253a', size: 12 },
      legend: { orientation: 'h', y: -0.22 },
    };
  }

  function plotConfig() {
    return { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] };
  }

  function safePlot(side, traces, layout) {
    const node = $(`${side}Plot`);
    if (!node) return Promise.resolve({ skipped: true });
    if (!traces || !traces.length) return root.FokoPlotLifecycle.clear(node, 'No compatible computed data exist for this view.');
    return root.FokoPlotLifecycle.render(node, traces, layout, plotConfig());
  }

  function renderPlot(side) {
    const type = state.plotType[side];
    const meta = PLOT_META[type];
    $(`${side}PlotTitle`).textContent = meta ? meta.title : 'Unavailable view';
    $(`${side}PlotEvidence`).textContent = meta ? meta.evidence : 'No computed view exists.';
    if (!meta) return clearPlot(`${side}Plot`, 'No computed view exists.');

    if (type === 'equilibrium') {
      return safePlot(side, [{ x: state.model.vars.map(function (entry) { return entry[0]; }), y: state.solution.x, type: 'bar', name: state.solution.converged ? 'converged root' : 'final iterate' }], plotLayout(meta.title, 'variable', 'value'));
    }
    if (type === 'residual') {
      const history = state.solution.history;
      const x = history.map(function (entry) { return entry.iteration; });
      const y = history.map(function (entry) { return Math.max(entry.residualNorm, Number.MIN_VALUE); });
      const layout = plotLayout(meta.title, 'iteration', '||f(x)||₂');
      layout.yaxis.type = 'log';
      return safePlot(side, [{ x, y, type: 'scatter', mode: 'lines+markers', name: 'residual norm' }], layout);
    }
    if (type === 'jacobian') {
      const names = state.model.vars.map(function (entry) { return entry[0]; });
      return safePlot(side, [{ x: names, y: names.map(function (_, index) { return `f${index + 1}`; }), z: state.solution.jacobian, type: 'heatmap', colorscale: 'RdBu', zmid: 0, colorbar: { title: '∂f/∂x' } }], plotLayout(meta.title, 'variable', 'equation'));
    }
    if (type === 'jacobian-sign') {
      const names = state.model.vars.map(function (entry) { return entry[0]; });
      const z = state.solution.jacobian.map(function (row) { return row.map(function (value) { return Math.abs(Number(value)) < 1e-10 ? 0 : (value > 0 ? 1 : -1); }); });
      return safePlot(side, [{ x: names, y: names.map(function (_, index) { return `f${index + 1}`; }), z: z, type: 'heatmap', zmin: -1, zmax: 1, colorscale: [[0, '#ef4444'], [.5, '#f8fafc'], [1, '#14b8a6']], colorbar: { title: 'sign', tickvals: [-1, 0, 1], ticktext: ['−', '0', '+'] }, text: z.map(function (row) { return row.map(function (value) { return value > 0 ? '+' : (value < 0 ? '−' : '0'); }); }), texttemplate: '%{text}' }], plotLayout(meta.title, 'variable', 'equation'));
    }
    if (type === 'eigenvalues') {
      const eigenvalues = state.solution.stability.eigenvalues;
      const layout = plotLayout(meta.title, 'real part', 'imaginary part');
      layout.shapes = [{ type: 'line', x0: 0, x1: 0, y0: -1, y1: 1, yref: 'paper', line: { dash: 'dash', width: 1 } }];
      return safePlot(side, [{ x: eigenvalues.map(function (entry) { return entry.real; }), y: eigenvalues.map(function (entry) { return entry.imag; }), type: 'scatter', mode: 'markers+text', text: eigenvalues.map(function (_, index) { return `λ${index + 1}`; }), textposition: 'top center', marker: { size: 11 }, name: 'Jacobian eigenvalues' }], layout);
    }
    if (type === 'stiffness-indicator') {
      const eigenvalues = state.solution.stability.eigenvalues || [];
      const allMagnitudes = eigenvalues.map(function (entry) { const value = Math.hypot(Number(entry.real), Number(entry.imag)); return Number.isFinite(value) && value > 1e-14 ? value : null; });
      const nonzero = allMagnitudes.filter(Number.isFinite);
      const ratio = nonzero.length > 1 ? Math.max.apply(null, nonzero) / Math.min.apply(null, nonzero) : 1;
      const layout = plotLayout(meta.title, 'eigenvalue', '|λ|');
      layout.yaxis.type = 'log';
      layout.annotations = [{ xref: 'paper', yref: 'paper', x: 1, y: 1.08, showarrow: false, text: `local ratio = ${ratio.toPrecision(4)}` }];
      return safePlot(side, [{ x: eigenvalues.map(function (_, index) { return `λ${index + 1}`; }), y: allMagnitudes, type: 'bar', name: 'eigenvalue magnitude' }], layout);
    }
    if (type === 'roots') {
      const roots = (state.multiStart.admissibleSolutions && state.multiStart.admissibleSolutions.length) ? state.multiStart.admissibleSolutions : state.multiStart.uniqueSolutions;
      const traces = state.model.vars.map(function (entry, variableIndex) {
        return { x: roots.map(function (_, index) { return `root ${index + 1}`; }), y: roots.map(function (result) { return result.x[variableIndex]; }), type: 'bar', name: entry[0] };
      });
      const layout = plotLayout(meta.title, 'root in finite start set', 'state value');
      layout.barmode = 'group';
      return safePlot(side, traces, layout);
    }
    if (type === 'residual-surface' || type === 'nullclines') {
      if (state.model.vars.length !== 2 || !state.solution) return clearPlot(`${side}Plot`, 'This view requires a two-variable solved model.');
      const compiled = compileModel();
      const center = state.solution.x;
      const scale = state.model.vars.map(function (entry, index) { return Math.max(1, Math.abs(center[index]), Math.abs(Number(entry[1]) || 0)); });
      const count = 55;
      const xs = Array.from({ length: count }, function (_, index) { return center[0] - 2.5 * scale[0] + 5 * scale[0] * index / (count - 1); });
      const ys = Array.from({ length: count }, function (_, index) { return center[1] - 2.5 * scale[1] + 5 * scale[1] * index / (count - 1); });
      const values = ys.map(function (y) { return xs.map(function (x) { try { return compiled.residual([x, y]); } catch (_) { return [NaN, NaN]; } }); });
      if (type === 'residual-surface') {
        const z = values.map(function (row) { return row.map(function (r) { const norm = Math.hypot(Number(r[0]), Number(r[1])); return Number.isFinite(norm) ? Math.log10(Math.max(norm, 1e-16)) : null; }); });
        return safePlot(side, [{ x: xs, y: ys, z: z, type: 'heatmap', colorscale: 'Viridis', colorbar: { title: 'log10 ||f||₂' }, hoverongaps: false }, { x: [center[0]], y: [center[1]], type: 'scatter', mode: 'markers', marker: { size: 11, symbol: 'x' }, name: 'reported root' }], plotLayout(meta.title, state.model.vars[0][0], state.model.vars[1][0]));
      }
      const z1 = values.map(function (row) { return row.map(function (r) { return Number.isFinite(Number(r[0])) ? Number(r[0]) : null; }); });
      const z2 = values.map(function (row) { return row.map(function (r) { return Number.isFinite(Number(r[1])) ? Number(r[1]) : null; }); });
      const contour = { start: 0, end: 0, size: 1, coloring: 'lines', showlabels: true };
      return safePlot(side, [
        { x: xs, y: ys, z: z1, type: 'contour', contours: contour, line: { width: 3 }, showscale: false, name: 'f1 = 0' },
        { x: xs, y: ys, z: z2, type: 'contour', contours: contour, line: { width: 3, dash: 'dash' }, showscale: false, name: 'f2 = 0' },
        { x: [center[0]], y: [center[1]], type: 'scatter', mode: 'markers', marker: { size: 11, symbol: 'x' }, name: 'reported root' }
      ], plotLayout(meta.title, state.model.vars[0][0], state.model.vars[1][0]));
    }
    if (type === 'branch') {
      const traces = state.model.vars.map(function (entry) {
        return {
          x: state.scan1D.map(function (row) { return row.parameter; }),
          y: state.scan1D.map(function (row) { return row.converged && (!row.admissibility || row.admissibility.admissible) ? row.values[entry[0]] : null; }),
          customdata: state.scan1D.map(function (row) { return [row.residualNorm, row.terminationReason]; }),
          hovertemplate: `${entry[0]}=%{y}<br>parameter=%{x}<br>residual=%{customdata[0]:.3e}<br>%{customdata[1]}<extra></extra>`,
          type: 'scatter', mode: 'lines+markers', name: entry[0], connectgaps: false,
        };
      });
      return safePlot(side, traces, plotLayout(meta.title, $('steadyScanParam').value, 'equilibrium value'));
    }
    if (type === 'scan-residual') {
      const layout = plotLayout(meta.title, $('steadyScanParam').value, 'final residual norm');
      layout.yaxis.type = 'log';
      return safePlot(side, [{ x: state.scan1D.map(function (row) { return row.parameter; }), y: state.scan1D.map(function (row) { return Number.isFinite(row.residualNorm) ? Math.max(row.residualNorm, Number.MIN_VALUE) : null; }), type: 'scatter', mode: 'lines+markers', name: 'residual' }], layout);
    }
    if (type === 'stability-margin') {
      return safePlot(side, [{ x: state.scan1D.map(function (row) { return row.parameter; }), y: state.scan1D.map(function (row) { return row.stability.status === 'computed' ? row.stability.maxRealPart : null; }), type: 'scatter', mode: 'lines+markers', name: 'max Re(λ)', connectgaps: false }], plotLayout(meta.title, $('steadyScanParam').value, 'max Re(λ)'));
    }
    if (type === 'implicit-sensitivity') {
      const parameterName = $('steadyScanParam').value;
      const rows = state.scan1D;
      const traces = state.model.vars.map(function (entry) {
        const x = [], y = [];
        for (let index = 1; index < rows.length - 1; index += 1) {
          const prev = rows[index - 1], current = rows[index], next = rows[index + 1];
          if (!(prev.converged && current.converged && next.converged)) continue;
          const denominator = next.parameter - prev.parameter;
          if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-15) continue;
          x.push(current.parameter);
          y.push((next.values[entry[0]] - prev.values[entry[0]]) / denominator);
        }
        return { x: x, y: y, type: 'scatter', mode: 'lines+markers', name: `d${entry[0]}/d${parameterName}` };
      }).filter(function (trace) { return trace.x.length; });
      return safePlot(side, traces, plotLayout(meta.title, parameterName, 'finite-difference branch slope'));
    }
    if (type === 'candidates') {
      const candidateRows = state.scan1D.filter(function (row) { return row.candidates && row.candidates.length; });
      return safePlot(side, [{ x: candidateRows.map(function (row) { return row.parameter; }), y: candidateRows.map(function (row) { return row.stability && Number.isFinite(row.stability.maxRealPart) ? row.stability.maxRealPart : 0; }), text: candidateRows.map(function (row) { return row.candidates.map(function (entry) { return `${entry.type}: ${entry.note}`; }).join('<br>'); }), type: 'scatter', mode: 'markers', marker: { size: 13, symbol: 'diamond' }, name: 'unconfirmed candidate', hovertemplate: '%{text}<extra></extra>' }], plotLayout(meta.title, $('steadyScanParam').value, 'diagnostic coordinate'));
    }
    if (type.startsWith('map-')) return renderMap(side, type, meta);
    clearPlot(`${side}Plot`, 'No compatible computed data exist for this view.');
  }

  function renderMap(side, type, meta) {
    const scan = state.scan2D;
    let z;
    let colorbarTitle;
    if (type === 'map-convergence') {
      z = scan.rows.map(function (row) { return row.map(function (cell) { return cell.converged && (!cell.admissibility || cell.admissibility.admissible) ? 1 : 0; }); });
      colorbarTitle = 'converged';
    } else if (type === 'map-residual') {
      z = scan.rows.map(function (row) { return row.map(function (cell) { return Number.isFinite(cell.residualNorm) ? Math.log10(Math.max(cell.residualNorm, Number.MIN_VALUE)) : null; }); });
      colorbarTitle = 'log10 residual';
    } else if (type === 'map-stability') {
      z = scan.rows.map(function (row) { return row.map(function (cell) { return cell.stability.status === 'computed' ? cell.stability.maxRealPart : null; }); });
      colorbarTitle = 'max Re(λ)';
    } else {
      const variable = scan.variableNames[0];
      z = scan.rows.map(function (row) { return row.map(function (cell) { return cell.converged && (!cell.admissibility || cell.admissibility.admissible) ? cell.values[variable] : null; }); });
      colorbarTitle = variable;
    }
    return safePlot(side, [{ x: scan.values1, y: scan.values2, z, type: 'heatmap', colorscale: type === 'map-stability' ? 'RdBu' : 'Viridis', zmid: type === 'map-stability' ? 0 : undefined, colorbar: { title: colorbarTitle }, hoverongaps: false }], plotLayout(meta.title, scan.parameter1, scan.parameter2));
  }

  function visiblePlotSides() {
    const grid = $('plotGrid');
    if (!grid || grid.dataset.layout !== 'focus') return ['left', 'right'];
    return [state.focusSide === 'right' ? 'right' : 'left'];
  }

  function renderAllPlots() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { visiblePlotSides().forEach(renderPlot); });
    });
  }

  function resizeVisiblePlots() {
    ['leftPlot', 'rightPlot'].forEach(function (id) {
      root.FokoPlotLifecycle.resize($(id));
    });
  }

  function storedLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY));
      if (saved && VALID_LAYOUTS.has(saved.layout)) state.preferredLayout = saved.layout;
      if (saved && VALID_SIDES.has(saved.focus)) state.focusSide = saved.focus;
    } catch (_) { /* invalid storage ignored */ }
  }


  function effectiveLayout() {
    if (root.innerWidth < 1024) return 'focus';
    return state.preferredLayout;
  }

  function renderLayout() {
    const grid = $('plotGrid');
    const report = root.FokoLayoutStability.apply({
      grid: grid,
      preferred: state.preferredLayout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ layout: state.preferredLayout, focus: state.focusSide }));
    if (state.solution || state.scan1D.length || state.scan2D) renderAllPlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('steady');
    return report;
  }

  function selectLayout(layout) {
    if (!VALID_LAYOUTS.has(layout)) return;
    state.preferredLayout = layout;
    renderLayout();
  }

  function selectFocus(side) {
    if (!VALID_SIDES.has(side)) return;
    state.focusSide = side;
    state.preferredLayout = 'focus';
    renderLayout();
  }

  function currentConfig() {
    readEditorIntoModel();
    return {
      schema: 'fokolab-steady-config-v1',
      release: '72.48.0',
      name: state.currentName,
      model: clone(state.model),
      settings: {
        tolerance: $('steadyTol').value,
        maxIterations: $('steadyMaxIter').value,
        damping: $('steadyDamping').value,
        startScale: $('steadyStartScale').value,
      },
      scan: {
        parameter1: $('steadyScanParam').value,
        min1: $('steadyScanMin').value,
        max1: $('steadyScanMax').value,
        count1: $('steadyScanN').value,
        parameter2: $('steadyScanParam2').value,
        min2: $('steadyScan2Min').value,
        max2: $('steadyScan2Max').value,
        count2: $('steadyScan2N').value,
      },
      plots: clone(state.plotType),
      layout: { preferred: state.preferredLayout, focus: state.focusSide },
    };
  }

  function applyConfig(config, message) {
    if (!config || !config.model) throw new Error('Configuration does not contain a model.');
    state.currentName = config.name || 'Imported model';
    state.model = clone(config.model);
    state.model.params = Object.assign({}, state.model.params || {});
    validateModel(state.model);
    renderPresetLibrary();
    $('steadyInterpretation').value = state.model.interpretation === 'dynamic' ? 'dynamic' : 'algebraic';
    renderEditor();
    if (config.settings) {
      $('steadyTol').value = config.settings.tolerance || '1e-9';
      $('steadyMaxIter').value = config.settings.maxIterations || '80';
      $('steadyDamping').value = config.settings.damping || '1';
      $('steadyStartScale').value = config.settings.startScale || '1';
    }
    if (config.scan) {
      updateParameterOptions();
      if (Object.prototype.hasOwnProperty.call(state.model.params, config.scan.parameter1)) $('steadyScanParam').value = config.scan.parameter1;
      if (Object.prototype.hasOwnProperty.call(state.model.params, config.scan.parameter2)) $('steadyScanParam2').value = config.scan.parameter2;
      $('steadyScanMin').value = config.scan.min1 == null ? 0 : config.scan.min1;
      $('steadyScanMax').value = config.scan.max1 == null ? 4 : config.scan.max1;
      $('steadyScanN').value = config.scan.count1 == null ? 30 : config.scan.count1;
      $('steadyScan2Min').value = config.scan.min2 == null ? 0 : config.scan.min2;
      $('steadyScan2Max').value = config.scan.max2 == null ? 4 : config.scan.max2;
      $('steadyScan2N').value = config.scan.count2 == null ? 16 : config.scan.count2;
    }
    if (config.plots) state.plotType = Object.assign(state.plotType, config.plots);
    if (config.layout) {
      if (VALID_LAYOUTS.has(config.layout.preferred)) state.preferredLayout = config.layout.preferred;
      if (VALID_SIDES.has(config.layout.focus)) state.focusSide = config.layout.focus;
    }
    clearComputedEvidence(message || 'Configuration restored. Computed evidence was not restored and must be regenerated.');
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
    throw new Error('Clipboard access is unavailable in this browser context. Copy the URL from the address bar after using a secure or localhost origin.');
  }

  function saveSession() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig()));
    $('steadyStatus').textContent = 'Configuration saved locally. Computed evidence is intentionally not stored.';
  }

  function restoreSession() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return setError(new Error('No saved steady-state configuration exists.'));
    try { applyConfig(JSON.parse(raw), 'Configuration restored from local storage. Recompute all evidence.'); }
    catch (error) { setError(error); }
  }

  async function copyShareUrl() {
    try {
      const url = new URL(location.href);
      url.search = '';
      url.searchParams.set('state', encodeConfig(currentConfig()));
      await copyText(url.toString());
      $('steadyStatus').textContent = 'Share URL copied. It contains configuration only, not computed evidence.';
    } catch (error) { setError(error); }
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return /[,\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function resultPayload() {
    return {
      schema: 'fokolab-steady-result-v1',
      release: '72.48.0',
      exportedAt: new Date().toISOString(),
      configuration: currentConfig(),
      resultKind: state.resultKind,
      solution: state.solution,
      multiStart: state.multiStart,
      scan1D: state.scan1D,
      scan2D: state.scan2D,
      scientificBoundary: 'Browser root finding and sampled parameter grids are exploratory. Parameter scans are not pseudo-arclength continuation; multi-start is not exhaustive.',
    };
  }

  function wideCsv() {
    const rows = [['dataset', 'index', 'parameter1', 'parameter2'].concat(state.model.vars.map(function (entry) { return entry[0]; })).concat(['residual_norm', 'converged', 'termination']).join(',')];
    if (state.resultKind === 'scan2d' && state.scan2D) {
      state.scan2D.rows.flat().forEach(function (cell, index) {
        rows.push(['scan2d', index, cell.parameter1, cell.parameter2].concat(state.model.vars.map(function (entry) { return cell.values[entry[0]]; })).concat([cell.residualNorm, cell.converged, cell.solution.terminationReason]).map(csvCell).join(','));
      });
    } else if (state.resultKind === 'scan1d') {
      state.scan1D.forEach(function (row, index) {
        rows.push(['scan1d', index, row.parameter, ''].concat(state.model.vars.map(function (entry) { return row.values[entry[0]]; })).concat([row.residualNorm, row.converged, row.terminationReason]).map(csvCell).join(','));
      });
    } else if (state.solution) {
      rows.push(['root', 0, '', ''].concat(state.solution.x).concat([state.solution.residualNorm, state.solution.converged, state.solution.terminationReason]).map(csvCell).join(','));
    }
    return rows.join('\n');
  }

  function longCsv() {
    const rows = [['dataset', 'index', 'name', 'value', 'metadata'].join(',')];
    if (state.solution) {
      state.model.vars.forEach(function (entry, index) { rows.push(['root', 0, entry[0], state.solution.x[index], `residual=${state.solution.residualNorm}`].map(csvCell).join(',')); });
      state.solution.history.forEach(function (entry) { rows.push(['newton', entry.iteration, 'residual_norm', entry.residualNorm, `damping=${entry.damping}`].map(csvCell).join(',')); });
    }
    state.scan1D.forEach(function (row, index) {
      state.model.vars.forEach(function (entry) { rows.push(['scan1d', index, entry[0], row.values[entry[0]], `parameter=${row.parameter};converged=${row.converged}`].map(csvCell).join(',')); });
    });
    if (state.scan2D) state.scan2D.rows.flat().forEach(function (cell, index) {
      state.model.vars.forEach(function (entry) { rows.push(['scan2d', index, entry[0], cell.values[entry[0]], `${state.scan2D.parameter1}=${cell.parameter1};${state.scan2D.parameter2}=${cell.parameter2};converged=${cell.converged}`].map(csvCell).join(',')); });
    });
    return rows.join('\n');
  }

  function pythonExport() {
    const names = state.model.vars.map(function (entry) { return entry[0]; });
    const guesses = state.model.vars.map(function (entry) { return Number(entry[1]); });
    return `# Foko Lab v72.1 Steady-State validation export\n# Browser results are exploratory. Validate residuals, conditioning, and branches locally.\nimport numpy as np\nfrom scipy.optimize import root\n\nvariables = ${JSON.stringify(names)}\nx0 = np.array(${JSON.stringify(guesses)}, dtype=float)\nparams = ${JSON.stringify(state.model.params, null, 2)}\nequations = ${JSON.stringify(state.model.equations, null, 2)}\n\ndef system(x, params=params):\n    scope = dict(params)\n    scope.update({name: float(x[i]) for i, name in enumerate(variables)})\n    scope.update({'sin': np.sin, 'cos': np.cos, 'tan': np.tan, 'exp': np.exp, 'log': np.log, 'sqrt': np.sqrt, 'abs': abs, 'min': min, 'max': max, 'pow': pow, 'pi': np.pi, 'e': np.e})\n    return np.array([eval(expr.replace('^', '**'), {'__builtins__': {}}, scope) for expr in equations], dtype=float)\n\nsolution = root(system, x0, method='hybr')\nprint('success:', solution.success)\nprint('message:', solution.message)\nprint('root:', dict(zip(variables, solution.x)))\nprint('residual norm:', np.linalg.norm(system(solution.x)))\n\n# For robust continuation and bifurcation analysis, use a dedicated package\n# such as AUTO-07p, PyDSTool, BifurcationKit.jl, or COCO.\n`;
  }

  function downloadText(filename, content, mime) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: mime || 'text/plain' }));
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function exportPlot(side, format) {
    const node = $(`${side}Plot`);
    if (!node || !node.data) return setError(new Error('The selected plot has not been computed.'));
    root.Plotly.downloadImage(node, { format, filename: `foko-lab-steady-${state.plotType[side]}` });
  }

  async function importJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.configuration) applyConfig(payload.configuration, 'Configuration imported from result JSON. Recompute all evidence.');
      else if (payload.model && payload.schema) applyConfig(payload, 'Configuration imported. Recompute all evidence.');
      else applyConfig({ name: payload.name || 'Imported model', model: payload }, 'Model imported. Recompute all evidence.');
    } catch (error) { setError(error); }
    event.target.value = '';
  }

  function bind() {
    if (!Core) throw new Error('FokoSteadyCore did not load.');
    storedLayout();
    const query = new URLSearchParams(location.search);
    renderPresetLibrary();
    renderSteadyTaxonomy();
    if (query.get('state')) {
      try { applyConfig(decodeConfig(query.get('state')), 'Shared configuration loaded. Computed evidence was not included.'); }
      catch (error) { loadPreset(query.get('example') || state.currentName, false); setError(new Error(`Shared configuration could not be loaded: ${error.message}`)); }
    } else loadPreset(query.get('example') || state.currentName, false);

    $('solveSteady').addEventListener('click', runSolve);
    $('runMultiStart').addEventListener('click', runMultiStart);
    $('runScan1D').addEventListener('click', runScan1D);
    $('runScan2D').addEventListener('click', runScan2D);
    $('resetSteady').addEventListener('click', function () { loadPreset(state.currentName, false); });
    $('loadSteady').addEventListener('click', function () { loadPreset($('steadySelect').value, true); root.setTimeout(runSolve, 0); });
    $('steadySelect').addEventListener('change', function () { loadPreset(this.value, true); root.setTimeout(runSolve, 0); });
    $('steadyExampleSearch').addEventListener('input', renderPresetLibrary);
    $('steadyFamilyFilter').addEventListener('change', renderPresetLibrary);
    $('addSteadyVar').addEventListener('click', function () { state.model.vars.push([`x${state.model.vars.length + 1}`, 0]); state.model.equations.push('0'); renderEditor(); clearComputedEvidence('Variable added. Recompute before interpreting results.'); });
    $('addSteadyParam').addEventListener('click', function () { state.model.params[`p${Object.keys(state.model.params).length + 1}`] = 1; renderEditor(); clearComputedEvidence('Parameter added. Recompute before interpreting results.'); });
    $('steadyInterpretation').addEventListener('change', function () { state.model.interpretation = currentInterpretation(); updateInterpretationHelp(); clearComputedEvidence('Interpretation changed. Recompute before reporting stability.'); });
    $('steadyImport').addEventListener('change', importJson);
    ['left', 'right'].forEach(function (side) {
      $(`${side}PlotType`).addEventListener('change', function () { state.plotType[side] = $(`${side}PlotType`).value; renderPlot(side); });
    });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) { button.addEventListener('click', function () { selectLayout(button.dataset.layoutMode); }); });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) { button.addEventListener('click', function () { selectFocus(button.dataset.focusSide); }); });
    document.querySelectorAll('[data-export-side]').forEach(function (button) { button.addEventListener('click', function () { exportPlot(button.dataset.exportSide, 'png'); }); });
    $('exportSteadyPng').addEventListener('click', function () { exportPlot(state.focusSide, 'png'); });
    $('exportSteadySvg').addEventListener('click', function () { exportPlot(state.focusSide, 'svg'); });
    $('saveSteadySession').addEventListener('click', saveSession);
    $('restoreSteadySession').addEventListener('click', restoreSession);
    $('copySteadyShareUrl').addEventListener('click', copyShareUrl);
    $('exportSteadyWide').addEventListener('click', function () { downloadText('foko-lab-steady-wide.csv', wideCsv(), 'text/csv'); });
    $('exportSteadyLong').addEventListener('click', function () { downloadText('foko-lab-steady-long.csv', longCsv(), 'text/csv'); });
    $('exportSteadyJson').addEventListener('click', function () { downloadText('foko-lab-steady-result.json', JSON.stringify(resultPayload(), null, 2), 'application/json'); });
    $('exportSteadyModel').addEventListener('click', function () { downloadText('foko-lab-steady-model.json', JSON.stringify(currentConfig(), null, 2), 'application/json'); });
    $('exportSteadyPython').addEventListener('click', function () { downloadText('foko-lab-steady-validate.py', pythonExport(), 'text/x-python'); });
    document.querySelectorAll('[data-jump]').forEach(function (button) { button.addEventListener('click', function () { const target = $(button.dataset.jump); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.querySelectorAll('.side-nav .nav-item').forEach(function (item) { item.classList.toggle('active', item === button); }); }); });
    document.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runSolve(); } });
    root.addEventListener('resize', renderLayout, { passive: true });
    renderLayout();
    if (!query.get('state') && query.get('autorun') !== '0') root.setTimeout(runSolve, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  root.FokoSteadyWorkspace = {
    currentConfig,
    runSolve,
    runMultiStart,
    runScan1D,
    runScan2D,
    renderLayout,
    renderAllPlots,
  };
}(typeof window !== 'undefined' ? window : globalThis));
