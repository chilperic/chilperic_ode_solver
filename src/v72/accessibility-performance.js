/* Foko Lab shared plot lifecycle.
 * Serializes Plotly operations per stable host and renders only after layout settles.
 * Workspaces own layout and plot selection; this module owns Plotly mount/update timing.
 */
(function (root) {
  'use strict';

  const entries = new WeakMap();

  function stateFor(node) {
    let state = entries.get(node);
    if (!state) {
      state = { requested: 0, queue: Promise.resolve(), lastError: null };
      entries.set(node, state);
    }
    return state;
  }

  function nextFrame() {
    return new Promise(function (resolve) { root.requestAnimationFrame(resolve); });
  }

  async function afterLayout() {
    await nextFrame();
    await nextFrame();
  }

  function isVisible(node) {
    if (!node || node.offsetParent === null) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 24 && rect.height > 24;
  }

  function messageNode(message) {
    const div = document.createElement('div');
    div.className = 'diagnostics empty';
    div.textContent = message;
    return div;
  }

  function mounted(node) {
    return Boolean(node && (node.classList.contains('js-plotly-plot') || (node._fullLayout && Array.isArray(node.data))));
  }

  function plotTitleText(title) {
    if (typeof title === 'string') return title.trim();
    if (title && typeof title.text === 'string') return title.text.trim();
    return '';
  }

  function cartesianTraces(traces) {
    const special = new Set(['scatter3d', 'surface', 'mesh3d', 'cone', 'streamtube', 'sankey', 'parcoords', 'pie', 'sunburst', 'treemap', 'table', 'indicator', 'scatterpolar', 'barpolar', 'scatterternary']);
    return !Array.from(traces || []).some(function (trace) { return special.has(String(trace && trace.type || 'scatter').toLowerCase()); });
  }

  function legendTraceCount(traces) {
    return Array.from(traces || []).filter(function (trace) {
      if (!trace || trace.showlegend === false) return false;
      const type = String(trace.type || 'scatter').toLowerCase();
      if (['heatmap', 'contour', 'surface', 'image', 'histogram2d', 'histogram2dcontour'].includes(type) && !trace.name) return false;
      return Boolean(String(trace.name || '').trim());
    }).length;
  }

  function normaliseAxis(axis, fallbackTitle) {
    const next = Object.assign({}, axis || {});
    const rawTitle = next.title;
    const titleText = typeof rawTitle === 'string' ? rawTitle : rawTitle && rawTitle.text;
    next.title = Object.assign({}, typeof rawTitle === 'object' ? rawTitle : {}, {
      text: titleText == null ? (fallbackTitle || '') : titleText,
      standoff: Math.max(12, Number(rawTitle && rawTitle.standoff) || 0)
    });
    next.automargin = true;
    next.ticklabeloverflow = next.ticklabeloverflow || 'hide past div';
    return next;
  }

  function normalisePlotLayout(host, traces, layout) {
    const source = layout || {};
    const next = Object.assign({}, source);
    const margin = Object.assign({}, source.margin || {});
    const card = host && host.closest ? host.closest('.chart-card, .wb-plot-card') : null;
    const originalTitle = plotTitleText(source.title);
    const isCartesian = cartesianTraces(traces);
    const legendCount = legendTraceCount(traces);
    const showLegend = source.showlegend !== false && legendCount > 0;

    next.meta = Object.assign({}, source.meta || {}, originalTitle ? { fokoPlotTitle: originalTitle } : {});
    if (card) next.title = { text: '' };

    if (isCartesian) {
      next.xaxis = normaliseAxis(source.xaxis, '');
      next.yaxis = normaliseAxis(source.yaxis, '');
      margin.l = Math.max(62, Number(margin.l) || 0);
      margin.r = Math.max(26, Number(margin.r) || 0);
      margin.b = Math.max(72, Number(margin.b) || 0);
      margin.t = Math.max(showLegend ? 74 : 30, Number(margin.t) || 0);
      if (showLegend) {
        next.legend = Object.assign({}, source.legend || {}, {
          orientation: 'h',
          x: 0,
          xanchor: 'left',
          y: 1.035,
          yanchor: 'bottom',
          traceorder: 'normal',
          font: Object.assign({ size: 10 }, source.legend && source.legend.font || {})
        });
      }
    } else {
      margin.t = Math.max(card ? 24 : 42, Number(margin.t) || 0);
      margin.b = Math.max(28, Number(margin.b) || 0);
      margin.l = Math.max(12, Number(margin.l) || 0);
      margin.r = Math.max(18, Number(margin.r) || 0);
    }
    next.margin = margin;
    next.autosize = source.autosize !== false;
    return next;
  }

  root.FokoPlotLayout = Object.freeze({
    normalize: normalisePlotLayout,
    isCartesian: cartesianTraces,
    legendTraceCount: legendTraceCount
  });

  function setLifecycleState(node, state, busy) {
    if (!node) return;
    node.dataset.renderState = state;
    node.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function render(node, traces, layout, config) {
    if (!node) return Promise.resolve({ skipped: true, reason: 'missing-host' });
    const state = stateFor(node);
    const generation = ++state.requested;
    state.queue = state.queue.catch(function () {}).then(async function () {
      if (generation !== state.requested) return { stale: true };
      await afterLayout();
      if (generation !== state.requested) return { stale: true };
      if (!isVisible(node)) {
        setLifecycleState(node, 'pending', false);
        return { skipped: true, reason: 'hidden-host' };
      }
      if (!root.Plotly) throw new Error('Plotly is unavailable.');
      setLifecycleState(node, 'rendering', true);
      try {
        let result;
        if (mounted(node)) {
          result = await root.Plotly.react(node, traces, layout, config || {});
        } else {
          result = await root.Plotly.newPlot(node, traces, layout, config || {});
        }
        if (generation !== state.requested) return { stale: true, result: result };
        await nextFrame();
        if (generation === state.requested && isVisible(node) && root.Plotly.Plots) {
          try { root.Plotly.Plots.resize(node); } catch (_) { /* geometry can change again */ }
        }
        setLifecycleState(node, 'rendered', false);
        state.lastError = null;
        return { result: result };
      } catch (error) {
        if (generation !== state.requested) return { stale: true, error: error };
        state.lastError = error;
        try { root.Plotly.purge(node); } catch (_) { /* no mounted plot */ }
        node.replaceChildren(messageNode('Plot could not be rendered: ' + (error.message || error)));
        setLifecycleState(node, 'failed', false);
        return { error: error };
      }
    });
    return state.queue;
  }


  function takeover(node, stateName) {
    if (!node) return null;
    const state = stateFor(node);
    state.requested += 1;
    try { if (root.Plotly) root.Plotly.purge(node); } catch (_) { /* no mounted plot */ }
    node.replaceChildren();
    setLifecycleState(node, stateName || 'rendering', (stateName || 'rendering') === 'rendering');
    return node;
  }

  function clear(node, message) {
    if (!node) return Promise.resolve();
    const state = stateFor(node);
    const generation = ++state.requested;
    state.queue = state.queue.catch(function () {}).then(function () {
      if (generation !== state.requested) return;
      try { if (root.Plotly) root.Plotly.purge(node); } catch (_) { /* no mounted plot */ }
      node.replaceChildren(messageNode(message || 'No plot is available.'));
      setLifecycleState(node, 'empty', false);
    });
    return state.queue;
  }

  function resize(node) {
    if (!mounted(node) || !isVisible(node) || !root.Plotly || !root.Plotly.Plots) return;
    try { root.Plotly.Plots.resize(node); } catch (_) { /* no-op */ }
  }

  root.FokoPlotLifecycle = {
    afterLayout: afterLayout,
    clear: clear,
    isVisible: isVisible,
    mounted: mounted,
    render: render,
    resize: resize,
    setState: setLifecycleState,
    takeover: takeover
  };
}(typeof window !== 'undefined' ? window : globalThis));
/* Foko Lab v72.17 — shared accessibility and performance instrumentation.
 * No page-shell reconstruction, no arbitrary body mutation after initialization.
 */
(function (root) {
  'use strict';
  const RELEASE = '72.47.0';
  const telemetry = {
    release: RELEASE,
    startedAt: typeof performance !== 'undefined' ? performance.now() : 0,
    plots: [],
    longTasks: [],
    resources: null,
  };

  function text(node) { return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function closestTitle(plot) {
    const card = plot && plot.closest ? plot.closest('.chart-card, .wb-plot-card') : null;
    return text(card && card.querySelector('h2, h3, [id*="PlotTitle"], .wb-plot-title')) || 'Scientific plot';
  }
  function describePlot(plot, title, state) {
    if (!plot) return;
    plot.setAttribute('role', 'img');
    if (!plot.hasAttribute('tabindex')) plot.setAttribute('tabindex', '0');
    const suffix = state === 'rendered' ? 'Computed interactive plot.' : state === 'failed' ? 'Plot rendering failed; inspect the visible error.' : 'Plot area.';
    plot.setAttribute('aria-label', (title || closestTitle(plot)) + '. ' + suffix);
    if (state) plot.dataset.renderState = state;
  }
  function plotNode(value) {
    if (typeof value === 'string') return document.getElementById(value);
    return value && value.nodeType === 1 ? value : null;
  }
  function wrapPlotly() {
    const Plotly = root.Plotly;
    if (!Plotly || Plotly.__fokoA11yWrapped) return;
    ['newPlot', 'react'].forEach(function (method) {
      const original = Plotly[method];
      if (typeof original !== 'function') return;
      Plotly[method] = function () {
        const args = Array.prototype.slice.call(arguments);
        const host = plotNode(args[0]);
        if (host && root.FokoPlotLayout && typeof root.FokoPlotLayout.normalize === 'function') {
          args[2] = root.FokoPlotLayout.normalize(host, args[1], args[2]);
        }
        const title = args[2] && args[2].meta && args[2].meta.fokoPlotTitle
          ? args[2].meta.fokoPlotTitle
          : args[2] && args[2].title && (args[2].title.text || args[2].title);
        const started = performance.now();
        if (host) {
          host.setAttribute('aria-busy', 'true');
          describePlot(host, typeof title === 'string' ? title : closestTitle(host), 'rendering');
        }
        let output;
        try { output = original.apply(Plotly, args); }
        catch (error) {
          if (host) {
            host.setAttribute('aria-busy', 'false');
            describePlot(host, closestTitle(host), 'failed');
          }
          telemetry.plots.push({ method: method, id: host && host.id || '', status: 'failed', durationMs: performance.now() - started });
          throw error;
        }
        return Promise.resolve(output).then(function (result) {
          const durationMs = performance.now() - started;
          if (host) {
            host.setAttribute('aria-busy', 'false');
            describePlot(host, typeof title === 'string' ? title : closestTitle(host), 'rendered');
          }
          telemetry.plots.push({ method: method, id: host && host.id || '', status: 'rendered', durationMs: durationMs });
          document.dispatchEvent(new CustomEvent('foko:plot-rendered', { detail: { id: host && host.id || '', durationMs: durationMs } }));
          return result;
        }, function (error) {
          const durationMs = performance.now() - started;
          if (host) {
            host.setAttribute('aria-busy', 'false');
            describePlot(host, closestTitle(host), 'failed');
          }
          telemetry.plots.push({ method: method, id: host && host.id || '', status: 'failed', durationMs: durationMs });
          throw error;
        });
      };
    });
    Plotly.__fokoA11yWrapped = true;
  }

  function updatePressed(groupSelector, buttonSelector, activeClass) {
    document.querySelectorAll(groupSelector).forEach(function (group) {
      group.querySelectorAll(buttonSelector).forEach(function (button) {
        button.setAttribute('aria-pressed', button.classList.contains(activeClass || 'active') ? 'true' : 'false');
      });
      group.addEventListener('click', function () {
        requestAnimationFrame(function () {
          group.querySelectorAll(buttonSelector).forEach(function (button) {
            button.setAttribute('aria-pressed', button.classList.contains(activeClass || 'active') ? 'true' : 'false');
          });
        });
      });
    });
  }

  function wireArrowNavigation(groupSelector, itemSelector) {
    document.querySelectorAll(groupSelector).forEach(function (group) {
      if (group.dataset.fokoArrowNavigation === 'true') return;
      group.dataset.fokoArrowNavigation = 'true';
      group.addEventListener('keydown', function (event) {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const items = Array.from(group.querySelectorAll(itemSelector)).filter(function (node) {
          return !node.disabled && node.getAttribute('aria-hidden') !== 'true';
        });
        if (!items.length) return;
        const target = event.target && event.target.closest ? event.target.closest(itemSelector) : null;
        const currentIndex = items.indexOf(target);
        const current = currentIndex >= 0 ? currentIndex : Math.max(0, items.indexOf(document.activeElement));
        let next = current;
        if (event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
        if (event.key === 'ArrowRight') next = (current + 1) % items.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = items.length - 1;
        event.preventDefault();
        event.stopPropagation();
        items[next].focus();
      }, true);
    });
  }

  function enhanceStaticSemantics() {
    const main = document.querySelector('main');
    if (main && !main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    document.querySelectorAll('.plot').forEach(function (plot) {
      describePlot(plot, closestTitle(plot), plot.querySelector('.js-plotly-plot, canvas, svg') ? 'rendered' : 'idle');
      if (!plot.hasAttribute('aria-busy')) plot.setAttribute('aria-busy', 'false');
    });
    document.querySelectorAll('.status, [id$="Status"], [id*="TopStatus"]').forEach(function (node) {
      if (!node.hasAttribute('role')) node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-atomic', 'true');
    });
    document.querySelectorAll('.focus-card').forEach(function (button) {
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Focus this plot');
    });
    document.querySelectorAll('.kebab, [data-export-side], [data-wb-download]').forEach(function (button) {
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Export this plot');
    });
    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      if (!link.getAttribute('aria-label') && text(link)) link.setAttribute('aria-label', text(link) + ' (opens in a new tab)');
    });
    document.querySelectorAll('.side-nav').forEach(function (nav) {
      if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Lab sections');
      nav.querySelectorAll('.nav-item').forEach(function (item) {
        item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
      });
    });
    updatePressed('.v72-layout-switch', 'button', 'active');
    updatePressed('.mode-strip', 'button', 'active');
    // Arrow keys move focus only. Each lab remains the sole owner of layout state.
    wireArrowNavigation('.v72-layout-switch', 'button');
    wireArrowNavigation('.mode-strip', 'button');
    wireArrowNavigation('.side-nav', '.nav-item');
  }

  function collectResourceSummary() {
    if (!performance || !performance.getEntriesByType) return;
    const entries = performance.getEntriesByType('resource');
    telemetry.resources = {
      count: entries.length,
      transferBytes: entries.reduce(function (sum, entry) { return sum + (entry.transferSize || 0); }, 0),
      decodedBytes: entries.reduce(function (sum, entry) { return sum + (entry.decodedBodySize || 0); }, 0),
      scriptCount: entries.filter(function (entry) { return entry.initiatorType === 'script'; }).length,
    };
  }

  function initLongTaskObserver() {
    if (!('PerformanceObserver' in root)) return;
    try {
      const observer = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          telemetry.longTasks.push({ startTime: entry.startTime, durationMs: entry.duration });
        });
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch (_) { /* Long Task API is not available in every browser. */ }
  }

  function init() {
    document.documentElement.classList.add('v72-accessibility-ready');
    wrapPlotly();
    enhanceStaticSemantics();
    initLongTaskObserver();
    root.addEventListener('load', function () { setTimeout(collectResourceSummary, 0); }, { once: true });
  }

  root.FokoPerformance = {
    release: RELEASE,
    getReport: function () {
      collectResourceSummary();
      const navigation = performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
      return JSON.parse(JSON.stringify({
        release: RELEASE,
        navigation: navigation ? {
          domContentLoadedMs: navigation.domContentLoadedEventEnd,
          loadMs: navigation.loadEventEnd,
          transferBytes: navigation.transferSize || 0,
        } : null,
        resources: telemetry.resources,
        plots: telemetry.plots,
        longTasks: telemetry.longTasks,
      }));
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
/* Foko Lab shared Plotly theme bridge.
 * Theme changes must alter existing plots, not only the surrounding controls. */
(function (root) {
  'use strict';
  function palette() {
    const css = root.getComputedStyle(document.documentElement);
    function value(name, fallback) { return css.getPropertyValue(name).trim() || fallback; }
    return {
      surface: value('--surface', '#ffffff'),
      ink: value('--ink', '#11253a'),
      muted: value('--muted', '#5d6f82'),
      line: value('--line', '#c9dbe7')
    };
  }
  function relayout(node) {
    if (!node || !node.isConnected || !root.Plotly || typeof root.Plotly.relayout !== 'function') return;
    const p = palette();
    const update = {
      paper_bgcolor: p.surface,
      plot_bgcolor: p.surface,
      'font.color': p.ink
    };
    const layout = node._fullLayout || node.layout || {};
    if (layout.xaxis) Object.assign(update, { 'xaxis.color': p.muted, 'xaxis.gridcolor': p.line });
    if (layout.yaxis) Object.assign(update, { 'yaxis.color': p.muted, 'yaxis.gridcolor': p.line });
    if (layout.scene) Object.assign(update, {
      'scene.bgcolor': p.surface,
      'scene.xaxis.color': p.muted,
      'scene.yaxis.color': p.muted,
      'scene.zaxis.color': p.muted
    });
    if (layout.polar) update['polar.bgcolor'] = p.surface;
    if (layout.ternary) update['ternary.bgcolor'] = p.surface;
    try { root.Plotly.relayout(node, update); } catch (_) { /* non-Plotly fallback host */ }
  }
  function refresh() {
    document.querySelectorAll('.js-plotly-plot').forEach(relayout);
  }
  root.addEventListener('foko-theme-change', function () { root.requestAnimationFrame(refresh); });
  document.addEventListener('foko:plot-rendered', function (event) {
    const node = event.target && event.target.closest ? event.target.closest('.js-plotly-plot') : null;
    if (node) root.requestAnimationFrame(function () { relayout(node); });
  }, true);
  root.FokoPlotTheme = Object.freeze({ refresh: refresh, relayout: relayout, palette: palette });
}(typeof window !== 'undefined' ? window : globalThis));

/* Foko Lab shared mathematical typesetting boundary.
 * All maintained workspaces use one KaTeX contract with an explicit readable
 * fallback, bounded block geometry, MathML output and overflow reporting. */
(function (root) {
  'use strict';
  function resolveTarget(target) {
    if (typeof target === 'string') return document.getElementById(target) || document.querySelector(target);
    return target || null;
  }
  function markOverflow(node) {
    if (!node || !node.isConnected) return;
    node.dataset.mathOverflow = String(node.scrollWidth > node.clientWidth + 2);
  }
  function readableFallback(node, latex, error) {
    node.classList.add('foko-math-fallback');
    node.textContent = latex;
    node.dataset.mathStatus = 'fallback';
    if (error && error.message) node.title = 'Math rendering fallback: ' + error.message;
    markOverflow(node);
    return false;
  }
  function render(target, latex, options) {
    const node = resolveTarget(target);
    if (!node) return false;
    const source = String(latex == null ? '' : latex).trim();
    node.classList.add('foko-math-output');
    node.classList.remove('foko-math-fallback');
    node.removeAttribute('title');
    node.dataset.latexSource = source;
    node.dataset.mathOverflow = 'false';
    if (!source) {
      node.replaceChildren();
      node.dataset.mathStatus = 'empty';
      return true;
    }
    if (!root.katex || typeof root.katex.render !== 'function') return readableFallback(node, source, new Error('KaTeX is unavailable'));
    try {
      root.katex.render(source, node, Object.assign({
        displayMode: true,
        throwOnError: true,
        strict: false,
        trust: false,
        output: 'htmlAndMathml'
      }, options || {}));
      node.dataset.mathStatus = 'rendered';
      root.requestAnimationFrame(function () { markOverflow(node); });
      return true;
    } catch (error) {
      return readableFallback(node, source, error);
    }
  }
  root.addEventListener('resize', function () {
    document.querySelectorAll('.foko-math-output').forEach(markOverflow);
  }, { passive: true });
  root.FokoMathRender = Object.freeze({ render: render, markOverflow: markOverflow });
}(typeof window !== 'undefined' ? window : globalThis));

/* Foko Lab shared plot-layout stability controller.
 * The ODE workspace is the reference contract: preferred layout is explicit
 * user state; effective layout is only a responsive/compatibility projection.
 * Plot selection and asynchronous rendering never rewrite the preference.
 */
(function (root) {
  'use strict';

  const VALID_LAYOUTS = new Set(['two', 'focus']);
  const VALID_SIDES = new Set(['left', 'right']);
  const DEFAULT_BREAKPOINT = 1024;
  const records = new WeakMap();

  function safeLayout(value) { return VALID_LAYOUTS.has(value) ? value : 'two'; }
  function safeSide(value) { return VALID_SIDES.has(value) ? value : 'left'; }
  function finiteCount(value) {
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 2;
  }
  function effectiveLayout(preferred, options) {
    const opts = options || {};
    const breakpoint = Number.isFinite(Number(opts.breakpoint)) ? Number(opts.breakpoint) : DEFAULT_BREAKPOINT;
    const compatibleCount = finiteCount(opts.compatibleCount);
    if (root.innerWidth < breakpoint) return 'focus';
    if (compatibleCount < 2) return 'focus';
    return safeLayout(preferred);
  }
  function layoutReason(preferred, effective, compatibleCount) {
    if (effective === preferred) return 'user-' + preferred;
    if (compatibleCount < 2) return 'single-compatible-plot';
    return 'narrow-viewport';
  }
  function syncLayoutButtons(record) {
    document.querySelectorAll(record.layoutButtons).forEach(function (button) {
      const value = button.dataset.layoutMode || button.dataset.wbLayout;
      const active = value === record.preferred;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function syncFocusButtons(record, effective) {
    document.querySelectorAll(record.focusButtons).forEach(function (button) {
      const value = button.dataset.focusSide || (button.dataset.wbFocus === '1' ? 'right' : 'left');
      button.setAttribute('aria-pressed', String(effective === 'focus' && value === record.focus));
    });
  }
  function writeRecord(record) {
    const grid = record.grid;
    if (!grid || !grid.isConnected) return null;
    const effective = effectiveLayout(record.preferred, record);
    grid.dataset.preferredLayout = record.preferred;
    grid.dataset.layout = effective;
    grid.dataset.layoutReason = layoutReason(record.preferred, effective, record.compatibleCount);
    grid.dataset.focusSide = record.focus;
    if (grid.id === 'wbPlotGrid') {
      grid.classList.remove('layout-two', 'layout-three', 'layout-focus');
      grid.classList.add('layout-' + effective);
      document.querySelectorAll('.wb-plot-card').forEach(function (card, index) {
        card.classList.toggle('focused', (record.focus === 'right' ? 1 : 0) === index);
      });
    }
    syncLayoutButtons(record);
    syncFocusButtons(record, effective);
    return {
      preferred: record.preferred,
      effective: effective,
      focus: record.focus,
      reason: grid.dataset.layoutReason,
      compatibleCount: record.compatibleCount
    };
  }
  function apply(options) {
    const opts = options || {};
    const grid = opts.grid;
    if (!grid) return null;
    const record = records.get(grid) || { grid: grid };
    record.grid = grid;
    record.preferred = safeLayout(opts.preferred == null ? record.preferred : opts.preferred);
    record.focus = safeSide(opts.focus == null ? record.focus : opts.focus);
    record.breakpoint = Number.isFinite(Number(opts.breakpoint)) ? Number(opts.breakpoint) : (record.breakpoint || DEFAULT_BREAKPOINT);
    record.compatibleCount = finiteCount(opts.compatibleCount == null ? record.compatibleCount : opts.compatibleCount);
    record.layoutButtons = opts.layoutButtons || record.layoutButtons || '[data-layout-mode]';
    record.focusButtons = opts.focusButtons || record.focusButtons || '[data-focus-side]';
    records.set(grid, record);
    return writeRecord(record);
  }
  function recordForGrid(grid) { return grid ? records.get(grid) || null : null; }
  function closestRegisteredGrid(node) {
    if (!node) return null;
    const direct = node.closest && node.closest('#agentPlotGrid, #mlPlotGrid, #wbPlotGrid, #plotGrid');
    if (direct && records.has(direct)) return direct;
    for (const id of ['agentPlotGrid', 'mlPlotGrid', 'wbPlotGrid', 'plotGrid']) {
      const grid = document.getElementById(id);
      if (grid && records.has(grid)) return grid;
    }
    return null;
  }
  function refreshAll() {
    ['agentPlotGrid', 'mlPlotGrid', 'wbPlotGrid', 'plotGrid'].forEach(function (id) {
      const grid = document.getElementById(id);
      const record = grid && records.get(grid);
      if (record) writeRecord(record);
    });
  }

  document.addEventListener('foko:plot-rendered', function (event) {
    const grid = closestRegisteredGrid(event.target);
    const record = grid && records.get(grid);
    if (record) writeRecord(record);
  }, true);
  root.addEventListener('resize', refreshAll, { passive: true });

  root.FokoLayoutStability = Object.freeze({
    apply: apply,
    effectiveLayout: effectiveLayout,
    refresh: refreshAll,
    preferredFor: function (grid) {
      const record = recordForGrid(grid);
      return record ? record.preferred : null;
    },
    reportFor: function (grid) {
      const record = recordForGrid(grid);
      return record ? writeRecord(record) : null;
    }
  });
}(typeof window !== 'undefined' ? window : globalThis));
