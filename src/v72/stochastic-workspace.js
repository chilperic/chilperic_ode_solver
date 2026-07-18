/* Foko Lab v72.2 Stochastic workspace.
 * Authored DOM controller and Plotly adapter for the pure FokoStochasticCore.
 * Scope: time-homogeneous CTMCs simulated with Gillespie direct SSA.
 */
(function (root) {
  'use strict';

  const Core = root.FokoStochasticCore;
  const ODE = root.FokoODECore;
  const PRESETS = root.FokoStochasticPresets;
  if (!Core || !ODE || !PRESETS) throw new Error('Stochastic reference dependencies did not load.');

  const $ = function (id) { return document.getElementById(id); };
  const clone = function (value) { return JSON.parse(JSON.stringify(value)); };
  const STORAGE_KEY = 'fokolab:v72:stochastic-session';
  const LAYOUT_KEY = 'fokolab:v72:stochastic-layout';
  const VALID_LAYOUTS = new Set(['two', 'focus']);
  const VALID_SIDES = new Set(['left', 'right']);
  const CORE_PRESETS = Object.keys(PRESETS);

  const state = {
    currentName: CORE_PRESETS[0],
    model: null,
    result: null,
    meanField: null,
    meanFieldError: '',
    plotType: { left: 'paths', right: 'mean-band' },
    preferredLayout: 'two',
    focusSide: 'left',
    busy: false,
    selectedVariable: '',
  };

  const PLOT_META = {
    paths: {
      title: 'Ensemble trajectories',
      evidence: 'At most 60 individual trajectories are drawn for legibility, while the empirical mean uses every simulated trajectory. The displayed paths are not confidence bounds.',
    },
    'mean-band': {
      title: 'Empirical mean and quantile band',
      evidence: 'The shaded band is the pointwise empirical 5th–95th percentile range across seeded trajectories. It is not a parameter confidence interval and does not describe simultaneous coverage.',
    },
    single: {
      title: 'Single realization',
      evidence: 'One seeded trajectory is shown. It is a possible realization, not a representative or expected path.',
    },
    'mean-field': {
      title: 'Empirical mean and mean-field ODE',
      evidence: 'The stochastic empirical mean is compared with a separately computed deterministic mean-field ODE supplied by the curated preset. The two need not coincide for nonlinear finite-population systems.',
    },
    'final-hist': {
      title: 'Final-state distribution',
      evidence: 'Histogram of the selected state at the configured final time across independent seeded trajectories. It is a finite Monte Carlo sample, not an analytical stationary distribution.',
    },
    variance: {
      title: 'Between-trajectory variance',
      evidence: 'Unbiased sample variance across trajectories at each observation time. It measures ensemble dispersion, not numerical integration error.',
    },
    'event-counts': {
      title: 'Event-count distribution',
      evidence: 'Distribution of the number of executed reaction events per trajectory. Runs hitting the event cap are censored and reported separately.',
    },
    fano: {
      title: 'Fano-factor timeline',
      evidence: 'The pointwise sample variance divided by the pointwise sample mean. It is undefined near zero and is a descriptive dispersion diagnostic, not proof of a particular stochastic mechanism.',
    },
    autocorrelation: {
      title: 'Single-path autocorrelation',
      evidence: 'Lag autocorrelation from the first seeded trajectory after mean removal. It is a finite-path diagnostic and must not be interpreted as a stationary-process estimate.',
    },
    'zero-risk': {
      title: 'Zero-state risk through time',
      evidence: 'Fraction of seeded trajectories at zero for the selected state at each observation time. This is a finite-horizon empirical probability under the declared model and seed design.',
    },
    'zero-passage': {
      title: 'First zero-passage CDF',
      evidence: 'Empirical CDF of the first observed time the selected state reaches zero. Trajectories that never reach zero within the horizon are right-censored and excluded from the event-time curve.',
    },
    'deviation-matrix': {
      title: 'Path-deviation matrix',
      evidence: 'Heatmap of selected trajectories minus the ensemble mean at each observation time. It exposes run-to-run structure but is not a covariance model.',
    },
  };
  root.FokoStochasticPlotMeta = PLOT_META;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  function normaliseSymbol(value) {
    return String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '').replace(/^(\d)/, '_$1');
  }

  function formatNumber(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    if (Math.abs(number) >= 1e5 || (Math.abs(number) > 0 && Math.abs(number) < 1e-3)) return number.toExponential(digits == null ? 3 : digits);
    return number.toFixed(digits == null ? 3 : digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '');
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function encodeState(value) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeState(value) {
    try {
      let token = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
      while (token.length % 4) token += '=';
      return JSON.parse(decodeURIComponent(escape(atob(token))));
    } catch (_) {
      return null;
    }
  }

  function markStructuralEdit(target) {
    if (!state.model) return;
    if (target && (target.classList.contains('stoch-param-value') || target.classList.contains('stoch-state-initial'))) return;
    state.model.meanField = null;
    state.meanField = null;
    state.meanFieldError = 'The curated mean-field equations were removed because the reaction structure or state symbols were edited.';
  }

  function loadPreset(name, updateUrl) {
    const presetName = PRESETS[name] ? name : CORE_PRESETS[0];
    state.currentName = presetName;
    state.model = clone(PRESETS[presetName]);
    state.selectedVariable = state.model.settings.variable || state.model.stateNames[0];
    if (updateUrl) history.replaceState(null, '', `?example=${encodeURIComponent(presetName)}`);
    renderPresetLibrary();
    renderEditor();
    applySettings();
    clearComputedEvidence('Preset loaded. No stochastic result has been computed.');
  }

  function renderPresetLibrary() {
    $('stochasticSelect').innerHTML = CORE_PRESETS.map(function (name) {
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    $('stochasticSelect').value = state.currentName;
    $('stochasticDeck').innerHTML = CORE_PRESETS.map(function (name) {
      const preset = PRESETS[name];
      return `<button class="${name === state.currentName ? 'active' : ''}" data-preset="${escapeHtml(name)}" type="button"><b>${escapeHtml(name)}</b><small>${escapeHtml(preset.family)}</small></button>`;
    }).join('');
    $('stochasticNarrative').textContent = state.model.narrative || '';
    $('stochasticScientificNote').textContent = state.model.scientificNote || '';
    $('stochasticFamily').textContent = state.model.family || 'CTMC model';
    $('stochasticTitle').textContent = state.model.title || state.currentName;
  }

  function changeToText(change) {
    return state.model.stateNames.map(function (name) {
      const value = Number(change && change[name]) || 0;
      return `${name}:${value >= 0 ? '+' : ''}${value}`;
    }).join(', ');
  }

  function parseChange(text, names) {
    const result = {};
    names.forEach(function (name) { result[name] = 0; });
    const chunks = String(text || '').split(',').map(function (part) { return part.trim(); }).filter(Boolean);
    chunks.forEach(function (chunk) {
      const match = chunk.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([+-]?\d+)$/);
      if (!match) throw new Error(`Invalid state change "${chunk}". Use State:+1, Other:-1.`);
      if (!Object.prototype.hasOwnProperty.call(result, match[1])) throw new Error(`Unknown state ${match[1]} in reaction change.`);
      result[match[1]] = Number(match[2]);
    });
    return result;
  }

  function renderEditor() {
    $('stochasticStates').innerHTML = '<div class="table-head"><span>State</span><span>Initial count</span><span></span></div>' + state.model.stateNames.map(function (name, index) {
      return `<div class="table-row" data-state-row="${index}"><input class="stoch-state-name" aria-label="State name" value="${escapeHtml(name)}"/><input class="stoch-state-initial" aria-label="Initial count for ${escapeHtml(name)}" type="number" min="0" step="1" value="${escapeHtml(state.model.initial[index])}"/><button class="delete" data-delete-state="${index}" aria-label="Delete ${escapeHtml(name)}" type="button">×</button></div>`;
    }).join('');

    const params = Object.entries(state.model.params || {});
    $('stochasticParams').innerHTML = '<div class="table-head"><span>Parameter</span><span>Value</span><span></span></div>' + params.map(function (entry, index) {
      return `<div class="table-row" data-param-row="${index}"><input class="stoch-param-name" aria-label="Parameter name" value="${escapeHtml(entry[0])}"/><input class="stoch-param-value" aria-label="Value for ${escapeHtml(entry[0])}" type="number" step="any" value="${escapeHtml(entry[1])}"/><button class="delete" data-delete-param="${index}" aria-label="Delete ${escapeHtml(entry[0])}" type="button">×</button></div>`;
    }).join('');

    $('stochasticReactions').innerHTML = '<div class="reaction-head"><span>Event</span><span>Propensity</span><span>Integer change vector</span><span></span></div>' + state.model.reactions.map(function (reaction, index) {
      return `<div class="reaction-row" data-reaction-row="${index}"><input class="stoch-reaction-name" aria-label="Reaction name" value="${escapeHtml(reaction.name)}"/><input class="stoch-reaction-propensity" aria-label="Propensity for ${escapeHtml(reaction.name)}" value="${escapeHtml(reaction.propensity)}"/><input class="stoch-reaction-change" aria-label="State change for ${escapeHtml(reaction.name)}" value="${escapeHtml(changeToText(reaction.change))}"/><button class="delete" data-delete-reaction="${index}" aria-label="Delete ${escapeHtml(reaction.name)}" type="button">×</button></div>`;
    }).join('');
    updateVariableOptions();
    renderReactionPreview();
  }

  function readEditorIntoModel() {
    const stateRows = Array.from(document.querySelectorAll('[data-state-row]'));
    const names = stateRows.map(function (row) { return normaliseSymbol(row.querySelector('.stoch-state-name').value); });
    if (!names.length) throw new Error('At least one state is required.');
    if (names.some(function (name) { return !name; })) throw new Error('Every state requires a valid symbol.');
    if (new Set(names).size !== names.length) throw new Error('State names must be unique.');
    const initial = stateRows.map(function (row, index) {
      const value = Number(row.querySelector('.stoch-state-initial').value);
      if (!Number.isInteger(value) || value < 0) throw new Error(`Initial count for ${names[index]} must be a non-negative integer.`);
      return value;
    });

    const params = {};
    Array.from(document.querySelectorAll('[data-param-row]')).forEach(function (row) {
      const name = normaliseSymbol(row.querySelector('.stoch-param-name').value);
      if (!name) throw new Error('Every parameter requires a valid symbol.');
      if (Object.prototype.hasOwnProperty.call(params, name)) throw new Error(`Duplicate parameter ${name}.`);
      if (names.includes(name)) throw new Error(`${name} cannot be both a state and a parameter.`);
      const value = Number(row.querySelector('.stoch-param-value').value);
      if (!Number.isFinite(value)) throw new Error(`Parameter ${name} must be finite.`);
      params[name] = value;
    });

    const reactions = Array.from(document.querySelectorAll('[data-reaction-row]')).map(function (row, index) {
      const name = row.querySelector('.stoch-reaction-name').value.trim() || `reaction_${index + 1}`;
      const propensity = row.querySelector('.stoch-reaction-propensity').value.trim();
      if (!propensity) throw new Error(`Reaction ${name} requires a propensity expression.`);
      return {
        name,
        propensity,
        change: parseChange(row.querySelector('.stoch-reaction-change').value, names),
      };
    });
    if (!reactions.length) throw new Error('At least one reaction is required.');

    state.model.stateNames = names;
    state.model.initial = initial;
    state.model.params = params;
    state.model.reactions = reactions;
    if (!names.includes(state.selectedVariable)) state.selectedVariable = names[0];
    updateVariableOptions();
    renderReactionPreview();
  }

  function validateExpression(expression, allowedSymbols, label) {
    const node = root.math.parse(expression);
    const functionNames = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp', 'log', 'sqrt', 'abs', 'min', 'max', 'pow', 'floor', 'ceil', 'round']);
    const bad = [];
    node.traverse(function (child) {
      if (child.isSymbolNode && !allowedSymbols.has(child.name) && !functionNames.has(child.name)) bad.push(child.name);
    });
    if (String(expression).match(/(^|[^A-Za-z0-9_])t([^A-Za-z0-9_]|$)/)) throw new Error(`${label} uses explicit time t. The reference direct SSA supports time-homogeneous propensities only.`);
    if (bad.length) throw new Error(`${label} contains unsupported symbol(s): ${Array.from(new Set(bad)).join(', ')}.`);
    return root.math.compile(expression);
  }

  function compileModel() {
    readEditorIntoModel();
    const names = state.model.stateNames.slice();
    const params = Object.assign({}, state.model.params);
    const allowed = new Set(names.concat(Object.keys(params), ['pi', 'e']));
    const compiled = state.model.reactions.map(function (reaction) {
      const expression = validateExpression(reaction.propensity, allowed, `Propensity ${reaction.name}`);
      return {
        name: reaction.name,
        change: names.map(function (name) { return Number(reaction.change[name]) || 0; }),
        propensity: function (x) {
          const scope = Object.assign({}, params);
          names.forEach(function (name, index) { scope[name] = x[index]; });
          return Number(expression.evaluate(scope));
        },
      };
    });
    return { stateNames: names, initial: state.model.initial.slice(), params, reactions: compiled };
  }

  function compileMeanField() {
    if (!Array.isArray(state.model.meanField) || state.model.meanField.length !== state.model.stateNames.length) return null;
    const names = state.model.stateNames.slice();
    const params = Object.assign({}, state.model.params);
    const allowed = new Set(names.concat(Object.keys(params), ['pi', 'e']));
    const compiled = state.model.meanField.map(function (expression, index) {
      return validateExpression(expression, allowed, `Mean-field equation ${index + 1}`);
    });
    return function rhs(_time, x) {
      const scope = Object.assign({}, params);
      names.forEach(function (name, index) { scope[name] = x[index]; });
      return compiled.map(function (expression) { return Number(expression.evaluate(scope)); });
    };
  }

  function renderReactionPreview() {
    const rows = state.model.reactions.map(function (reaction) {
      let latex = reaction.propensity;
      try { latex = root.math.parse(reaction.propensity).toTex({ parenthesis: 'keep' }); } catch (_) { /* raw fallback */ }
      const change = changeToText(reaction.change).replace(/_/g, '\\_');
      return `a_{\\mathrm{${reaction.name.replace(/[^A-Za-z0-9]/g, '') || 'r'}}}(x)=${latex},\\quad \\Delta=\\mathrm{${change}}`;
    }).join('\\\\[5pt]');
    const source = rows ? `\\begin{aligned}${rows}\\end{aligned}` : '\\text{No reactions}';
    root.FokoMathRender.render($('stochasticPreview'), source, { displayMode: true });
  }

  function applySettings() {
    const settings = state.model.settings || {};
    $('stochasticT0').value = settings.t0 == null ? 0 : settings.t0;
    $('stochasticT1').value = settings.t1 == null ? 40 : settings.t1;
    $('stochasticPoints').value = settings.points == null ? 240 : settings.points;
    $('stochasticRuns').value = settings.runs == null ? 200 : settings.runs;
    $('stochasticSeed').value = settings.seed == null ? 12345 : settings.seed;
    $('stochasticMaxEvents').value = settings.maxEvents == null ? 200000 : settings.maxEvents;
    state.selectedVariable = settings.variable || state.model.stateNames[0];
    updateVariableOptions();
  }

  function updateVariableOptions() {
    const names = state.model && state.model.stateNames ? state.model.stateNames : [];
    const options = names.map(function (name) { return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`; }).join('');
    $('stochasticVariable').innerHTML = options;
    $('stochasticVariableMirror').innerHTML = options;
    if (!names.includes(state.selectedVariable)) state.selectedVariable = names[0] || '';
    $('stochasticVariable').value = state.selectedVariable;
    $('stochasticVariableMirror').value = state.selectedVariable;
  }

  function simulationSettings() {
    const t0 = Number($('stochasticT0').value);
    const t1 = Number($('stochasticT1').value);
    const points = Number($('stochasticPoints').value);
    const runs = Number($('stochasticRuns').value);
    const seed = Number($('stochasticSeed').value);
    const maxEvents = Number($('stochasticMaxEvents').value);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || !(t1 > t0)) throw new Error('t end must be greater than t start.');
    if (!Number.isInteger(points) || points < 20 || points > 1200) throw new Error('Observation points must be an integer from 20 to 1200.');
    if (!Number.isInteger(runs) || runs < 1 || runs > 2000) throw new Error('Independent runs must be an integer from 1 to 2000.');
    if (!Number.isInteger(maxEvents) || maxEvents < 100 || maxEvents > 10000000) throw new Error('Event cap must be an integer from 100 to 10,000,000.');
    const dimension = state.model.stateNames.length;
    if (runs * points * dimension > 3000000) throw new Error('Requested ensemble exceeds the browser memory guard (runs × points × states > 3,000,000). Reduce runs or observation points.');
    return { t0, t1, points, runs, seed, maxEvents };
  }

  function setBusy(busy, message) {
    state.busy = busy;
    ['runStochastic', 'resetStochastic', 'loadStochastic'].forEach(function (id) { $(id).disabled = busy; });
    $('stochasticStatus').classList.remove('bad');
    $('stochasticStatus').textContent = message || (busy ? 'Computing…' : 'Ready.');
    if (!busy) $('stochasticProgress').style.width = '0%';
  }

  function setProgress(fraction, message) {
    $('stochasticProgress').style.width = `${Math.max(0, Math.min(1, Number(fraction) || 0)) * 100}%`;
    if (message) $('stochasticStatus').textContent = message;
  }

  function clearPlot(id, message) {
    const node = $(id);
    if (!node) return;
    root.FokoPlotLifecycle.clear(node, message);
  }

  function clearComputedEvidence(message) {
    state.result = null;
    state.meanField = null;
    $('stochasticResultKind').textContent = 'No computed result';
    ['left', 'right'].forEach(function (side) { clearPlot(`${side}Plot`, 'Run an ensemble to create this view.'); });
    $('stochasticTopStatus').textContent = 'Ready';
    ['stochasticRuntime', 'stochasticRunsMetric', 'stochasticEvents', 'stochasticTruncated', 'stochasticFinalMean', 'stochasticFinalSd', 'stochasticAbsorbing', 'stochasticSeedMetric'].forEach(function (id) { $(id).textContent = '—'; });
    $('stochasticDiagnostics').classList.add('empty');
    $('stochasticDiagnostics').textContent = message || 'No numerical result exists.';
    $('provenanceStatus').textContent = 'Not computed';
    $('provenanceMethod').textContent = 'Gillespie direct SSA';
    $('provenanceScope').textContent = 'Time-homogeneous CTMC';
    $('provenanceUncertainty').textContent = 'Not computed';
    $('provenanceWarning').hidden = false;
    $('provenanceWarning').textContent = 'Configuration changes invalidate previously computed trajectories and Monte Carlo evidence.';
    updateAvailablePlots();
  }

  function setError(error) {
    setBusy(false, `Error: ${error.message || error}`);
    $('stochasticStatus').classList.add('bad');
    $('stochasticTopStatus').textContent = 'Error';
    $('provenanceStatus').textContent = 'Failed';
    $('provenanceWarning').hidden = false;
    $('provenanceWarning').textContent = error.message || String(error);
  }

  function computeMeanField(settings) {
    state.meanField = null;
    state.meanFieldError = '';
    try {
      const rhs = compileMeanField();
      if (!rhs) {
        state.meanFieldError = 'No validated mean-field ODE is attached to the edited model.';
        return;
      }
      const result = ODE.solveWithRhs({
        t0: settings.t0,
        t1: settings.t1,
        points: settings.points,
        y0: state.model.initial.slice(),
        vars: state.model.stateNames.slice(),
        params: Object.assign({}, state.model.params),
        method: 'rk45',
        rtol: 1e-7,
        atol: 1e-9,
      }, rhs);
      if (result && result.ok) state.meanField = result;
      else state.meanFieldError = result && result.error ? result.error : 'Mean-field ODE did not return a valid result.';
    } catch (error) {
      state.meanFieldError = error.message || String(error);
    }
  }

  function runEnsemble() {
    if (state.busy) return;
    try {
      readEditorIntoModel();
      const settings = simulationSettings();
      const model = compileModel();
      setBusy(true, 'Preparing seeded ensemble…');
      setProgress(0.02, 'Preparing seeded ensemble…');
      setTimeout(function () {
        try {
          const result = Core.simulateEnsemble(Object.assign({}, settings, {
            model,
            onProgress: setProgress,
          }));
          state.result = result;
          computeMeanField(settings);
          applyResult();
          setBusy(false, result.truncatedRuns ? 'Ensemble completed with censored trajectories. Review warnings.' : 'Ensemble completed.');
        } catch (error) { setError(error); }
      }, 20);
    } catch (error) { setError(error); }
  }

  function selectedSummary() {
    if (!state.result) return null;
    const index = state.result.stateNames.indexOf(state.selectedVariable);
    return index >= 0 ? state.result.summaries[index] : state.result.summaries[0];
  }

  function applyResult() {
    const result = state.result;
    const summary = selectedSummary();
    $('stochasticResultKind').textContent = `${result.runs} seeded direct-SSA trajectories`;
    $('stochasticTopStatus').textContent = result.truncatedRuns ? 'Completed with censoring' : (result.warnings.length ? 'Completed with warning' : 'Successful');
    $('stochasticRuntime').textContent = `${result.runtimeMs.toFixed(1)} ms`;
    $('stochasticRunsMetric').textContent = String(result.runs);
    $('stochasticEvents').textContent = formatNumber(result.eventMoments.mean, 1);
    $('stochasticTruncated').textContent = `${result.truncatedRuns}/${result.runs}`;
    $('stochasticFinalMean').textContent = formatNumber(summary.final.mean, 3);
    $('stochasticFinalSd').textContent = formatNumber(summary.final.sd, 3);
    $('stochasticAbsorbing').textContent = `${result.absorbingRuns}/${result.runs}`;
    $('stochasticSeedMetric').textContent = String(result.seed);
    $('provenanceStatus').textContent = result.truncatedRuns ? 'Computed: censored runs present' : 'Computed';
    $('provenanceMethod').textContent = result.algorithm;
    $('provenanceScope').textContent = result.scope;
    $('provenanceRandomness').textContent = `Base seed ${result.seed}; deterministically derived trajectory streams`;
    $('provenanceUncertainty').textContent = 'Empirical 5–95% bands + Monte Carlo SE';
    const warnings = result.warnings.slice();
    if (state.meanFieldError) warnings.push(state.meanFieldError);
    $('provenanceWarning').hidden = warnings.length === 0;
    $('provenanceWarning').textContent = warnings.join(' ') || 'No browser-side warning was triggered. Independent validation may still be required.';
    renderDiagnostics();
    updateAvailablePlots();
    renderAllPlots();
  }

  function renderDiagnostics() {
    const result = state.result;
    const summary = selectedSummary();
    const rows = [
      ['Algorithm', result.algorithm],
      ['Declared scope', result.scope],
      ['Event-time claim', result.exactness],
      ['Independent trajectories', String(result.runs)],
      ['Base seed', String(result.seed)],
      ['Observed state', state.selectedVariable],
      ['Final sample mean', formatNumber(summary.final.mean, 6)],
      ['Final sample SD', formatNumber(summary.final.sd, 6)],
      ['Final Monte Carlo SE', formatNumber(summary.final.standardError, 6)],
      ['Approx. 95% MC interval for final mean', `[${formatNumber(summary.final.mc95[0], 6)}, ${formatNumber(summary.final.mc95[1], 6)}]`],
      ['Pointwise uncertainty band', result.uncertainty.band],
      ['Mean event count', formatNumber(result.eventMoments.mean, 3)],
      ['Event-count 5–95%', `[${formatNumber(result.eventMoments.q05, 1)}, ${formatNumber(result.eventMoments.q95, 1)}]`],
      ['Absorbing runs', `${result.absorbingRuns}/${result.runs}`],
      ['Event-cap censored runs', `${result.truncatedRuns}/${result.runs}`],
      ['Mean-field overlay', state.meanField ? 'Curated deterministic ODE computed separately' : `Unavailable: ${state.meanFieldError || 'not supplied'}`],
    ];
    $('stochasticDiagnostics').classList.remove('empty');
    $('stochasticDiagnostics').innerHTML = `<table><tbody>${rows.map(function (row) { return `<tr><th>${escapeHtml(row[0])}</th><td>${escapeHtml(row[1])}</td></tr>`; }).join('')}</tbody></table>`;
  }

  function availablePlotTypes() {
    const types = ['paths', 'mean-band', 'single', 'final-hist', 'variance', 'fano', 'autocorrelation', 'zero-risk', 'zero-passage', 'deviation-matrix', 'event-counts'];
    if (state.meanField) types.splice(3, 0, 'mean-field');
    return types;
  }

  function updateAvailablePlots() {
    const types = state.result ? availablePlotTypes() : ['paths', 'mean-band', 'final-hist'];
    ['left', 'right'].forEach(function (side) {
      const select = $(`${side}PlotType`);
      if (!types.includes(state.plotType[side])) state.plotType[side] = types[Math.min(types.length - 1, side === 'left' ? 0 : side === 'right' ? 1 : 2)];
      select.innerHTML = types.map(function (type) { return `<option value="${type}">${escapeHtml(PLOT_META[type].title)}</option>`; }).join('');
      select.value = state.plotType[side];
    });
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('stochastic');
}

  function plotColours() {
    const style = getComputedStyle(document.documentElement);
    return {
      brand: style.getPropertyValue('--brand').trim() || '#0f766e',
      strong: style.getPropertyValue('--brand-strong').trim() || '#115e59',
      muted: '#64748b',
      warning: '#b45309',
    };
  }

  function baseLayout(title, xTitle, yTitle) {
    return {
      title: { text: title, font: { size: 15 } },
      margin: { l: 58, r: 20, t: 48, b: 52 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      font: { family: 'Inter, system-ui, sans-serif', size: 11, color: '#233444' },
      xaxis: { title: xTitle, gridcolor: '#e8eef2', zerolinecolor: '#d5e0e6' },
      yaxis: { title: yTitle, gridcolor: '#e8eef2', zerolinecolor: '#d5e0e6' },
      legend: { orientation: 'h', y: 1.12, x: 0 },
      hovermode: 'closest',
      autosize: true,
    };
  }


  function autocorrelation(values, maxLag) {
    const n = values.length;
    const mean = values.reduce(function (sum, value) { return sum + value; }, 0) / Math.max(1, n);
    const centered = values.map(function (value) { return value - mean; });
    const denominator = centered.reduce(function (sum, value) { return sum + value * value; }, 0);
    const lags = [], correlations = [];
    const limit = Math.max(1, Math.min(maxLag || 40, Math.floor(n / 3)));
    for (let lag = 0; lag <= limit; lag += 1) {
      let numerator = 0;
      for (let index = 0; index < n - lag; index += 1) numerator += centered[index] * centered[index + lag];
      lags.push(lag);
      correlations.push(denominator > 0 ? numerator / denominator : (lag === 0 ? 1 : 0));
    }
    return { lags, correlations };
  }

  function zeroPassageEvidence(result, stateIndex) {
    const firstTimes = [];
    result.trajectories.forEach(function (trajectory) {
      const series = trajectory[stateIndex];
      const index = series.findIndex(function (value) { return value <= 0; });
      if (index >= 0) firstTimes.push(result.times[index]);
    });
    firstTimes.sort(function (a, b) { return a - b; });
    return { firstTimes, cdf: firstTimes.map(function (_, index) { return (index + 1) / result.runs; }) };
  }

  function plotPayload(type) {
    const result = state.result;
    const summary = selectedSummary();
    const stateIndex = result.stateNames.indexOf(summary.name);
    const colours = plotColours();
    const times = result.times;
    if (type === 'paths') {
      const limit = Math.min(60, result.trajectories.length);
      const traces = [];
      for (let index = 0; index < limit; index += 1) {
        traces.push({ x: times, y: result.trajectories[index][stateIndex], type: 'scatter', mode: 'lines', line: { width: 1, color: 'rgba(15,118,110,0.16)' }, hoverinfo: 'skip', showlegend: false });
      }
      traces.push({ x: times, y: summary.mean, type: 'scatter', mode: 'lines', name: `Mean (${result.runs} runs)`, line: { width: 3, color: colours.strong } });
      return { traces, layout: baseLayout(PLOT_META[type].title, 'time', summary.name) };
    }
    if (type === 'mean-band') {
      const traces = [
        { x: times, y: summary.high, type: 'scatter', mode: 'lines', line: { width: 0 }, hoverinfo: 'skip', showlegend: false },
        { x: times, y: summary.low, type: 'scatter', mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(15,118,110,0.16)', name: 'Empirical 5–95%' },
        { x: times, y: summary.median, type: 'scatter', mode: 'lines', name: 'Median', line: { width: 2, dash: 'dot', color: colours.muted } },
        { x: times, y: summary.mean, type: 'scatter', mode: 'lines', name: 'Mean', line: { width: 3, color: colours.strong } },
      ];
      return { traces, layout: baseLayout(PLOT_META[type].title, 'time', summary.name) };
    }
    if (type === 'single') {
      return {
        traces: [{ x: times, y: result.trajectories[0][stateIndex], type: 'scatter', mode: 'lines', name: `Trajectory seed stream 1`, line: { width: 2, color: colours.brand, shape: 'hv' } }],
        layout: baseLayout(PLOT_META[type].title, 'time', summary.name),
      };
    }
    if (type === 'mean-field') {
      const deterministicIndex = state.meanField.vars.indexOf(summary.name);
      return {
        traces: [
          { x: times, y: summary.mean, type: 'scatter', mode: 'lines', name: `Empirical mean (${result.runs})`, line: { width: 3, color: colours.strong } },
          { x: state.meanField.T, y: state.meanField.Y[deterministicIndex], type: 'scatter', mode: 'lines', name: 'Mean-field ODE', line: { width: 2, dash: 'dash', color: colours.warning } },
        ],
        layout: baseLayout(PLOT_META[type].title, 'time', summary.name),
      };
    }
    if (type === 'final-hist') {
      return {
        traces: [{ x: summary.finalValues, type: 'histogram', name: `${summary.name}(t_end)`, marker: { color: colours.brand }, opacity: 0.82, nbinsx: Math.min(50, Math.max(8, Math.round(Math.sqrt(result.runs)))) }],
        layout: baseLayout(PLOT_META[type].title, `${summary.name} at final time`, 'trajectory count'),
      };
    }
    if (type === 'variance') {
      return {
        traces: [{ x: times, y: summary.variance, type: 'scatter', mode: 'lines', name: 'Sample variance', line: { width: 3, color: colours.brand } }],
        layout: baseLayout(PLOT_META[type].title, 'time', `Var(${summary.name})`),
      };
    }
    if (type === 'fano') {
      const fano = summary.variance.map(function (variance, index) { const mean = summary.mean[index]; return Math.abs(mean) > 1e-12 ? variance / Math.abs(mean) : NaN; });
      return { traces: [{ x: times, y: fano, type: 'scatter', mode: 'lines', name: 'variance / mean', connectgaps: false, line: { width: 3, color: colours.warning } }], layout: baseLayout(PLOT_META[type].title, 'time', `Fano(${summary.name})`) };
    }
    if (type === 'autocorrelation') {
      const evidence = autocorrelation(result.trajectories[0][stateIndex], 50);
      return { traces: [{ x: evidence.lags, y: evidence.correlations, type: 'bar', name: 'autocorrelation', marker: { color: colours.brand } }], layout: Object.assign(baseLayout(PLOT_META[type].title, 'observation lag', 'correlation'), { yaxis: { title: 'correlation', range: [-1, 1], gridcolor: '#e8eef2' } }) };
    }
    if (type === 'zero-risk') {
      const risk = times.map(function (_, timeIndex) { return result.trajectories.filter(function (trajectory) { return trajectory[stateIndex][timeIndex] <= 0; }).length / result.runs; });
      return { traces: [{ x: times, y: risk, type: 'scatter', mode: 'lines', name: 'empirical zero-state risk', line: { width: 3, color: colours.warning } }], layout: Object.assign(baseLayout(PLOT_META[type].title, 'time', 'fraction at zero'), { yaxis: { title: 'fraction at zero', range: [0, 1], gridcolor: '#e8eef2' } }) };
    }
    if (type === 'zero-passage') {
      const evidence = zeroPassageEvidence(result, stateIndex);
      const layout = Object.assign(baseLayout(PLOT_META[type].title, 'first observed zero time', 'empirical cumulative fraction'), { yaxis: { title: 'empirical cumulative fraction', range: [0, 1], gridcolor: '#e8eef2' } });
      if (!evidence.firstTimes.length) layout.annotations = [{ text: 'No trajectory reached zero within the configured horizon.', xref: 'paper', yref: 'paper', x: .5, y: .5, showarrow: false }];
      return { traces: evidence.firstTimes.length ? [{ x: evidence.firstTimes, y: evidence.cdf, type: 'scatter', mode: 'lines+markers', line: { shape: 'hv', width: 2.5, color: colours.warning }, name: 'first-zero CDF' }] : [], layout };
    }
    if (type === 'deviation-matrix') {
      const pathLimit = Math.min(60, result.trajectories.length);
      const stride = Math.max(1, Math.ceil(times.length / 180));
      const x = times.filter(function (_, index) { return index % stride === 0; });
      const z = result.trajectories.slice(0, pathLimit).map(function (trajectory) { return trajectory[stateIndex].filter(function (_, index) { return index % stride === 0; }).map(function (value, index) { return value - summary.mean[index * stride]; }); });
      return { traces: [{ x, y: Array.from({ length: pathLimit }, function (_, index) { return index + 1; }), z, type: 'heatmap', colorscale: 'RdBu', zmid: 0, colorbar: { title: 'path − mean' } }], layout: baseLayout(PLOT_META[type].title, 'time', 'trajectory') };
    }
    return {
      traces: [{ x: result.eventCounts, type: 'histogram', name: 'Events', marker: { color: colours.brand }, opacity: 0.82, nbinsx: Math.min(50, Math.max(8, Math.round(Math.sqrt(result.runs)))) }],
      layout: baseLayout(PLOT_META['event-counts'].title, 'executed events per trajectory', 'trajectory count'),
    };
  }

  function renderPlot(side) {
    if (!state.result) return Promise.resolve();
    const node = $(`${side}Plot`);
    if (!node) return Promise.resolve();
    const type = state.plotType[side];
    const payload = plotPayload(type);
    $(`${side}PlotTitle`).textContent = PLOT_META[type].title;
    $(`${side}PlotEvidence`).textContent = PLOT_META[type].evidence;
    return root.FokoPlotLifecycle.render(node, payload.traces, payload.layout, { responsive: true, displaylogo: false, scrollZoom: false });
  }

  function visiblePlotSides() {
    const grid = $('plotGrid');
    if (!grid || grid.dataset.layout !== 'focus') return ['left', 'right'];
    return [state.focusSide === 'right' ? 'right' : 'left'];
  }

  function renderAllPlots() {
    if (!state.result) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { visiblePlotSides().forEach(renderPlot); }); });
  }

  function applyLayout(mode, focusSide, persist) {
    const safeMode = VALID_LAYOUTS.has(mode) ? mode : 'two';
    const safeSide = VALID_SIDES.has(focusSide) ? focusSide : 'left';
    state.preferredLayout = safeMode;
    state.focusSide = safeSide;
    const report = root.FokoLayoutStability.apply({
      grid: $('plotGrid'),
      preferred: state.preferredLayout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2
    });
    if (persist) localStorage.setItem(LAYOUT_KEY, JSON.stringify({ mode: safeMode, focusSide: safeSide }));
    if (state.result) renderAllPlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('stochastic');
    return report;
  }

  function currentExportSide() {
    return $('plotGrid').dataset.layout === 'focus' ? state.focusSide : 'left';
  }

  function exportPlot(side, format) {
    if (!state.result) return setError(new Error('Run an ensemble before exporting a plot.'));
    const safeSide = VALID_SIDES.has(side) ? side : currentExportSide();
    root.Plotly.downloadImage($(`${safeSide}Plot`), { format, filename: `fokolab-stochastic-${state.plotType[safeSide]}-${state.selectedVariable}`, scale: format === 'png' ? 3 : 1 });
  }

  function configBundle() {
    readEditorIntoModel();
    return {
      release: '72.48.0',
      lab: 'stochastic',
      note: 'Configuration only. No computed trajectory or Monte Carlo claim is preserved.',
      currentName: state.currentName,
      model: clone(state.model),
      settings: simulationSettings(),
      selectedVariable: state.selectedVariable,
      plotType: clone(state.plotType),
      layout: { mode: state.preferredLayout, focusSide: state.focusSide },
    };
  }

  function restoreBundle(bundle, source) {
    if (!bundle || bundle.lab !== 'stochastic' || !bundle.model) throw new Error('The supplied configuration is not a Foko Lab stochastic session.');
    state.currentName = PRESETS[bundle.currentName] ? bundle.currentName : 'Custom CTMC';
    state.model = clone(bundle.model);
    state.selectedVariable = bundle.selectedVariable || state.model.stateNames[0];
    renderPresetLibrary();
    renderEditor();
    const settings = bundle.settings || {};
    ['T0', 'T1', 'Points', 'Runs', 'Seed', 'MaxEvents'].forEach(function (suffix) {
      const key = suffix.charAt(0).toLowerCase() + suffix.slice(1);
      if (settings[key] != null) $(`stochastic${suffix}`).value = settings[key];
    });
    if (bundle.plotType) state.plotType = Object.assign(state.plotType, bundle.plotType);
    if (bundle.layout) applyLayout(bundle.layout.mode, bundle.layout.focusSide, false);
    updateVariableOptions();
    clearComputedEvidence(`${source || 'Configuration'} restored. Re-run the ensemble to regenerate evidence.`);
  }

  function summaryCsv() {
    const result = state.result;
    const summary = selectedSummary();
    const rows = ['time,mean,q05,median,q95,variance'];
    result.times.forEach(function (time, index) {
      rows.push([time, summary.mean[index], summary.low[index], summary.median[index], summary.high[index], summary.variance[index]].join(','));
    });
    return rows.join('\n');
  }

  function finalCsv() {
    const result = state.result;
    const rows = [`run,${result.stateNames.join(',')},event_count,truncated`];
    result.finalStates.forEach(function (values, index) {
      rows.push([index + 1].concat(values, result.eventCounts[index], result.eventCounts[index] >= result.maxEvents ? 1 : 0).join(','));
    });
    return rows.join('\n');
  }

  function pythonExport() {
    readEditorIntoModel();
    const settings = simulationSettings();
    const model = state.model;
    const reactions = model.reactions.map(function (reaction) {
      const change = model.stateNames.map(function (name) { return Number(reaction.change[name]) || 0; });
      return `    {"name": ${JSON.stringify(reaction.name)}, "propensity": ${JSON.stringify(reaction.propensity.replace(/\^/g, '**'))}, "change": np.array(${JSON.stringify(change)}, dtype=int)},`;
    }).join('\n');
    return `"""Independent Python validation starter for Foko Lab v72.48.0.\nUses NumPy's RNG, so trajectories are distributionally comparable but not bitwise identical to browser xorshift32 streams.\nThe direct method below assumes time-homogeneous propensities.\n"""\nimport math\nimport numpy as np\n\nSTATE_NAMES = ${JSON.stringify(model.stateNames)}\nINITIAL = np.array(${JSON.stringify(model.initial)}, dtype=int)\nPARAMS = ${JSON.stringify(model.params, null, 2)}\nREACTIONS = [\n${reactions}\n]\nT0, T1 = ${settings.t0}, ${settings.t1}\nPOINTS, RUNS, BASE_SEED = ${settings.points}, ${settings.runs}, ${settings.seed}\nMAX_EVENTS = ${settings.maxEvents}\nTIMES = np.linspace(T0, T1, POINTS)\n\ndef propensity(expr, state):\n    scope = {name: float(state[i]) for i, name in enumerate(STATE_NAMES)}\n    scope.update(PARAMS)\n    scope.update({"exp": math.exp, "log": math.log, "sqrt": math.sqrt, "abs": abs, "min": min, "max": max})\n    value = float(eval(expr, {"__builtins__": {}}, scope))\n    if not np.isfinite(value) or value < -1e-12:\n        raise ValueError(f"invalid propensity {expr}: {value}")\n    return max(0.0, value)\n\ndef simulate(seed):\n    rng = np.random.default_rng(seed)\n    state = INITIAL.copy()\n    out = np.empty((len(STATE_NAMES), len(TIMES)), dtype=int)\n    out[:, 0] = state\n    time = TIMES[0]\n    events = 0\n    for j, target in enumerate(TIMES[1:], start=1):\n        while time < target and events < MAX_EVENTS:\n            rates = np.array([propensity(r["propensity"], state) for r in REACTIONS])\n            total = rates.sum()\n            if total <= 0:\n                time = target\n                break\n            waiting = rng.exponential(1.0 / total)\n            if time + waiting > target:\n                time = target\n                break\n            time += waiting\n            reaction = rng.choice(len(REACTIONS), p=rates / total)\n            candidate = state + REACTIONS[reaction]["change"]\n            if np.any(candidate < 0):\n                raise ValueError("negative state: check propensity guards")\n            state = candidate\n            events += 1\n        out[:, j] = state\n    return out, events\n\nensemble = [simulate(BASE_SEED + i) for i in range(RUNS)]\npaths = np.stack([item[0] for item in ensemble])\nprint("final means", dict(zip(STATE_NAMES, paths[:, :, -1].mean(axis=0))))\nprint("mean events", np.mean([item[1] for item in ensemble]))\n`;
  }

  function addState() {
    readEditorIntoModel();
    let index = state.model.stateNames.length + 1;
    let name = `X${index}`;
    while (state.model.stateNames.includes(name)) { index += 1; name = `X${index}`; }
    state.model.stateNames.push(name);
    state.model.initial.push(0);
    state.model.reactions.forEach(function (reaction) { reaction.change[name] = 0; });
    state.model.meanField = null;
    renderEditor();
    clearComputedEvidence('State added. The curated mean-field overlay was removed; re-run after completing the model.');
  }

  function addParameter() {
    readEditorIntoModel();
    let index = Object.keys(state.model.params).length + 1;
    let name = `p${index}`;
    while (Object.prototype.hasOwnProperty.call(state.model.params, name)) { index += 1; name = `p${index}`; }
    state.model.params[name] = 1;
    renderEditor();
    clearComputedEvidence('Parameter added. Re-run to regenerate evidence.');
  }

  function addReaction() {
    readEditorIntoModel();
    const change = {};
    state.model.stateNames.forEach(function (name) { change[name] = 0; });
    state.model.reactions.push({ name: `reaction_${state.model.reactions.length + 1}`, propensity: '0', change });
    state.model.meanField = null;
    renderEditor();
    clearComputedEvidence('Reaction added. The curated mean-field overlay was removed; re-run after completing the event.');
  }

  function importStochasticFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const bundle = parsed && parsed.lab === 'stochastic' ? parsed : {
          release: RELEASE, lab: 'stochastic', currentName: 'Custom CTMC', model: parsed,
          settings: simulationSettings(), selectedVariable: parsed && parsed.stateNames ? parsed.stateNames[0] : null,
          plotType: clone(state.plotType), layout: { mode: 'two', focusSide: 'left' }
        };
        restoreBundle(bundle, 'Imported JSON');
      } catch (error) { setError(new Error('Could not import stochastic JSON: ' + error.message)); }
      $('stochasticImport').value = '';
    };
    reader.onerror = function () { setError(new Error('Could not read the selected stochastic file.')); };
    reader.readAsText(file);
  }

  function installEvents() {
    $('runStochastic').addEventListener('click', runEnsemble);
    $('resetStochastic').addEventListener('click', function () { loadPreset(state.currentName, false); });
    $('loadStochastic').addEventListener('click', function () { loadPreset($('stochasticSelect').value, true); });
    $('stochasticSelect').addEventListener('change', function () { loadPreset(this.value, true); });
    $('stochasticImport').addEventListener('change', function () { importStochasticFile(this.files && this.files[0]); });
    $('stochasticDeck').addEventListener('click', function (event) {
      const button = event.target.closest('[data-preset]');
      if (button) loadPreset(button.dataset.preset, true);
    });
    $('addStochasticState').addEventListener('click', addState);
    $('addStochasticParam').addEventListener('click', addParameter);
    $('addStochasticReaction').addEventListener('click', addReaction);

    $('modelBlock').addEventListener('input', function (event) {
      markStructuralEdit(event.target);
      clearComputedEvidence('Model edited. Re-run the ensemble to regenerate evidence.');
    });
    $('modelBlock').addEventListener('click', function (event) {
      const stateIndex = event.target.dataset.deleteState;
      const paramIndex = event.target.dataset.deleteParam;
      const reactionIndex = event.target.dataset.deleteReaction;
      if (stateIndex != null) {
        readEditorIntoModel();
        if (state.model.stateNames.length <= 1) return setError(new Error('A CTMC requires at least one state.'));
        const removed = state.model.stateNames.splice(Number(stateIndex), 1)[0];
        state.model.initial.splice(Number(stateIndex), 1);
        state.model.reactions.forEach(function (reaction) { delete reaction.change[removed]; });
        state.model.meanField = null;
        renderEditor();
        clearComputedEvidence('State deleted. The curated mean-field overlay was removed.');
      } else if (paramIndex != null) {
        readEditorIntoModel();
        const key = Object.keys(state.model.params)[Number(paramIndex)];
        delete state.model.params[key];
        renderEditor();
        clearComputedEvidence('Parameter deleted. Check all propensity expressions before running.');
      } else if (reactionIndex != null) {
        readEditorIntoModel();
        if (state.model.reactions.length <= 1) return setError(new Error('A CTMC requires at least one reaction.'));
        state.model.reactions.splice(Number(reactionIndex), 1);
        state.model.meanField = null;
        renderEditor();
        clearComputedEvidence('Reaction deleted. The curated mean-field overlay was removed.');
      }
    });

    ['stochasticT0', 'stochasticT1', 'stochasticPoints', 'stochasticRuns', 'stochasticSeed', 'stochasticMaxEvents'].forEach(function (id) {
      $(id).addEventListener('input', function () { clearComputedEvidence('Simulation settings changed. Re-run to regenerate evidence.'); });
    });
    $('stochasticVariable').addEventListener('change', function () {
      state.selectedVariable = this.value;
      $('stochasticVariableMirror').value = this.value;
      if (state.result) { applyResult(); }
    });
    $('stochasticVariableMirror').addEventListener('change', function () {
      state.selectedVariable = this.value;
      $('stochasticVariable').value = this.value;
      if (state.result) { applyResult(); }
    });

    ['left', 'right'].forEach(function (side) {
      $(`${side}PlotType`).addEventListener('change', function () { state.plotType[side] = this.value; renderPlot(side); });
    });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) {
      button.addEventListener('click', function () { applyLayout(button.dataset.layoutMode, state.focusSide, true); });
    });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) {
      if (button.classList.contains('focus-card')) button.addEventListener('click', function () { applyLayout('focus', button.dataset.focusSide, true); });
    });
    document.querySelectorAll('[data-export-side]').forEach(function (button) { button.addEventListener('click', function () { exportPlot(button.dataset.exportSide, 'png'); }); });
    $('exportStochasticPng').addEventListener('click', function () { exportPlot(currentExportSide(), 'png'); });
    $('exportStochasticSvg').addEventListener('click', function () { exportPlot(currentExportSide(), 'svg'); });

    $('saveStochasticSession').addEventListener('click', function () {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(configBundle())); $('stochasticStatus').textContent = 'Configuration saved locally. Computed evidence was not stored.'; } catch (error) { setError(error); }
    });
    $('restoreStochasticSession').addEventListener('click', function () {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (!saved) throw new Error('No saved stochastic configuration exists in this browser.');
        restoreBundle(saved, 'Saved configuration');
      } catch (error) { setError(error); }
    });
    $('copyStochasticShareUrl').addEventListener('click', function () {
      try {
        const url = `${location.origin}${location.pathname}#state=${encodeState(configBundle())}`;
        navigator.clipboard.writeText(url).then(function () { $('stochasticStatus').textContent = 'Configuration-only share URL copied.'; }).catch(function () { prompt('Copy this configuration-only URL:', url); });
      } catch (error) { setError(error); }
    });
    $('exportStochasticSummary').addEventListener('click', function () { if (state.result) downloadText(`stochastic-${state.selectedVariable}-summary.csv`, summaryCsv(), 'text/csv'); else setError(new Error('Run an ensemble before exporting summary data.')); });
    $('exportStochasticFinal').addEventListener('click', function () { if (state.result) downloadText('stochastic-final-states.csv', finalCsv(), 'text/csv'); else setError(new Error('Run an ensemble before exporting final states.')); });
    $('exportStochasticJson').addEventListener('click', function () { if (state.result) downloadText('stochastic-result.json', JSON.stringify({ config: configBundle(), result: state.result, meanField: state.meanField }, null, 2), 'application/json'); else setError(new Error('Run an ensemble before exporting a result.')); });
    $('exportStochasticModel').addEventListener('click', function () { try { downloadText('stochastic-model.json', JSON.stringify(configBundle().model, null, 2), 'application/json'); } catch (error) { setError(error); } });
    $('exportStochasticPython').addEventListener('click', function () { try { downloadText('validate_stochastic_model.py', pythonExport(), 'text/x-python'); } catch (error) { setError(error); } });

    document.querySelectorAll('[data-jump]').forEach(function (button) { button.addEventListener('click', function () { const target = document.querySelector(button.dataset.jump); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    window.addEventListener('resize', function () { applyLayout(state.preferredLayout, state.focusSide, false); });
  }

  function restoreInitialState() {
    try {
      const savedLayout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
      if (savedLayout) {
        state.preferredLayout = VALID_LAYOUTS.has(savedLayout.mode) ? savedLayout.mode : 'two';
        state.focusSide = VALID_SIDES.has(savedLayout.focusSide) ? savedLayout.focusSide : 'left';
      }
    } catch (_) { /* default layout */ }
    const hashMatch = location.hash.match(/(?:^#|&)state=([^&]+)/);
    const shared = hashMatch ? decodeState(hashMatch[1]) : null;
    if (shared) {
      restoreBundle(shared, 'Shared configuration');
      return;
    }
    const query = new URLSearchParams(location.search);
    loadPreset(query.get('example') || CORE_PRESETS[0], false);
  }

  function initialise() {
    installEvents();
    const hasSharedState = /(?:^#|&)state=/.test(location.hash);
    restoreInitialState();
    updateAvailablePlots();
    applyLayout(state.preferredLayout, state.focusSide, false);
    const query = new URLSearchParams(location.search);
    if (!hasSharedState && query.get('autorun') !== '0') root.setTimeout(runEnsemble, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise);
  else initialise();
}(typeof window !== 'undefined' ? window : globalThis));
