/* Foko Lab interactive home-page demo reel.
 * Every result shown by this module is computed by a real Foko Lab core.
 * The module contains model inputs and rendering helpers, never hard-coded output curves.
 */
(function (root) {
  'use strict';

  const RELEASE = '72.48.0';
  const scriptPromises = new Map();
  const demoRuns = new Map();
  const demoAttempts = new Map();
  const demoTokens = new Map();
  const activeWorkers = new Map();
  const animationHandles = new Map();
  let workerCounter = 0;

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value == null ? '' : String(value);
  }
  function finite(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toFixed(Number.isInteger(digits) ? digits : 4).replace(/\.?0+$/, '');
  }
  function loadScript(source, globalName) {
    if (globalName && root[globalName]) return Promise.resolve(root[globalName]);
    const key = source + '::' + (globalName || '');
    if (scriptPromises.has(key)) return scriptPromises.get(key);
    const promise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.async = true;
      script.src = source + (source.includes('?') ? '&' : '?') + 'v=' + RELEASE;
      script.onload = function () {
        const exported = globalName ? root[globalName] : true;
        if (globalName && !exported) reject(new Error(globalName + ' did not register after loading ' + source + '.'));
        else resolve(exported);
      };
      script.onerror = function () { reject(new Error('Could not load ' + source + '.')); };
      document.head.appendChild(script);
    });
    scriptPromises.set(key, promise);
    return promise;
  }

  function supersededRunError() {
    const error = new Error('Home demonstration was superseded by a newer run.');
    error.name = 'AbortError';
    return error;
  }
  function cancelActiveWorker(runKey) {
    const active = activeWorkers.get(runKey);
    if (!active) return;
    active.cancel();
    if (activeWorkers.get(runKey) === active) activeWorkers.delete(runKey);
  }
  function runWorker(task, extra, runKey) {
    const key = runKey || task;
    cancelActiveWorker(key);
    const id = 'home-demo-' + (++workerCounter);
    return new Promise(function (resolve, reject) {
      const taskWorker = new Worker('src/home-demo-worker.js?v=' + RELEASE);
      let settled = false;
      const timeout = root.setTimeout(function () {
        finish(reject, new Error('Home demonstration exceeded its bounded runtime.'));
      }, 18000);
      const active = {
        cancel: function () {
          if (settled) return;
          settled = true;
          root.clearTimeout(timeout);
          taskWorker.terminate();
          reject(supersededRunError());
        }
      };
      activeWorkers.set(key, active);
      function finish(callback, value) {
        if (settled) return;
        settled = true;
        root.clearTimeout(timeout);
        taskWorker.terminate();
        if (activeWorkers.get(key) === active) activeWorkers.delete(key);
        callback(value);
      }
      taskWorker.onmessage = function (event) {
        const message = event.data || {};
        if (message.id !== id) return;
        if (message.ok) finish(resolve, message.result);
        else finish(reject, new Error(message.error || 'Worker demo failed.'));
      };
      taskWorker.onerror = function (event) {
        finish(reject, new Error(event.message || 'Home demo worker failed.'));
      };
      taskWorker.postMessage(Object.assign({ id: id, task: task }, extra || {}));
    });
  }


  function svgNode(name, attributes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }
  function linePath(xs, ys, width, height, bounds) {
    const left = 30, right = 10, top = 10, bottom = 22;
    const innerWidth = Math.max(1, width - left - right);
    const innerHeight = Math.max(1, height - top - bottom);
    const xSpan = Math.max(1e-12, bounds.xMax - bounds.xMin);
    const ySpan = Math.max(1e-12, bounds.yMax - bounds.yMin);
    return xs.map(function (x, index) {
      const px = left + (x - bounds.xMin) / xSpan * innerWidth;
      const py = top + (bounds.yMax - ys[index]) / ySpan * innerHeight;
      return (index ? 'L' : 'M') + px.toFixed(2) + ',' + py.toFixed(2);
    }).join(' ');
  }
  function renderLines(id, series, options) {
    const svg = byId(id);
    if (!svg || !series || !series.length) return;
    const width = options && options.width || 520;
    const height = options && options.height || 190;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.replaceChildren();
    const xs = series.flatMap(function (item) { return item.x; }).filter(Number.isFinite);
    const ys = series.flatMap(function (item) { return item.y; }).filter(Number.isFinite);
    if (!xs.length || !ys.length) return;
    const yMinimum = Math.min.apply(null, ys);
    const yMaximum = Math.max.apply(null, ys);
    const padding = Math.max(1e-9, (yMaximum - yMinimum || Math.abs(yMaximum) || 1) * 0.08);
    const bounds = {
      xMin: Math.min.apply(null, xs), xMax: Math.max.apply(null, xs),
      yMin: options && Number.isFinite(options.yMin) ? options.yMin : yMinimum - padding,
      yMax: options && Number.isFinite(options.yMax) ? options.yMax : yMaximum + padding
    };
    svg.appendChild(svgNode('rect', { x: 0, y: 0, width: width, height: height, rx: 12, class: 'home-demo-plot-bg' }));
    [0, 0.5, 1].forEach(function (fraction) {
      const y = 10 + fraction * (height - 32);
      svg.appendChild(svgNode('line', { x1: 30, x2: width - 10, y1: y, y2: y, class: 'home-demo-gridline' }));
    });
    series.forEach(function (item, index) {
      svg.appendChild(svgNode('path', {
        d: linePath(item.x, item.y, width, height, bounds),
        class: 'home-demo-series home-demo-series-' + (index % 5),
        'aria-label': item.name || ('series ' + (index + 1))
      }));
    });
  }
  function renderPointsAndLine(id, x, y, fitX, fitY) {
    const svg = byId(id);
    if (!svg) return;
    const width = 600, height = 250, left = 38, right = 12, top = 14, bottom = 28;
    const allX = x.concat(fitX), allY = y.concat(fitY);
    const minX = Math.min.apply(null, allX), maxX = Math.max.apply(null, allX);
    const minY = Math.min.apply(null, allY), maxY = Math.max.apply(null, allY);
    const xSpan = Math.max(1e-12, maxX - minX), ySpan = Math.max(1e-12, maxY - minY);
    const px = function (value) { return left + (value - minX) / xSpan * (width - left - right); };
    const py = function (value) { return top + (maxY - value) / ySpan * (height - top - bottom); };
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.replaceChildren();
    svg.appendChild(svgNode('rect', { x: 0, y: 0, width: width, height: height, rx: 14, class: 'home-demo-plot-bg' }));
    const line = fitX.map(function (value, index) { return (index ? 'L' : 'M') + px(value).toFixed(2) + ',' + py(fitY[index]).toFixed(2); }).join(' ');
    svg.appendChild(svgNode('path', { d: line, class: 'home-demo-series home-demo-series-0' }));
    x.forEach(function (value, index) {
      svg.appendChild(svgNode('circle', { cx: px(value), cy: py(y[index]), r: 4.2, class: 'home-demo-point' }));
    });
  }
  function renderGrid(canvasId, grid, size, colors) {
    const canvas = byId(canvasId);
    if (!canvas || !grid || !grid.length) return;
    const context = canvas.getContext('2d');
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const cssSize = 190;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = cssSize / size;
    grid.forEach(function (state, index) {
      context.fillStyle = colors[state] || '#d5dde5';
      context.fillRect((index % size) * cell, Math.floor(index / size) * cell, Math.ceil(cell), Math.ceil(cell));
    });
  }
  function cancelAnimation(canvasId) {
    const active = animationHandles.get(canvasId);
    if (!active) return;
    if (active.timer) root.clearTimeout(active.timer);
    animationHandles.delete(canvasId);
    active.resolve({ cancelled: true });
  }
  function animateSnapshots(canvasId, result, runToken) {
    cancelAnimation(canvasId);
    const snapshots = result.snapshots || [];
    if (!snapshots.length) return Promise.resolve({ cancelled: false });
    const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || snapshots.length === 1) {
      renderGrid(canvasId, snapshots[snapshots.length - 1].grid, result.size, result.colors);
      return Promise.resolve({ cancelled: false });
    }
    return new Promise(function (resolve) {
      let index = 0;
      const active = { timer: null, token: runToken, resolve: resolve };
      animationHandles.set(canvasId, active);
      const finish = function () {
        if (animationHandles.get(canvasId) === active) animationHandles.delete(canvasId);
        resolve({ cancelled: false });
      };
      const tick = function () {
        if (animationHandles.get(canvasId) !== active) return;
        renderGrid(canvasId, snapshots[index].grid, result.size, result.colors);
        index += 1;
        if (index < snapshots.length) active.timer = root.setTimeout(tick, 145);
        else finish();
      };
      tick();
    });
  }
  function setDemoState(name, status, detail) {
    const card = document.querySelector('[data-demo-card="' + name + '"]');
    if (card) card.dataset.state = status;
    setText('demo-' + name + '-status', detail || status);
  }

  async function runOdeDemo() {
    const core = root.FokoODECore || await loadScript('src/core/ode.js', 'FokoODECore');
    if (!core || typeof core.solveWithRhs !== 'function') throw new Error('FokoODECore is unavailable.');
    const result = core.solveWithRhs({ t0: 0, t1: 18, y0: [0.6], vars: ['x'], method: 'rk45', points: 160, rtol: 1e-7, atol: 1e-9 }, function (_time, state) {
      return [1.05 * state[0] * (1 - state[0] / 10)];
    });
    if (!result || !result.ok || !result.diagnostics || !Array.isArray(result.T) || !Array.isArray(result.Y) || !result.Y[0]) {
      throw new Error(result && result.error || 'ODE demo did not produce a valid trajectory.');
    }
    renderLines('demo-ode-plot', [{ x: result.T, y: result.Y[0], name: 'logistic trajectory' }], { yMin: 0 });
    setText('demo-ode-metrics', result.diagnostics.method + ' · ' + result.diagnostics.accepted + ' accepted · ' + result.diagnostics.rejected + ' rejected');
    return result;
  }

  async function runSteadyDemo() {
    const core = await loadScript('src/core/steady.js', 'FokoSteadyCore');
    const a = 0.35;
    const residual = function (x) { return [x[0] * (1 - x[0]) * (x[0] - a)]; };
    const starts = [[-0.1], [0.1], [0.5], [0.9], [1.15]];
    const solved = core.solveMultiStart({ residual: residual, starts: starts, tolerance: 1e-10, maxIterations: 80 });
    const roots = solved.uniqueSolutions.map(function (solution) { return solution.x[0]; }).sort(function (left, right) { return left - right; });
    const x = core.linspace(-0.18, 1.18, 180);
    const y = x.map(function (value) { return residual([value])[0]; });
    renderLines('demo-steady-plot', [{ x: x, y: y, name: 'residual' }]);
    setText('demo-steady-metrics', roots.length + ' distinct roots · tolerance 1e-10 · multistart');
    setText('demo-steady-roots', roots.map(function (value) { return finite(value, 4); }).join(' · '));
    return solved;
  }

  async function runStochasticDemo(context) {
    const result = await runWorker('stochastic', null, 'demo-stochastic');
    renderLines('demo-stochastic-plot', result.paths.map(function (path, index) { return { x: result.times, y: path, name: 'path ' + (index + 1) }; }), { yMin: 0 });
    setText('demo-stochastic-metrics', result.algorithm + ' · seed ' + result.seed + ' · ' + result.events + ' events');
    setText('demo-stochastic-boundary', result.boundary);
    return result;
  }

  async function runAgentDemo(canvasId, preset, statusPrefix, context) {
    const baseSeed = preset === 'tcell_baseline' ? 202610 : 202620;
    const attempt = context && Number.isInteger(context.attempt) ? context.attempt : 0;
    const seed = baseSeed + attempt;
    cancelAnimation(canvasId);
    const result = await runWorker('agent', { preset: preset, seed: seed }, statusPrefix);
    if (context && !context.isCurrent()) throw supersededRunError();
    setText(statusPrefix + '-metrics', result.algorithm + ' · ' + result.size + '×' + result.size + ' · seed ' + result.seed);
    setText(statusPrefix + '-boundary', result.boundary);
    await animateSnapshots(canvasId, result, context && context.token);
    if (context && !context.isCurrent()) throw supersededRunError();
    return result;
  }

  const fitPairs = [
    [0.05, 0.020], [0.10, 0.039], [0.18, 0.068], [0.28, 0.101],
    [0.40, 0.139], [0.55, 0.181], [0.72, 0.224], [0.90, 0.266]
  ];
  async function runFitPreview() {
    const core = await loadScript('src/core/fitting.js', 'FokoFitting');
    const result = core.fit(fitPairs, 'michaelis', { initialParams: [1, 2], bootstrapReplicates: 0 });
    const grid = Array.from({ length: 160 }, function (_, index) { return 0.02 + 1.04 * index / 159; });
    const predicted = grid.map(function (value) { return core.predictModel('michaelis', value, result.coef); });
    renderPointsAndLine('demo-fit-plot', fitPairs.map(function (pair) { return pair[0]; }), fitPairs.map(function (pair) { return pair[1]; }), grid, predicted);
    setText('demo-fit-r2', finite(result.r2, 5));
    setText('demo-fit-status', 'Beautiful fit. Parameter trust not yet tested.');
    return result;
  }
  async function demolishFit() {
    const core = await loadScript('src/core/fitting.js', 'FokoFitting');
    setDemoState('fit', 'running', 'Running profile and correlation diagnostics…');
    const result = core.fit(fitPairs, 'michaelis', { initialParams: [1, 2], computeProfile: true, profilePoints: 25, profileSpanSE: 4, bootstrapReplicates: 0 });
    const pair = result.parameterCorrelation.pairs[0];
    const profileSeries = result.profileLikelihood.map(function (profile) {
      const minimum = Math.min.apply(null, profile.values.map(function (value) { return value.sse; }));
      return { x: profile.values.map(function (value) { return value.value; }), y: profile.values.map(function (value) { return value.sse - minimum; }), name: profile.name + ' profile' };
    });
    renderLines('demo-fit-profile', profileSeries);
    setText('demo-fit-verdict', 'Practical non-identifiability likely');
    setText('demo-fit-correlation', 'corr(Vmax, Km) = ' + finite(pair && pair.correlation, 4));
    setText('demo-fit-explanation', result.identifiability.sentence);
    setDemoState('fit', 'complete', 'Diagnostics computed');
    return result;
  }

  async function runFattyResearch() {
    const core = root.FokoODECore;
    const model = root.FokoHomeResearchModels && root.FokoHomeResearchModels.fattyAcidMetabolism;
    if (!core || !model) throw new Error('Fatty-acid research model is unavailable.');
    const result = core.solveWithRhs(Object.assign({}, model.config, { points: 150, params: model.parameters }), model.rhs);
    renderLines('research-fa-plot', result.Y.slice(0, 3).map(function (series, index) { return { x: result.T, y: series, name: model.variables[index] }; }));
    setText('research-fa-metrics', result.diagnostics.method + ' · ' + result.diagnostics.accepted + ' accepted');
    return result;
  }
  async function runFadnsResearch() {
    const core = root.FokoODECore;
    const model = root.FokoHomeResearchModels && root.FokoHomeResearchModels.fadnsReduced;
    if (!core || !model) throw new Error('FADNS reduced model is unavailable.');
    const result = core.solveWithRhs(Object.assign({}, model.config, { params: model.parameters }), model.rhs);
    const productIndices = [7, 8, 9];
    renderLines('research-fadns-plot', productIndices.map(function (index) { return { x: result.T, y: result.Y[index], name: model.variables[index] }; }), { yMin: 0 });
    setText('research-fadns-metrics', result.diagnostics.method + ' · C14/C16/C18 product trajectories');
    return result;
  }

  async function runStatisticsDemo() {
    const stats = await loadScript('src/core/statistics.js', 'FokoStatistics');
    const rows = [[0,2.1],[0.5,2.9],[1,4.0],[1.5,4.8],[2,6.2],[2.5,7.1],[3,8.0],[3.5,9.2],[4,10.0],[4.5,11.4],[4.7,null]];
    const complete = rows.filter(function (row) { return Number.isFinite(row[1]); });
    const x = complete.map(function (row) { return row[0]; }), y = complete.map(function (row) { return row[1]; });
    const result = stats.ols(x, y);
    setText('analysis-statistics-output', '1 missing row flagged · slope ' + finite(result.slope, 3) + ' · R² ' + finite(result.r2, 4));
    return result;
  }
  async function runMLDemo() {
    const ml = await loadScript('src/core/ml-reference.js', 'FokoMLReference');
    const y = [0,0,0,0,1,1,1,1,1,0,1,0];
    const X = y.map(function (label, index) { return [index + 101, label ? 1.2 + index * 0.08 : 0.3 + index * 0.05, label]; });
    const result = ml.datasetAudit(X, y, ['record_id', 'signal', 'leaked_label'], 'classification');
    setText('analysis-ml-output', result.directLeakage.length + ' leakage feature flagged · ' + result.identifierLike.length + ' identifier-like feature');
    return result;
  }
  async function runSciMLDemo() {
    const sindy = await loadScript('src/core/sindy.js', 'FokoSINDy');
    const ode = root.FokoODECore;
    const solved = ode.solveWithRhs({ t0: 0, t1: 8, y0: [0.7], vars: ['x'], method: 'rk45', points: 140, rtol: 1e-8, atol: 1e-10 }, function (_time, state) { return [state[0] * (1 - state[0] / 10)]; });
    const model = sindy.discover({ X: solved.T.map(function (_time, index) { return [solved.Y[0][index]]; }), t: solved.T, varNames: ['x'], lambda: 0.02, ridge: 1e-6, iterations: 8, library: { constant: true, linear: true, quadratic: true, interactions: false, cubic: false, trig: false } });
    setText('analysis-sciml-output', model.equations[0] + ' · RMSE ' + finite(model.rmse, 4));
    return model;
  }
  async function runOptimizationDemo() {
    const core = await loadScript('src/core/optimization.js', 'FokoOptimizationCore');
    const result = core.optimise({
      variables: [{ name: 'x', start: 1, lower: 0, upper: 10 }, { name: 'y', start: 1, lower: 0, upper: 10 }],
      sense: 'minimize',
      objective: function (point) { return (point[0] - 3) ** 2 + (point[1] - 2) ** 2; },
      inequalities: [function (point) { return point[0] + point[1] - 4; }],
      equalities: []
    }, { algorithm: 'projected_gradient', maxIterations: 120, penalty: 1e6, feasibilityTolerance: 1e-5, seed: 17 });
    setText('analysis-optimization-output', (result.candidate.feasible ? 'feasible' : 'not feasible') + ' · objective ' + finite(result.candidate.objective, 4) + ' · violation ' + finite(result.candidate.maxViolation, 3));
    return result;
  }

  const runners = {
    ode: runOdeDemo,
    steady: runSteadyDemo,
    stochastic: runStochasticDemo,
    agent: function (context) { return runAgentDemo('demo-agent-canvas', 'tcell_baseline', 'demo-agent', context); },
    'fit-preview': runFitPreview,
    'fit-demolish': demolishFit,
    'research-fa': runFattyResearch,
    'research-fadns': runFadnsResearch,
    'research-tcell': function (context) { return runAgentDemo('research-tcell-canvas', 'tcell_baseline', 'research-tcell', context); },
    statistics: runStatisticsDemo,
    ml: runMLDemo,
    sciml: runSciMLDemo,
    optimization: runOptimizationDemo
  };

  async function runNamedDemo(name, force) {
    if (!runners[name]) return;
    if (!force && demoRuns.has(name)) return demoRuns.get(name);
    const previousAttempt = demoAttempts.get(name) || 0;
    const attempt = force ? previousAttempt + 1 : previousAttempt;
    demoAttempts.set(name, attempt);
    const token = (demoTokens.get(name) || 0) + 1;
    demoTokens.set(name, token);
    const context = {
      name: name,
      force: Boolean(force),
      attempt: attempt,
      token: token,
      isCurrent: function () { return demoTokens.get(name) === token; }
    };
    const promise = Promise.resolve().then(function () {
      if (context.isCurrent()) setDemoState(name, 'running', force ? 'Recomputing…' : 'Computing…');
      return runners[name](context);
    }).then(function (result) {
      if (context.isCurrent()) setDemoState(name, 'complete', 'Computed');
      return result;
    }).catch(function (error) {
      if (error && error.name === 'AbortError') return undefined;
      if (context.isCurrent()) setDemoState(name, 'failed', 'Could not compute: ' + error.message);
      throw error;
    });
    demoRuns.set(name, promise);
    return promise;
  }

  function bindButtons() {
    document.querySelectorAll('[data-run-demo]').forEach(function (button) {
      button.addEventListener('click', function () {
        const name = button.dataset.runDemo;
        runNamedDemo(name, true).catch(function () {});
      });
    });
  }
  function runDemoGroup(names) {
    names.forEach(function (name) { runNamedDemo(name).catch(function () {}); });
  }
  function observeDemos() {
    const computeAct = document.querySelector('.act-computes');
    const computeNames = ['ode', 'steady', 'stochastic', 'agent'];
    const nodes = Array.from(document.querySelectorAll('[data-auto-demo]')).filter(function (node) {
      return computeNames.indexOf(node.dataset.autoDemo) < 0;
    });
    // The first four demonstrations are bounded and form one product proof.
    // Start them once after initial paint so browser-observer timing cannot leave
    // lower rows in a permanent Ready state after the section is reached.
    const startComputeAct = function () { runDemoGroup(computeNames); };
    root.setTimeout(startComputeAct, 0);
    if (!('IntersectionObserver' in root)) {
      nodes.forEach(function (node) { runNamedDemo(node.dataset.autoDemo).catch(function () {}); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (entry.target === computeAct) startComputeAct();
        else runNamedDemo(entry.target.dataset.autoDemo).catch(function () {});
      });
    }, { rootMargin: '260px 0px', threshold: 0.01 });
    if (computeAct) observer.observe(computeAct);
    nodes.forEach(function (node) { observer.observe(node); });
  }
  root.FokoHomeDemoReel = Object.freeze({
    run: function (name) { return runNamedDemo(name, true); },
    attempt: function (name) { return demoAttempts.get(name) || 0; },
    isRunning: function (name) {
      const card = document.querySelector('[data-demo-card="' + name + '"]');
      return Boolean(card && card.dataset.state === 'running');
    }
  });

  function init() {
    bindButtons();
    observeDemos();
    const countNode = byId('homeAtlasCount');
    if (countNode) {
      loadScript('src/models/scientific-example-catalog.js', 'FokoScientificExampleCatalog').then(function (catalog) {
        countNode.textContent = catalog.length + ' curated examples';
      }).catch(function () { countNode.textContent = 'Curated examples'; });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
