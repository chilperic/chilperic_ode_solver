/* Foko Lab v72.3 Optimization workspace controller.
 * Authored layout only: no post-load DOM relocation or observer-based repair.
 * Scientific computation is delegated to the pure FokoOptimizationCore.
 */
(function (root) {
  'use strict';

  const CORE = root.FokoOptimizationCore;
  const PRESETS = root.FokoOptimizationPresets || {};
  const STORAGE_KEY = 'fokolab:v72:optimization-session';
  const LAYOUT_KEY = 'fokolab:v72:optimization-layout';
  const PLOT_SIDES = ['left', 'right'];
  const LAYOUTS = new Set(['two', 'focus']);
  const ALLOWED_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'exp', 'log', 'sqrt', 'abs', 'min', 'max', 'pow', 'floor', 'ceil', 'round', 'tanh', 'sinh', 'cosh']);
  const ALLOWED_NODE_TYPES = new Set(['OperatorNode', 'ParenthesisNode', 'SymbolNode', 'ConstantNode', 'FunctionNode']);
  const TAXONOMY = root.FokoAnalysisTaxonomy || null;
  const PLOT_META = {
    landscape: { label: 'Loss contour map', status: 'browser-computed' },
    'penalized-landscape': { label: 'Penalized landscape', status: 'browser-computed' },
    'violation-map': { label: 'Constraint-violation map', status: 'browser-computed' },
    'feasible-region': { label: 'Finite-grid feasible region', status: 'limited-browser' },
    convergence: { label: 'Convergence curve', status: 'browser-computed' },
    'constraint-history': { label: 'Constraint violation plot', status: 'browser-computed' },
    variables: { label: 'Parameter trajectory plot', status: 'browser-computed' },
    'step-length': { label: 'Step size evolution plot', status: 'browser-computed' },
    'gradient-norm': { label: 'Gradient norm plot', status: 'limited-browser' },
    'local-sensitivity': { label: 'Local sensitivity bar plot', status: 'limited-browser' },
    'bound-distance': { label: 'Distance to nearest bound', status: 'derived-browser' },
    'objective-distribution': { label: 'Evaluated-objective distribution', status: 'derived-browser' },
    'parallel-coordinates': { label: 'Parallel coordinates plot', status: 'browser-computed' },
    'hessian-spectrum': { label: 'Hessian spectrum plot', status: 'limited-browser' },
    'constraint-profile': { label: 'Candidate constraint profile', status: 'derived-browser' },
    feasibility: { label: 'Objective vs violation', status: 'browser-computed' },
    samples: { label: 'Multi-start basin / candidate projection', status: 'limited-browser' },
    pareto: { label: 'Finite-sample Pareto frontier', status: 'limited-browser' },
    'dominance-heatmap': { label: 'Dominance heatmap', status: 'derived-browser' },
    'crowding-distance': { label: 'Crowding distance plot', status: 'derived-browser' },
    'hypervolume-convergence': { label: 'Hypervolume convergence plot', status: 'limited-browser' },
    'objective-correlation': { label: 'Objective correlation heatmap', status: 'derived-browser' },
    'knee-point': { label: 'Knee point detection plot', status: 'limited-browser' },
  };
  root.FokoOptimizationPlotMeta = PLOT_META;

  const state = {
    currentName: Object.keys(PRESETS)[0] || '',
    model: null,
    result: null,
    landscape: null,
    pareto: null,
    compiledProblem: null,
    layout: 'two',
    focusSide: 'left',
    plotTypes: { left: 'landscape', right: 'convergence' },
  };

  function $(id) { return document.getElementById(id); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function format(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    if (number === 0) return '0';
    const abs = Math.abs(number);
    if (abs >= 1e5 || abs < 1e-4) return number.toExponential(digits == null ? 3 : digits);
    return number.toLocaleString(undefined, { maximumSignificantDigits: digits == null ? 6 : digits });
  }
  function setText(id, value) { const node = $(id); if (node) node.textContent = value == null || value === '' ? '—' : String(value); }
  function safeParse(value) { try { return JSON.parse(value); } catch (_) { return null; } }
  function encodeState(value) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function decodeState(value) {
    try {
      let token = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
      while (token.length % 4) token += '=';
      return JSON.parse(decodeURIComponent(escape(atob(token))));
    } catch (_) { return null; }
  }
  function normaliseSymbol(value) {
    const clean = String(value || '').trim();
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(clean) ? clean : '';
  }
  function expressionLines(value) {
    return String(value || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  }

  function loadPreset(name, updateUrl) {
    const names = Object.keys(PRESETS);
    const selected = PRESETS[name] ? name : names[0];
    state.currentName = selected;
    state.model = clone(PRESETS[selected]);
    if (updateUrl) history.replaceState(null, '', `?example=${encodeURIComponent(selected)}`);
    renderPresetLibrary();
    renderTaxonomyCatalog();
    renderEditor();
    applyModelSettings();
    clearComputedEvidence('Example loaded. No optimization result has been computed.');
  }

  function renderPresetLibrary() {
    const names = Object.keys(PRESETS);
    const select = $('optimizationSelect');
    select.innerHTML = names.map(function (name) {
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    select.value = state.currentName;

    const familySelect = $('optimizationFamilyFilter');
    if (familySelect) {
      const families = Array.from(new Set(names.map(function (name) { return PRESETS[name].family || 'Other'; }))).sort();
      const previous = familySelect.value || 'all';
      familySelect.innerHTML = '<option value="all">All families</option>' + families.map(function (family) { return `<option value="${escapeHtml(family)}">${escapeHtml(family)}</option>`; }).join('');
      familySelect.value = families.includes(previous) ? previous : 'all';
    }
    const query = $('optimizationExampleSearch') ? String($('optimizationExampleSearch').value || '').trim().toLowerCase() : '';
    const family = familySelect ? familySelect.value : 'all';
    const filtered = names.filter(function (name) {
      const preset = PRESETS[name];
      const haystack = [name, preset.title, preset.family, preset.narrative, preset.scientificNote].filter(Boolean).join(' ').toLowerCase();
      return (family === 'all' || preset.family === family) && (!query || haystack.includes(query));
    });
    if ($('optimizationExampleCount')) $('optimizationExampleCount').textContent = `${filtered.length} of ${names.length} examples`;
    $('optimizationDeck').innerHTML = filtered.length ? filtered.map(function (name) {
      const preset = PRESETS[name];
      const multi = preset.objective2 ? '<span class="preset-tag">multi-objective</span>' : '';
      return `<button class="model-card ${name === state.currentName ? 'active' : ''}" data-preset="${escapeHtml(name)}" type="button"><b>${escapeHtml(name)}</b><small>${escapeHtml(preset.family)}</small>${multi}<span class="preset-action">Load</span></button>`;
    }).join('') : '<p class="field-help">No optimization example matches this filter.</p>';
    setText('optimizationNarrative', state.model.narrative || '');
    setText('optimizationScientificNote', state.model.scientificNote || '');
    setText('optimizationFamily', state.model.family || 'Optimization model');
    setText('optimizationTitle', state.model.title || state.currentName);
  }


  function statusLabel(status) {
    return String(status || 'unavailable').replace(/-/g, ' ');
  }

  function renderTaxonomyCatalog() {
    const summary = $('optimizationTaxonomySummary');
    const catalog = $('optimizationTaxonomyCatalog');
    if (!summary || !catalog || !TAXONOMY) return;
    const groups = [
      ['Optimization plots', TAXONOMY.optimization.plots],
      ['Optimization problems', TAXONOMY.optimization.problems],
      ['Multi-objective plots', TAXONOMY.multiObjective.plots],
      ['Multi-objective problems', TAXONOMY.multiObjective.problems],
    ];
    const all = groups.flatMap(function (group) { return group[1]; });
    const active = all.filter(function (entry) { return ['browser-computed', 'derived-browser', 'limited-browser'].includes(entry.status); }).length;
    summary.textContent = `${active} of ${all.length} taxonomy entries have a browser-computed or explicitly limited route.`;
    catalog.innerHTML = groups.map(function (group) {
      return `<details><summary>${escapeHtml(group[0])} · ${group[1].length}</summary><div class="capability-list">${group[1].map(function (entry) {
        const note = entry.scope || entry.reason || '';
        return `<article class="capability-row" data-capability-status="${escapeHtml(entry.status)}"><div><b>${escapeHtml(entry.label)}</b><small>${escapeHtml(note)}</small></div><span>${escapeHtml(statusLabel(entry.status))}</span></article>`;
      }).join('')}</div></details>`;
    }).join('');
  }

  function renderEditor() {
    $('optimizationVariables').innerHTML = '<div class="variable-head"><span>Variable</span><span>Start</span><span>Lower</span><span>Upper</span><span></span></div>' + state.model.variables.map(function (variable, index) {
      return `<div class="variable-row" data-variable-row="${index}"><input class="opt-variable-name" aria-label="Variable name" value="${escapeHtml(variable.name)}"/><input class="opt-variable-start" aria-label="Start for ${escapeHtml(variable.name)}" type="number" step="any" value="${escapeHtml(variable.start)}"/><input class="opt-variable-lower" aria-label="Lower bound for ${escapeHtml(variable.name)}" type="number" step="any" value="${escapeHtml(variable.lower)}"/><input class="opt-variable-upper" aria-label="Upper bound for ${escapeHtml(variable.name)}" type="number" step="any" value="${escapeHtml(variable.upper)}"/><button class="delete" data-delete-variable="${index}" aria-label="Delete ${escapeHtml(variable.name)}" type="button">×</button></div>`;
    }).join('');
    $('optimizationObjective').value = state.model.objective || '';
    $('optimizationObjective2').value = state.model.objective2 || '';
    $('optimizationInequalities').value = (state.model.inequalities || []).join('\n');
    $('optimizationEqualities').value = (state.model.equalities || []).join('\n');
    $('optimizationSense').value = state.model.sense || 'minimize';
    renderExpressionPreview();
  }

  function applyModelSettings() {
    $('optimizationAlgorithm').value = state.model.algorithm || 'coordinate';
    $('optimizationIterations').value = state.model.settings && state.model.settings.iterations || 180;
    $('optimizationPopulation').value = state.model.settings && state.model.settings.population || 36;
    $('optimizationStarts').value = state.model.settings && state.model.settings.starts || 16;
    $('optimizationSeed').value = state.model.settings && state.model.settings.seed || 1729;
    $('optimizationPenalty').value = state.model.settings && state.model.settings.penalty || 1000;
    $('optimizationFeasibilityTolerance').value = state.model.settings && state.model.settings.feasibilityTolerance || 1e-6;
    $('optimizationStepTolerance').value = state.model.settings && state.model.settings.stepTolerance || 1e-7;
    $('optimizationParetoSamples').value = state.model.settings && state.model.settings.paretoSamples || 1200;
  }

  function readEditorIntoModel() {
    const rows = Array.from(document.querySelectorAll('[data-variable-row]'));
    if (!rows.length) throw new Error('At least one decision variable is required.');
    if (rows.length > 20) throw new Error('The browser reference lab is limited to 20 decision variables.');
    const variables = rows.map(function (row, index) {
      const name = normaliseSymbol(row.querySelector('.opt-variable-name').value);
      if (!name) throw new Error(`Variable ${index + 1} requires a valid symbol.`);
      const start = Number(row.querySelector('.opt-variable-start').value);
      const lower = Number(row.querySelector('.opt-variable-lower').value);
      const upper = Number(row.querySelector('.opt-variable-upper').value);
      if (![start, lower, upper].every(Number.isFinite)) throw new Error(`Bounds and start for ${name} must be finite.`);
      if (!(upper > lower)) throw new Error(`Upper bound for ${name} must exceed its lower bound.`);
      return { name, start, lower, upper };
    });
    const names = variables.map(function (variable) { return variable.name; });
    if (new Set(names).size !== names.length) throw new Error('Decision-variable names must be unique.');
    const objective = $('optimizationObjective').value.trim();
    if (!objective) throw new Error('A primary objective expression is required.');
    state.model.variables = variables;
    state.model.objective = objective;
    state.model.objective2 = $('optimizationObjective2').value.trim();
    state.model.inequalities = expressionLines($('optimizationInequalities').value);
    state.model.equalities = expressionLines($('optimizationEqualities').value);
    state.model.sense = $('optimizationSense').value === 'maximize' ? 'maximize' : 'minimize';
    state.model.algorithm = $('optimizationAlgorithm').value;
    state.model.settings = readSettings();
    renderExpressionPreview();
  }

  function validateExpression(expression, allowedSymbols, label) {
    let node;
    try { node = root.math.parse(expression); } catch (error) { throw new Error(`${label} cannot be parsed: ${error.message}`); }
    const badSymbols = [];
    const badNodes = [];
    node.traverse(function (child) {
      if (!ALLOWED_NODE_TYPES.has(child.type)) badNodes.push(child.type);
      if (child.isSymbolNode && !allowedSymbols.has(child.name) && !ALLOWED_FUNCTIONS.has(child.name) && child.name !== 'pi' && child.name !== 'e') badSymbols.push(child.name);
      if (child.isFunctionNode) {
        const functionName = child.fn && child.fn.name ? child.fn.name : '';
        if (!ALLOWED_FUNCTIONS.has(functionName)) badSymbols.push(functionName || 'anonymous function');
      }
    });
    if (badNodes.length) throw new Error(`${label} uses unsupported syntax: ${Array.from(new Set(badNodes)).join(', ')}.`);
    if (badSymbols.length) throw new Error(`${label} contains unsupported symbol(s): ${Array.from(new Set(badSymbols)).join(', ')}.`);
    return node.compile();
  }

  function compileProblem() {
    readEditorIntoModel();
    const variables = state.model.variables.map(function (variable) { return Object.assign({}, variable); });
    const names = variables.map(function (variable) { return variable.name; });
    const allowed = new Set(names.concat(['pi', 'e']));
    const primary = validateExpression(state.model.objective, allowed, 'Primary objective');
    const secondary = state.model.objective2 ? validateExpression(state.model.objective2, allowed, 'Secondary objective') : null;
    const inequalities = state.model.inequalities.map(function (expression, index) {
      return { expression, compiled: validateExpression(expression, allowed, `Inequality ${index + 1}`) };
    });
    const equalities = state.model.equalities.map(function (expression, index) {
      return { expression, compiled: validateExpression(expression, allowed, `Equality ${index + 1}`) };
    });
    function scope(x) {
      const result = {};
      names.forEach(function (name, index) { result[name] = x[index]; });
      return result;
    }
    return {
      variables,
      sense: state.model.sense,
      objective: function (x) { return Number(primary.evaluate(scope(x))); },
      secondaryObjective: secondary ? function (x) { return Number(secondary.evaluate(scope(x))); } : null,
      inequalities: inequalities.map(function (item) { return function (x) { return Number(item.compiled.evaluate(scope(x))); }; }),
      equalities: equalities.map(function (item) { return function (x) { return Number(item.compiled.evaluate(scope(x))); }; }),
    };
  }

  function readSettings() {
    return {
      algorithm: $('optimizationAlgorithm').value,
      maxIterations: Number($('optimizationIterations').value),
      populationSize: Number($('optimizationPopulation').value),
      starts: Number($('optimizationStarts').value),
      seed: Number($('optimizationSeed').value),
      penalty: Number($('optimizationPenalty').value),
      feasibilityTolerance: Number($('optimizationFeasibilityTolerance').value),
      stepTolerance: Number($('optimizationStepTolerance').value),
      paretoSamples: Number($('optimizationParetoSamples').value),
      stallIterations: 30,
      recordLimit: 12000,
    };
  }

  function renderExpressionPreview() {
    if (!state.model) return;
    const target = $('optimizationPreview');
    if (!target) return;
    function texExpression(expression) {
      try { return root.math.parse(expression).toTex({ parenthesis: 'keep' }); }
      catch (_) { return String(expression || '').replace(/_/g, '\\_').replace(/\*/g, '\\cdot '); }
    }
    const lines = [`${state.model.sense === 'maximize' ? '\\max' : '\\min'}\\; ${texExpression(state.model.objective || 'f(x)')}`];
    (state.model.inequalities || []).forEach(function (value) { lines.push(`${texExpression(value)} \\le 0`); });
    (state.model.equalities || []).forEach(function (value) { lines.push(`${texExpression(value)} = 0`); });
    const source = `\\begin{aligned}${lines.map(function (line) { return `&${line}`; }).join('\\\\[4pt]')}\\end{aligned}`;
    root.FokoMathRender.render(target, source, { displayMode: true });
  }

  function runOptimization() {
    if (!CORE) return showError(new Error('FokoOptimizationCore is unavailable.'));
    $('runOptimization').disabled = true;
    setStatus('Validating model and computing candidates…', false);
    $('optimizationProgress').style.width = '35%';
    setTimeout(function () {
      try {
        const problem = compileProblem();
        const settings = readSettings();
        state.compiledProblem = problem;
        state.result = CORE.optimise(problem, settings);
        state.landscape = problem.variables.length === 2 ? CORE.landscape(problem, Object.assign({}, settings, { resolution: 45 })) : null;
        state.pareto = problem.secondaryObjective ? CORE.paretoSample(problem, Object.assign({}, settings, { samples: settings.paretoSamples })) : null;
        $('optimizationProgress').style.width = '100%';
        updatePlotSelectors();
        renderAllPlots();
        renderEvidence();
        setTimeout(function () { $('optimizationProgress').style.width = '0'; }, 450);
      } catch (error) {
        showError(error);
      } finally {
        $('runOptimization').disabled = false;
      }
    }, 20);
  }

  function availablePlotTypes() {
    if (!state.result) return [];
    const options = [];
    if (state.landscape) {
      options.push(['landscape', PLOT_META.landscape.label]);
      options.push(['penalized-landscape', PLOT_META['penalized-landscape'].label]);
      options.push(['violation-map', PLOT_META['violation-map'].label]);
      options.push(['feasible-region', PLOT_META['feasible-region'].label]);
    }
    options.push(['convergence', PLOT_META.convergence.label]);
    options.push(['constraint-history', PLOT_META['constraint-history'].label]);
    options.push(['variables', PLOT_META.variables.label]);
    options.push(['step-length', PLOT_META['step-length'].label]);
    options.push(['gradient-norm', PLOT_META['gradient-norm'].label]);
    options.push(['local-sensitivity', PLOT_META['local-sensitivity'].label]);
    options.push(['bound-distance', PLOT_META['bound-distance'].label]);
    options.push(['objective-distribution', PLOT_META['objective-distribution'].label]);
    options.push(['parallel-coordinates', PLOT_META['parallel-coordinates'].label]);
    options.push(['hessian-spectrum', PLOT_META['hessian-spectrum'].label]);
    options.push(['constraint-profile', PLOT_META['constraint-profile'].label]);
    options.push(['feasibility', PLOT_META.feasibility.label]);
    if (state.result.problem.names.length >= 2) options.push(['samples', PLOT_META.samples.label]);
    if (state.pareto) {
      options.push(['pareto', PLOT_META.pareto.label]);
      options.push(['dominance-heatmap', PLOT_META['dominance-heatmap'].label]);
      options.push(['crowding-distance', PLOT_META['crowding-distance'].label]);
      options.push(['hypervolume-convergence', PLOT_META['hypervolume-convergence'].label]);
      options.push(['objective-correlation', PLOT_META['objective-correlation'].label]);
      options.push(['knee-point', PLOT_META['knee-point'].label]);
    }
    return options;
  }

  function updatePlotSelectors() {
    const options = availablePlotTypes();
    const keys = options.map(function (item) { return item[0]; });
    const defaults = {
      left: state.landscape ? 'landscape' : (keys.includes('samples') ? 'samples' : 'variables'),
      right: 'convergence',
    };
    PLOT_SIDES.forEach(function (side) {
      const select = $(`${side}PlotType`);
      const preferred = keys.includes(state.plotTypes[side]) ? state.plotTypes[side] : defaults[side];
      state.plotTypes[side] = preferred;
      select.innerHTML = options.map(function (item) { return `<option value="${item[0]}">${escapeHtml(item[1])}</option>`; }).join('');
      select.value = preferred;
    });
    applyLayout();
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('optimization');
}

  function baseLayout(title, xTitle, yTitle) {
    return {
      title: { text: title, font: { size: 14 } },
      margin: { l: 62, r: 24, t: 52, b: 58 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#fbfdff',
      xaxis: { title: xTitle, gridcolor: '#dce8ef', zerolinecolor: '#b9ccd8' },
      yaxis: { title: yTitle, gridcolor: '#dce8ef', zerolinecolor: '#b9ccd8' },
      legend: { orientation: 'h', y: 1.12, x: 0 },
      hovermode: 'closest',
      autosize: true,
    };
  }

  function candidateTrace() {
    if (!state.result) return null;
    const candidate = state.result.candidate;
    return {
      x: [candidate.x[0]], y: [candidate.x[1]], mode: 'markers', name: candidate.feasible ? 'reported feasible candidate' : 'least-violating candidate',
      marker: { size: 12, symbol: 'star', line: { width: 1.5 } },
      customdata: [[candidate.objective, candidate.maxViolation]],
      hovertemplate: 'x=%{x:.5g}<br>y=%{y:.5g}<br>f=%{customdata[0]:.5g}<br>violation=%{customdata[1]:.3g}<extra></extra>',
    };
  }


  function finiteDifferenceGradient(x) {
    if (!state.compiledProblem || typeof state.compiledProblem.objective !== 'function') return [];
    return x.map(function (value, index) {
      const span = state.result.problem.upper[index] - state.result.problem.lower[index];
      const h = Math.max(1e-7, 1e-5 * Math.max(1, Math.abs(value), span));
      const plus = x.slice(), minus = x.slice();
      plus[index] = Math.min(state.result.problem.upper[index], value + h);
      minus[index] = Math.max(state.result.problem.lower[index], value - h);
      const denominator = plus[index] - minus[index];
      if (!(denominator > 0)) return 0;
      return (state.compiledProblem.objective(plus) - state.compiledProblem.objective(minus)) / denominator;
    });
  }

  function finiteDifferenceHessian(x) {
    const n = x.length;
    if (!state.compiledProblem || typeof state.compiledProblem.objective !== 'function' || n > 8) return null;
    const f = state.compiledProblem.objective;
    const H = Array.from({ length: n }, function () { return Array(n).fill(0); });
    const hs = x.map(function (value, index) { const span = state.result.problem.upper[index] - state.result.problem.lower[index]; return Math.max(1e-5, 1e-4 * Math.max(1, Math.abs(value), span)); });
    const f0 = f(x.slice());
    for (let i = 0; i < n; i += 1) {
      const hp = hs[i]; const xp=x.slice(), xm=x.slice(); xp[i]=Math.min(state.result.problem.upper[i],x[i]+hp); xm[i]=Math.max(state.result.problem.lower[i],x[i]-hp);
      const hi=Math.min(xp[i]-x[i],x[i]-xm[i]); if (!(hi>0)) continue;
      xp[i]=x[i]+hi; xm[i]=x[i]-hi; H[i][i]=(f(xp)-2*f0+f(xm))/(hi*hi);
      for (let j = i+1; j < n; j += 1) {
        const hj0=hs[j], xpp=x.slice(), xpm=x.slice(), xmp=x.slice(), xmm=x.slice();
        const hj=Math.min(Math.min(state.result.problem.upper[j]-x[j],x[j]-state.result.problem.lower[j]),hj0);
        if (!(hj>0)) continue;
        xpp[i]+=hi;xpp[j]+=hj; xpm[i]+=hi;xpm[j]-=hj; xmp[i]-=hi;xmp[j]+=hj; xmm[i]-=hi;xmm[j]-=hj;
        const value=(f(xpp)-f(xpm)-f(xmp)+f(xmm))/(4*hi*hj); H[i][j]=value;H[j][i]=value;
      }
    }
    return H;
  }

  function symmetricEigenvalues(matrix) {
    if (!matrix || !matrix.length) return [];
    const A=matrix.map(function(row){return row.slice();}); const n=A.length;
    for(let iter=0;iter<80*n*n;iter+=1){let p=0,q=1,max=0;for(let i=0;i<n;i+=1)for(let j=i+1;j<n;j+=1){const a=Math.abs(A[i][j]);if(a>max){max=a;p=i;q=j;}}if(max<1e-9)break;const phi=.5*Math.atan2(2*A[p][q],A[q][q]-A[p][p]);const c=Math.cos(phi),d=Math.sin(phi);const app=c*c*A[p][p]-2*d*c*A[p][q]+d*d*A[q][q];const aqq=d*d*A[p][p]+2*d*c*A[p][q]+c*c*A[q][q];for(let k=0;k<n;k+=1){if(k===p||k===q)continue;const akp=A[k][p],akq=A[k][q];A[k][p]=A[p][k]=c*akp-d*akq;A[k][q]=A[q][k]=d*akp+c*akq;}A[p][p]=app;A[q][q]=aqq;A[p][q]=A[q][p]=0;}
    return A.map(function(row,index){return row[index];}).sort(function(a,b){return a-b;});
  }

  function constraintValuesAt(x) {
    const values=[];
    (state.compiledProblem.inequalities||[]).forEach(function(fn,index){const raw=fn(x.slice());values.push({name:`g${index+1}`,raw,violation:Math.max(0,raw)});});
    (state.compiledProblem.equalities||[]).forEach(function(fn,index){const raw=fn(x.slice());values.push({name:`h${index+1}`,raw,violation:Math.abs(raw)});});
    return values;
  }


  function finiteParetoPoints() {
    return state.pareto ? state.pareto.points.filter(function (point) {
      return point.feasible && Number.isFinite(point.objective) && Number.isFinite(point.secondaryObjective);
    }) : [];
  }

  function orientedObjective(point) {
    return state.pareto && state.pareto.primarySense === 'maximize' ? -point.objective : point.objective;
  }

  function dominates(a, b) {
    const a0 = orientedObjective(a), b0 = orientedObjective(b);
    return a0 <= b0 && a.secondaryObjective <= b.secondaryObjective && (a0 < b0 || a.secondaryObjective < b.secondaryObjective);
  }

  function crowdingDistances(front) {
    const n = front.length;
    const distances = Array(n).fill(0);
    if (n <= 2) return distances.map(function () { return n ? 1 : 0; });
    [[function (p) { return orientedObjective(p); }], [function (p) { return p.secondaryObjective; }]].forEach(function (pair) {
      const getter = pair[0];
      const order = Array.from({ length: n }, function (_, index) { return index; }).sort(function (a, b) { return getter(front[a]) - getter(front[b]); });
      const min = getter(front[order[0]]), max = getter(front[order[n - 1]]), span = Math.max(1e-15, max - min);
      distances[order[0]] = Infinity;
      distances[order[n - 1]] = Infinity;
      for (let i = 1; i < n - 1; i += 1) {
        if (Number.isFinite(distances[order[i]])) distances[order[i]] += (getter(front[order[i + 1]]) - getter(front[order[i - 1]])) / span;
      }
    });
    const finite = distances.filter(Number.isFinite);
    const cap = finite.length ? Math.max.apply(null, finite) * 1.1 : 1;
    return distances.map(function (value) { return Number.isFinite(value) ? value : cap; });
  }

  function nondominatedPrefix(points) {
    return points.filter(function (point, index) {
      return !points.some(function (other, otherIndex) { return otherIndex !== index && dominates(other, point); });
    });
  }

  function hypervolume2D(points, reference) {
    const front = nondominatedPrefix(points).slice().sort(function (a, b) { return orientedObjective(a) - orientedObjective(b); });
    let area = 0;
    let lastY = reference[1];
    front.forEach(function (point) {
      const x = orientedObjective(point), y = point.secondaryObjective;
      if (y < lastY) {
        area += Math.max(0, reference[0] - x) * Math.max(0, lastY - y);
        lastY = y;
      }
    });
    return area;
  }

  function correlation(a, b) {
    const pairs = a.map(function (value, index) { return [Number(value), Number(b[index])]; }).filter(function (pair) { return pair.every(Number.isFinite); });
    if (pairs.length < 2) return 0;
    const ma = pairs.reduce(function (sum, pair) { return sum + pair[0]; }, 0) / pairs.length;
    const mb = pairs.reduce(function (sum, pair) { return sum + pair[1]; }, 0) / pairs.length;
    let num = 0, da = 0, db = 0;
    pairs.forEach(function (pair) { const x = pair[0] - ma, y = pair[1] - mb; num += x * y; da += x * x; db += y * y; });
    return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
  }

  function kneeCandidate(front) {
    if (!front || front.length < 3) return null;
    const points = front.slice().sort(function (a, b) { return orientedObjective(a) - orientedObjective(b); });
    const xs = points.map(orientedObjective), ys = points.map(function (p) { return p.secondaryObjective; });
    const xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs), ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    const normalized = points.map(function (point) { return { point: point, x: (orientedObjective(point) - xmin) / Math.max(1e-15, xmax - xmin), y: (point.secondaryObjective - ymin) / Math.max(1e-15, ymax - ymin) }; });
    const a = normalized[0], b = normalized[normalized.length - 1];
    const den = Math.hypot(b.y - a.y, b.x - a.x) || 1;
    return normalized.reduce(function (best, current) {
      const distance = Math.abs((b.y - a.y) * current.x - (b.x - a.x) * current.y + b.x * a.y - b.y * a.x) / den;
      return !best || distance > best.distance ? { point: current.point, distance: distance } : best;
    }, null);
  }

  function buildPlot(type) {
    const result = state.result;
    if (type === 'landscape' && state.landscape) {
      const traces = [{
        x: state.landscape.xs, y: state.landscape.ys, z: state.landscape.objective,
        type: 'contour', contours: { coloring: 'heatmap' }, colorbar: { title: 'objective' }, name: 'objective', hovertemplate: 'x=%{x:.4g}<br>y=%{y:.4g}<br>f=%{z:.5g}<extra></extra>',
      }];
      const records = result.records.filter(function (_, index) { return index % Math.max(1, Math.floor(result.records.length / 250)) === 0; });
      traces.push({ x: records.map(function (r) { return r.x[0]; }), y: records.map(function (r) { return r.x[1]; }), mode: 'markers', name: 'evaluated candidates', marker: { size: 5, opacity: .45 }, hovertemplate: 'x=%{x:.4g}<br>y=%{y:.4g}<extra></extra>' });
      traces.push(candidateTrace());
      return { traces, layout: baseLayout('Objective landscape and evaluated candidates', result.problem.names[0], result.problem.names[1]), evidence: 'The contour is a finite 45×45 grid of the raw primary objective. Candidate markers come from the current search. Constraint feasibility is reported separately; the picture does not certify convexity or global optimality.' };
    }
    if (type === 'penalized-landscape' && state.landscape) {
      return { traces: [{ x: state.landscape.xs, y: state.landscape.ys, z: state.landscape.penalized, type: 'contour', contours: { coloring: 'heatmap' }, colorbar: { title: 'penalized score' } }, candidateTrace()].filter(Boolean), layout: baseLayout('Penalized objective landscape', result.problem.names[0], result.problem.names[1]), evidence: 'This is the actual search score: oriented objective plus the declared quadratic constraint penalty. Penalty geometry is algorithmic and depends on the chosen penalty coefficient.' };
    }
    if (type === 'violation-map' && state.landscape) {
      return { traces: [{ x: state.landscape.xs, y: state.landscape.ys, z: state.landscape.violation.map(function(row){return row.map(function(v){return Math.log10(Math.max(v,1e-16));});}), type: 'heatmap', colorscale: 'YlOrRd', colorbar: { title: 'log10 violation' } }, candidateTrace()].filter(Boolean), layout: baseLayout('Constraint-violation map', result.problem.names[0], result.problem.names[1]), evidence: 'Grid values are the maximum numerical constraint violation. The map is finite-resolution and is not a symbolic feasible-set derivation.' };
    }
    if (type === 'feasible-region' && state.landscape) {
      return { traces: [{ x: state.landscape.xs, y: state.landscape.ys, z: state.landscape.feasible, type: 'heatmap', colorscale: [[0,'#fee2e2'],[.499,'#fee2e2'],[.5,'#dcfce7'],[1,'#dcfce7']], showscale: false }, candidateTrace()].filter(Boolean), layout: baseLayout('Finite-grid feasible region', result.problem.names[0], result.problem.names[1]), evidence: 'Green cells satisfy the declared numerical feasibility tolerance on a finite 45×45 grid. Boundaries between cells are unresolved.' };
    }
    if (type === 'convergence') {
      const history = result.history;
      return {
        traces: [
          { x: history.map(function (h) { return h.evaluations; }), y: history.map(function (h) { return h.penalizedObjective; }), mode: 'lines+markers', name: 'best penalized score' },
          { x: history.filter(function (h) { return h.feasible; }).map(function (h) { return h.evaluations; }), y: history.filter(function (h) { return h.feasible; }).map(function (h) { return h.objective; }), mode: 'lines+markers', name: 'best feasible objective' },
        ],
        layout: baseLayout('Search history', 'objective evaluations', 'score'),
        evidence: 'The penalized score is the search quantity. The raw objective is shown only after a feasible candidate exists. A flat curve can indicate convergence, stalling, insufficient budget, or an unsuitable penalty; it is not an optimality proof.',
      };
    }
    if (type === 'constraint-history') {
      const history = result.history;
      return {
        traces: [
          { x: history.map(function (h) { return h.evaluations; }), y: history.map(function (h) { return Math.max(h.maxViolation, 1e-16); }), mode: 'lines+markers', name: 'maximum violation' },
          { x: [history[0].evaluations, history[history.length - 1].evaluations], y: [result.options.feasibilityTolerance, result.options.feasibilityTolerance], mode: 'lines', name: 'feasibility tolerance', line: { dash: 'dash' } },
        ],
        layout: Object.assign(baseLayout('Constraint violation history', 'objective evaluations', 'maximum violation'), { yaxis: { title: 'maximum violation', type: 'log', gridcolor: '#dce8ef' } }),
        evidence: 'Inequalities use max(0,g); equalities use |h|. A point is feasible only when the maximum violation is at or below the declared tolerance. Penalty minimization and feasibility checking are separate.',
      };
    }
    if (type === 'variables') {
      const history = result.history;
      return {
        traces: result.problem.names.map(function (name, index) {
          return { x: history.map(function (h) { return h.evaluations; }), y: history.map(function (h) { return h.x[index]; }), mode: 'lines+markers', name };
        }),
        layout: baseLayout('Best-candidate decision variables', 'objective evaluations', 'variable value'),
        evidence: 'These traces show the best reported candidate as the search proceeds. They do not show uncertainty, identifiability, or all population members.',
      };
    }
    if (type === 'step-length') {
      const history=result.history; const values=history.map(function(row,index){if(index===0)return 0;return Math.hypot.apply(null,row.x.map(function(value,j){return value-history[index-1].x[j];}));});
      return { traces:[{x:history.map(function(h){return h.evaluations;}),y:values,mode:'lines+markers',name:'step length'}], layout:Object.assign(baseLayout('Best-candidate step length','objective evaluations','Euclidean step length'),{yaxis:{title:'Euclidean step length',type:'log',gridcolor:'#dce8ef'}}), evidence:'Distance between consecutive recorded best candidates. Small steps can indicate convergence, stalling, clipping at bounds, or a weak search operator; they are not an optimality certificate.' };
    }
    if (type === 'gradient-norm') {
      const history=result.history; const norms=history.map(function(row){return Math.hypot.apply(null,finiteDifferenceGradient(row.x));});
      return { traces:[{x:history.map(function(h){return h.evaluations;}),y:norms,mode:'lines+markers',name:'finite-difference gradient norm'}], layout:Object.assign(baseLayout('Local gradient-norm trace','objective evaluations','||∇f||₂'),{yaxis:{title:'||∇f||₂',type:'log',gridcolor:'#dce8ef'}}), evidence:'Finite-difference gradient of the raw objective at each recorded best candidate. Constraints and non-smooth terms can make this quantity incomplete or unstable.' };
    }
    if (type === 'local-sensitivity') {
      const gradient = finiteDifferenceGradient(result.candidate.x);
      const scale = Math.max.apply(null, gradient.map(function (value) { return Math.abs(value); }).concat([1e-15]));
      return { traces: [{ x: result.problem.names, y: gradient, type: 'bar', name: 'finite-difference sensitivity', customdata: gradient.map(function (value) { return Math.abs(value) / scale; }), hovertemplate: '%{x}<br>∂f/∂x=%{y:.4g}<br>relative magnitude=%{customdata:.3f}<extra></extra>' }], layout: baseLayout('Local objective sensitivity', 'decision variable', 'finite-difference derivative'), evidence: 'Central finite-difference derivative of the raw primary objective at the reported candidate. It is local, scale dependent, and does not include constraint multipliers, parameter uncertainty, or global sensitivity.' };
    }
    if (type === 'bound-distance') {
      const history=result.history; const distance=history.map(function(row){return Math.min.apply(null,row.x.map(function(value,index){const span=result.problem.upper[index]-result.problem.lower[index];return Math.min(value-result.problem.lower[index],result.problem.upper[index]-value)/span;}));});
      return { traces:[{x:history.map(function(h){return h.evaluations;}),y:distance,mode:'lines+markers',name:'nearest normalized bound distance'}], layout:baseLayout('Distance to nearest bound','objective evaluations','fraction of variable span'), evidence:'Minimum normalized distance from the recorded best candidate to any variable bound. Zero indicates an active bound or clipping, not necessarily a valid constrained optimum.' };
    }
    if (type === 'objective-distribution') {
      return { traces:[{x:result.records.map(function(r){return r.objective;}),type:'histogram',name:'evaluated objectives',nbinsx:45}], layout:baseLayout('Evaluated-objective distribution','raw primary objective','evaluation count'), evidence:'Distribution of recorded objective evaluations. It reflects the search path and record limit, not a probability distribution over designs.' };
    }
    if (type === 'parallel-coordinates') {
      const records=result.records.slice(0,1800); const dimensions=result.problem.names.map(function(name,index){return{label:name,values:records.map(function(r){return r.x[index];})};});dimensions.push({label:'objective',values:records.map(function(r){return r.objective;})});dimensions.push({label:'max violation',values:records.map(function(r){return r.maxViolation;})});
      return { traces:[{type:'parcoords',line:{color:records.map(function(r){return r.objective;}),colorscale:'Viridis',showscale:true,colorbar:{title:'objective'}},dimensions}], layout:Object.assign(baseLayout('Candidate parallel coordinates','',''),{margin:{l:55,r:55,t:50,b:35}}), evidence:'Recorded candidate coordinates, objective, and violation. Dense overplotting and projection can hide multimodality; this is exploratory search evidence.' };
    }
    if (type === 'hessian-spectrum') {
      const eigen=symmetricEigenvalues(finiteDifferenceHessian(result.candidate.x));
      const layout=baseLayout('Finite-difference Hessian spectrum','eigenvalue index','eigenvalue'); if(!eigen.length)layout.annotations=[{text:'Hessian spectrum is unavailable above eight variables.',xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false}];
      return { traces:eigen.length?[{x:eigen.map(function(_,i){return i+1;}),y:eigen,type:'bar',name:'local Hessian eigenvalues'}]:[], layout, evidence:'Central finite-difference Hessian of the raw objective at the reported candidate. It ignores active-constraint geometry and can be unreliable for non-smooth objectives.' };
    }
    if (type === 'constraint-profile') {
      const values=constraintValuesAt(result.candidate.x); const layout=baseLayout('Candidate constraint profile','constraint','violation magnitude'); if(!values.length)layout.annotations=[{text:'This problem has no explicit constraints.',xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false}];
      return { traces:values.length?[{x:values.map(function(v){return v.name;}),y:values.map(function(v){return v.violation;}),type:'bar',name:'violation'},{x:values.map(function(v){return v.name;}),y:values.map(function(v){return v.raw;}),mode:'markers',name:'raw residual'}]:[], layout, evidence:'Raw constraint residuals and the non-negative violation used by the feasibility gate. Equality residual sign is retained only in the marker series.' };
    }
    if (type === 'feasibility') {
      const records = result.records;
      return {
        traces: [
          { x: records.map(function (r) { return Math.max(r.maxViolation, 1e-16); }), y: records.map(function (r) { return r.objective; }), mode: 'markers', name: 'evaluations', marker: { size: 6, opacity: .55 }, customdata: records.map(function (r) { return [r.feasible ? 'feasible' : 'infeasible']; }), hovertemplate: 'violation=%{x:.3g}<br>objective=%{y:.5g}<br>%{customdata[0]}<extra></extra>' },
        ],
        layout: Object.assign(baseLayout('Objective versus constraint violation', 'maximum violation', 'primary objective'), { xaxis: { title: 'maximum violation', type: 'log', gridcolor: '#dce8ef' } }),
        evidence: 'This plot exposes the trade-off induced by the penalty parameter. Lower objective values at large violation are not acceptable feasible solutions.',
      };
    }
    if (type === 'samples') {
      const records = result.records;
      const xIndex = 0;
      const yIndex = Math.min(1, result.problem.names.length - 1);
      return {
        traces: [
          { x: records.map(function (r) { return r.x[xIndex]; }), y: records.map(function (r) { return r.x[yIndex]; }), mode: 'markers', name: 'evaluations', marker: { size: 6, opacity: .55, color: records.map(function (r) { return Math.log10(Math.max(r.maxViolation, 1e-16)); }), colorbar: { title: 'log10 violation' } } },
          candidateTrace(),
        ].filter(Boolean),
        layout: baseLayout('Candidate projection', result.problem.names[xIndex], result.problem.names[yIndex]),
        evidence: result.problem.names.length > 2 ? 'Only the first two decision variables are projected. Distinct high-dimensional candidates can overlap, so this view must not be interpreted as the full search geometry.' : 'Every point is an evaluated candidate projected into the two-dimensional decision space. Color encodes maximum constraint violation.',
      };
    }
    if (type === 'pareto' && state.pareto) {
      const feasible = state.pareto.points.filter(function (p) { return p.feasible; });
      return {
        traces: [
          { x: feasible.map(function (p) { return p.objective; }), y: feasible.map(function (p) { return p.secondaryObjective; }), mode: 'markers', name: 'feasible sample', marker: { size: 6, opacity: .45 } },
          { x: state.pareto.front.map(function (p) { return p.objective; }), y: state.pareto.front.map(function (p) { return p.secondaryObjective; }), mode: 'lines+markers', name: 'sample nondominated set' },
        ],
        layout: baseLayout('Finite-sample objective trade-off', `primary objective (${state.pareto.primarySense})`, 'secondary objective (minimize)'),
        evidence: state.pareto.claim + ' The secondary objective is treated as a minimization objective. Changing seed or sample budget can change the displayed nondominated set.',
      };
    }
    if (type === 'dominance-heatmap' && state.pareto) {
      const points = finiteParetoPoints().slice(0, 80);
      const z = points.map(function (a) { return points.map(function (b) { return dominates(a, b) ? 1 : (dominates(b, a) ? -1 : 0); }); });
      return { traces: [{ z: z, type: 'heatmap', colorscale: [[0, '#ef4444'], [.5, '#f8fafc'], [1, '#14b8a6']], zmin: -1, zmax: 1, colorbar: { title: 'relation', tickvals: [-1, 0, 1], ticktext: ['dominated', 'incomparable', 'dominates'] } }], layout: baseLayout('Finite-sample dominance matrix', 'candidate index', 'candidate index'), evidence: 'Pairwise dominance among at most 80 feasible sampled candidates. Ordering is the recorded sample order; zero means incomparable under the two displayed objectives.' };
    }
    if (type === 'crowding-distance' && state.pareto) {
      const front = state.pareto.front;
      const distance = crowdingDistances(front);
      return { traces: [{ x: front.map(function (point) { return point.objective; }), y: distance, mode: 'markers+lines', name: 'crowding distance', customdata: front.map(function (point) { return point.secondaryObjective; }), hovertemplate: 'primary=%{x:.5g}<br>secondary=%{customdata:.5g}<br>crowding=%{y:.4g}<extra></extra>' }], layout: baseLayout('Finite-front crowding distance', 'primary objective', 'normalized crowding distance'), evidence: 'NSGA-style crowding distance derived from the finite sampled nondominated set. Endpoint values are capped for display. It is not evidence from an implemented MOEA population.' };
    }
    if (type === 'hypervolume-convergence' && state.pareto) {
      const points = finiteParetoPoints();
      const xvals = points.map(orientedObjective), yvals = points.map(function (p) { return p.secondaryObjective; });
      const xrange = Math.max.apply(null, xvals) - Math.min.apply(null, xvals), yrange = Math.max.apply(null, yvals) - Math.min.apply(null, yvals);
      const reference = [Math.max.apply(null, xvals) + 0.05 * Math.max(xrange, 1), Math.max.apply(null, yvals) + 0.05 * Math.max(yrange, 1)];
      const stride = Math.max(1, Math.ceil(points.length / 120));
      const prefixes = [];
      for (let count = Math.min(stride, points.length); count <= points.length; count += stride) prefixes.push(count);
      if (prefixes[prefixes.length - 1] !== points.length) prefixes.push(points.length);
      return { traces: [{ x: prefixes, y: prefixes.map(function (count) { return hypervolume2D(points.slice(0, count), reference); }), mode: 'lines+markers', name: 'finite-sample hypervolume' }], layout: baseLayout('Finite-sample hypervolume convergence', 'feasible sampled candidates', '2D hypervolume'), evidence: 'Two-objective hypervolume of recorded feasible prefixes relative to a data-derived reference point. It measures this finite sample only and is not evolutionary-algorithm convergence evidence.' };
    }
    if (type === 'objective-correlation' && state.pareto) {
      const points = finiteParetoPoints();
      const series = [points.map(function (p) { return p.objective; }), points.map(function (p) { return p.secondaryObjective; }), points.map(function (p) { return p.maxViolation; })];
      const labels = ['primary', 'secondary', 'max violation'];
      const z = series.map(function (a) { return series.map(function (b) { return correlation(a, b); }); });
      return { traces: [{ x: labels, y: labels, z: z, type: 'heatmap', zmin: -1, zmax: 1, zmid: 0, colorscale: 'RdBu', colorbar: { title: 'Pearson r' }, text: z.map(function (row) { return row.map(function (value) { return value.toFixed(3); }); }), texttemplate: '%{text}' }], layout: baseLayout('Objective correlation heatmap', '', ''), evidence: 'Pearson correlations across the finite feasible sample. Correlation is scale- and sample-dependent and does not establish causal trade-offs or frontier geometry.' };
    }
    if (type === 'knee-point' && state.pareto) {
      const front = state.pareto.front;
      const knee = kneeCandidate(front);
      const traces = [{ x: front.map(function (p) { return p.objective; }), y: front.map(function (p) { return p.secondaryObjective; }), mode: 'lines+markers', name: 'sample nondominated set' }];
      if (knee) traces.push({ x: [knee.point.objective], y: [knee.point.secondaryObjective], mode: 'markers', name: 'geometric knee candidate', marker: { size: 14, symbol: 'diamond' } });
      return { traces: traces, layout: baseLayout('Geometric knee candidate', `primary objective (${state.pareto.primarySense})`, 'secondary objective (minimize)'), evidence: 'Maximum normalized perpendicular distance from the line joining the finite front endpoints. This is one geometric heuristic, not a preference-aware decision rule.' };
    }
    return { traces: [], layout: baseLayout('Unavailable plot', '', ''), evidence: 'This plot is unavailable for the current problem and result.' };
  }

  function renderPlot(side) {
    if (!state.result) return Promise.resolve();
    const type = state.plotTypes[side];
    const spec = buildPlot(type);
    const title = availablePlotTypes().find(function (entry) { return entry[0] === type; });
    setText(`${side}PlotTitle`, title ? title[1] : 'Computed plot');
    setText(`${side}PlotEvidence`, spec.evidence);
    const node = $(`${side}Plot`);
    if (!node) return Promise.resolve();
    return root.FokoPlotLifecycle.render(node, spec.traces, spec.layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] });
  }

  function renderAllPlots() {
    requestAnimationFrame(function () { requestAnimationFrame(function () { const sides = $('plotGrid').dataset.layout === 'focus' ? [state.focusSide] : ['left','right']; sides.forEach(renderPlot); }); });
    setText('optimizationResultKind', `${state.result.algorithm.replace(/_/g, ' ')} · ${state.result.evaluations} evaluations · ${state.result.globalOptimality}`);
  }

  function renderEvidence() {
    const result = state.result;
    const candidate = result.candidate;
    const success = result.status === 'success';
    setStatus(result.message, !success);
    setText('optimizationTopStatus', success ? 'Feasible candidate' : 'Feasibility warning');
    setText('optimizationRuntime', `${format(result.runtimeMs, 4)} ms`);
    setText('optimizationEvaluations', result.evaluations);
    setText('optimizationAlgorithmMetric', result.algorithm.replace(/_/g, ' '));
    setText('optimizationBestObjective', format(candidate.objective));
    setText('optimizationMaxViolation', format(candidate.maxViolation));
    setText('optimizationFeasibleRate', `${format(100 * result.feasibilityRate, 4)}%`);
    setText('optimizationTermination', result.terminationReason.replace(/_/g, ' '));
    setText('optimizationCandidateStatus', candidate.feasible ? 'within tolerance' : 'outside tolerance');

    setText('provenanceStatus', candidate.feasible ? 'Computed feasible candidate' : 'Computed least-violating candidate');
    setText('provenanceEngine', 'FokoOptimizationCore');
    setText('provenanceMethod', result.methodEvidence);
    setText('provenanceConstraints', `${result.problem.inequalityCount} inequality, ${result.problem.equalityCount} equality; quadratic penalty + independent tolerance gate`);
    setText('provenanceOptimality', 'Global optimality not established; local optimality not certified');
    setText('provenanceReproducibility', `Seed ${result.options.seed}; deterministic for this implementation and configuration`);
    const warning = candidate.feasible
      ? 'The reported point satisfies the declared numerical tolerance. This does not establish uniqueness, global optimality, KKT sufficiency, or robustness to algorithm settings.'
      : 'No evaluated candidate satisfied the declared tolerance. The displayed point is not a feasible solution and must not be described as an optimum.';
    setText('provenanceWarning', warning);

    const rows = result.problem.names.map(function (name, index) {
      return `<tr><th>${escapeHtml(name)}</th><td>${escapeHtml(format(candidate.x[index], 8))}</td></tr>`;
    }).join('');
    $('optimizationDiagnostics').classList.remove('empty');
    $('optimizationDiagnostics').innerHTML = `<table class="diagnostic-table"><tbody>${rows}<tr><th>Primary objective</th><td>${escapeHtml(format(candidate.objective, 8))}</td></tr>${candidate.secondaryObjective == null ? '' : `<tr><th>Secondary objective</th><td>${escapeHtml(format(candidate.secondaryObjective, 8))}</td></tr>`}<tr><th>Maximum violation</th><td>${escapeHtml(format(candidate.maxViolation, 8))}</td></tr><tr><th>Feasibility tolerance</th><td>${escapeHtml(format(result.options.feasibilityTolerance, 8))}</td></tr><tr><th>Termination</th><td>${escapeHtml(result.terminationReason.replace(/_/g, ' '))}</td></tr><tr><th>Evaluations</th><td>${escapeHtml(result.evaluations)}</td></tr><tr><th>Feasible evaluations</th><td>${escapeHtml(result.feasibleEvaluations)}</td></tr><tr><th>Optimality claim</th><td>None beyond a numerically evaluated candidate</td></tr></tbody></table>`;
  }

  function clearComputedEvidence(message) {
    state.result = null;
    state.landscape = null;
    state.pareto = null;
    state.compiledProblem = null;
    setStatus(message || 'No optimization result exists yet.', false);
    setText('optimizationTopStatus', 'Ready');
    ['optimizationRuntime', 'optimizationEvaluations', 'optimizationAlgorithmMetric', 'optimizationBestObjective', 'optimizationMaxViolation', 'optimizationFeasibleRate', 'optimizationTermination', 'optimizationCandidateStatus'].forEach(function (id) { setText(id, '—'); });
    setText('optimizationResultKind', 'No computed result');
    setText('provenanceStatus', 'Not computed');
    setText('provenanceEngine', 'FokoOptimizationCore');
    setText('provenanceMethod', 'Not run');
    setText('provenanceConstraints', 'Not evaluated');
    setText('provenanceOptimality', 'No claim');
    setText('provenanceReproducibility', 'Configuration only');
    setText('provenanceWarning', 'No numerical result exists yet.');
    $('optimizationDiagnostics').classList.add('empty');
    $('optimizationDiagnostics').textContent = 'Run the optimizer to see candidate, feasibility, termination, and search-budget evidence.';
    PLOT_SIDES.forEach(function (side) {
      const node = $(`${side}Plot`);
      root.FokoPlotLifecycle.clear(node, 'Run the optimizer to create this plot.');
      setText(`${side}PlotEvidence`, 'No plot has been computed.');
    });
    applyLayout();
  }

  function showError(error) {
    $('optimizationProgress').style.width = '0';
    setStatus(error && error.message ? error.message : String(error), true);
    setText('optimizationTopStatus', 'Error');
    setText('provenanceStatus', 'Computation rejected');
    setText('provenanceWarning', error && error.message ? error.message : String(error));
  }

  function setStatus(message, bad) {
    const node = $('optimizationStatus');
    node.textContent = message;
    node.classList.toggle('bad', Boolean(bad));
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
    if (state.result) requestAnimationFrame(function () { requestAnimationFrame(renderAllPlots); });
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('optimization');
    return report;
  }

  function configuration() {
    readEditorIntoModel();
    return { version: '72.47.0', example: state.currentName, model: clone(state.model), settings: readSettings(), layout: state.layout, focusSide: state.focusSide, plotTypes: clone(state.plotTypes) };
  }

  function restoreConfiguration(config, source) {
    if (!config || !config.model || !Array.isArray(config.model.variables)) throw new Error('Saved optimization configuration is invalid.');
    state.currentName = config.example && PRESETS[config.example] ? config.example : 'Custom model';
    state.model = clone(config.model);
    state.layout = LAYOUTS.has(config.layout) ? config.layout : 'two';
    state.focusSide = PLOT_SIDES.includes(config.focusSide) ? config.focusSide : 'left';
    state.plotTypes = Object.assign(state.plotTypes, config.plotTypes || {});
    renderPresetLibrary();
    renderEditor();
    applyModelSettings();
    if (config.settings) {
      Object.keys(config.settings).forEach(function (key) {
        const mapping = {
          algorithm: 'optimizationAlgorithm', maxIterations: 'optimizationIterations', populationSize: 'optimizationPopulation', starts: 'optimizationStarts', seed: 'optimizationSeed', penalty: 'optimizationPenalty', feasibilityTolerance: 'optimizationFeasibilityTolerance', stepTolerance: 'optimizationStepTolerance', paretoSamples: 'optimizationParetoSamples',
        };
        if (mapping[key] && $(mapping[key])) $(mapping[key]).value = config.settings[key];
      });
    }
    clearComputedEvidence(`${source || 'Configuration'} restored. Computed candidates and evidence must be regenerated.`);
  }

  function saveSession() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration()));
    setStatus('Configuration saved locally. Numerical results were not saved.', false);
  }

  function restoreSession() {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return showError(new Error('No saved optimization configuration exists.'));
    try { restoreConfiguration(saved, 'Local configuration'); } catch (error) { showError(error); }
  }

  async function copyShareUrl() {
    try {
      const url = new URL(location.href);
      url.search = '';
      url.searchParams.set('state', encodeState(configuration()));
      await navigator.clipboard.writeText(url.toString());
      setStatus('Share URL copied. It stores configuration only, not computed evidence.', false);
    } catch (error) { showError(error); }
  }

  function download(name, text, type) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function resultForExport() {
    if (!state.result) throw new Error('Run the optimizer before exporting a numerical result.');
    return state.result;
  }

  function exportSummary() {
    const result = resultForExport();
    const c = result.candidate;
    const rows = [['field', 'value'], ['status', result.status], ['algorithm', result.algorithm], ['termination', result.terminationReason], ['objective', c.objective], ['secondary_objective', c.secondaryObjective == null ? '' : c.secondaryObjective], ['max_violation', c.maxViolation], ['feasible', c.feasible], ['feasibility_tolerance', result.options.feasibilityTolerance], ['evaluations', result.evaluations], ['seed', result.options.seed], ['global_optimality', result.globalOptimality]];
    result.problem.names.forEach(function (name, index) { rows.push([`variable_${name}`, c.x[index]]); });
    download('foko-lab-optimization-summary.csv', rows.map(function (row) { return row.join(','); }).join('\n'), 'text/csv');
  }

  function exportHistory() {
    const result = resultForExport();
    const header = ['iteration', 'evaluations', 'objective', 'penalized_objective', 'max_violation', 'feasible'].concat(result.problem.names);
    const rows = result.history.map(function (item) { return [item.iteration, item.evaluations, item.objective, item.penalizedObjective, item.maxViolation, item.feasible].concat(item.x); });
    download('foko-lab-optimization-history.csv', [header].concat(rows).map(function (row) { return row.join(','); }).join('\n'), 'text/csv');
  }

  function serialisableResult() {
    const result = resultForExport();
    return { release: '72.47.0', computedAt: new Date().toISOString(), result, model: state.model, warning: 'Numerical candidate only. Global optimality and KKT sufficiency are not established.' };
  }

  function exportPython() {
    readEditorIntoModel();
    const names = state.model.variables.map(function (variable) { return variable.name; });
    const py = function (expression) {
      return String(expression || '0').replace(/\^/g, '**').replace(/\bpi\b/g, 'np.pi').replace(/\bexp\(/g, 'np.exp(').replace(/\bcos\(/g, 'np.cos(').replace(/\bsin\(/g, 'np.sin(').replace(/\btanh\(/g, 'np.tanh(').replace(/\bsqrt\(/g, 'np.sqrt(').replace(/\blog\(/g, 'np.log(');
    };
    const unpack = names.map(function (name, index) { return `    ${name} = x[${index}]`; }).join('\n');
    const bounds = state.model.variables.map(function (v) { return `(${v.lower}, ${v.upper})`; }).join(', ');
    const constraints = [];
    state.model.inequalities.forEach(function (expr) { constraints.push(`    {'type': 'ineq', 'fun': lambda x: -(${py(expr)})}`); });
    state.model.equalities.forEach(function (expr) { constraints.push(`    {'type': 'eq', 'fun': lambda x: (${py(expr)})}`); });
    const text = `"""Validation export from Foko Lab v72.47.0.\nRun with SciPy and inspect termination/constraint evidence independently.\nThe browser result is not a global-optimality certificate.\n"""\nimport numpy as np\nfrom scipy.optimize import minimize, differential_evolution\n\ndef objective(x):\n${unpack}\n    value = ${py(state.model.objective)}\n    return ${state.model.sense === 'maximize' ? '-value' : 'value'}\n\nx0 = np.array([${state.model.variables.map(function (v) { return v.start; }).join(', ')}], dtype=float)\nbounds = [${bounds}]\nconstraints = [\n${constraints.join(',\n')}\n]\n\nlocal = minimize(objective, x0, method='SLSQP', bounds=bounds, constraints=constraints, options={'ftol': ${$('optimizationFeasibilityTolerance').value}, 'maxiter': ${$('optimizationIterations').value}, 'disp': True})\nprint(local)\nprint('reported objective:', ${state.model.sense === 'maximize' ? '-local.fun' : 'local.fun'})\n# For non-convex problems, compare multiple starts or a bounded global heuristic.\n`;
    download('foko-lab-optimization-validation.py', text, 'text/x-python');
  }

  function exportPlot(side, formatName) {
    if (!state.result) return showError(new Error('Run the optimizer before exporting a plot.'));
    root.Plotly.downloadImage(`${side}Plot`, { format: formatName, filename: `foko-lab-optimization-${side}` });
  }

  function bindEvents() {
    $('runOptimization').addEventListener('click', runOptimization);
    $('resetOptimization').addEventListener('click', function () { loadPreset(state.currentName, false); });
    $('optimizationImport').addEventListener('change', function () { importOptimizationFile(this.files && this.files[0]); });
    $('loadOptimization').addEventListener('click', function () { loadPreset($('optimizationSelect').value, true); });
    $('optimizationDeck').addEventListener('click', function (event) {
      const button = event.target.closest('[data-preset]');
      if (button) loadPreset(button.dataset.preset, true);
    });
    if ($('optimizationExampleSearch')) $('optimizationExampleSearch').addEventListener('input', renderPresetLibrary);
    if ($('optimizationFamilyFilter')) $('optimizationFamilyFilter').addEventListener('change', renderPresetLibrary);
    $('addOptimizationVariable').addEventListener('click', function () {
      try { readEditorIntoModel(); } catch (error) { return showError(error); }
      const index = state.model.variables.length + 1;
      state.model.variables.push({ name: `x${index}`, start: 0, lower: -1, upper: 1 });
      renderEditor();
      clearComputedEvidence('Model structure changed. Recompute before interpreting results.');
    });
    $('optimizationVariables').addEventListener('click', function (event) {
      const button = event.target.closest('[data-delete-variable]');
      if (!button) return;
      if (state.model.variables.length <= 1) return showError(new Error('At least one variable is required.'));
      state.model.variables.splice(Number(button.dataset.deleteVariable), 1);
      renderEditor();
      clearComputedEvidence('Decision variable removed. Recompute before interpreting results.');
    });
    ['optimizationVariables', 'optimizationObjective', 'optimizationObjective2', 'optimizationInequalities', 'optimizationEqualities', 'optimizationSense'].forEach(function (id) {
      $(id).addEventListener('input', function () { clearComputedEvidence('Model edited. Previous numerical evidence was cleared.'); });
    });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) {
      button.addEventListener('click', function () { if (LAYOUTS.has(button.dataset.layoutMode)) { state.layout = button.dataset.layoutMode; applyLayout(); } });
    });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) {
      button.addEventListener('click', function () { state.focusSide = button.dataset.focusSide; state.layout = 'focus'; applyLayout(); });
    });
    PLOT_SIDES.forEach(function (side) {
      $(`${side}PlotType`).addEventListener('change', function () { state.plotTypes[side] = this.value; renderPlot(side); });
    });
    document.querySelectorAll('[data-export-side]').forEach(function (button) {
      button.addEventListener('click', function () { exportPlot(button.dataset.exportSide, 'png'); });
    });
    $('exportOptimizationPng').addEventListener('click', function () { exportPlot(state.focusSide, 'png'); });
    $('exportOptimizationSvg').addEventListener('click', function () { exportPlot(state.focusSide, 'svg'); });
    $('saveOptimizationSession').addEventListener('click', saveSession);
    $('restoreOptimizationSession').addEventListener('click', restoreSession);
    $('copyOptimizationShareUrl').addEventListener('click', copyShareUrl);
    $('exportOptimizationSummary').addEventListener('click', function () { try { exportSummary(); } catch (error) { showError(error); } });
    $('exportOptimizationHistory').addEventListener('click', function () { try { exportHistory(); } catch (error) { showError(error); } });
    $('exportOptimizationJson').addEventListener('click', function () { try { download('foko-lab-optimization-result.json', JSON.stringify(serialisableResult(), null, 2), 'application/json'); } catch (error) { showError(error); } });
    $('exportOptimizationModel').addEventListener('click', function () { try { download('foko-lab-optimization-model.json', JSON.stringify(configuration(), null, 2), 'application/json'); } catch (error) { showError(error); } });
    $('exportOptimizationPython').addEventListener('click', function () { try { exportPython(); } catch (error) { showError(error); } });
    document.querySelectorAll('[data-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = document.querySelector(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('[data-jump]').forEach(function (item) { item.classList.toggle('active', item === button); });
      });
    });
    window.addEventListener('resize', applyLayout);
  }

  function init() {
    if (!CORE || !root.math || !root.Plotly) return showError(new Error('Required local scientific libraries failed to load.'));
    const storedLayout = safeParse(localStorage.getItem(LAYOUT_KEY));
    if (storedLayout && LAYOUTS.has(storedLayout.layout)) state.layout = storedLayout.layout;
    if (storedLayout && PLOT_SIDES.includes(storedLayout.focusSide)) state.focusSide = storedLayout.focusSide;
    bindEvents();
    renderTaxonomyCatalog();
    const url = new URL(location.href);
    const shared = decodeState(url.searchParams.get('state'));
    if (shared) {
      try { restoreConfiguration(shared, 'Shared configuration'); } catch (_) { loadPreset(url.searchParams.get('example'), false); }
    } else {
      loadPreset(url.searchParams.get('example'), false);
    }
    applyLayout();
    if (!shared && url.searchParams.get('autorun') !== '0') root.setTimeout(runOptimization, 0);
  }

  window.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
