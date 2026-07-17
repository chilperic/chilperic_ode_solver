/* Foko Lab v72.47.0 central scientific example and plot compatibility registry.
 *
 * Goals:
 * - one source of truth for example provenance and plot compatibility;
 * - stable two-panel selection that never silently falls back to one panel;
 * - plot selection is orthogonal to layout state;
 * - each focused workspace is the sole owner of Two-up/Focus state;
 * - plot-choice metadata is registered without synthetic change events;
 * - no DOM relocation or shell reconstruction; focused labs may use an attribute-only invariant observer.
 */
(function (root) {
  'use strict';

  const LAB_PAGE_MAP = {
    ode: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'exampleSelect', cards: ['left', 'right'] },
    steady: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'steadySelect', cards: ['left', 'right'] },
    stochastic: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'stochasticSelect', cards: ['left', 'right'] },
    optimization: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'optimizationSelect', cards: ['left', 'right'] },
    statistics: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'statisticsSelect', cards: ['left', 'right'] },
    fitting: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'fittingSelect', cards: ['left', 'right'] },
    linalg: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'linalgSelect', cards: ['left', 'right'] },
    networks: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'networksSelect', cards: ['left', 'right'] },
    ml: { gridId: 'mlPlotGrid', selects: ['leftMlPlotType', 'rightMlPlotType'], exampleSelect: 'mlPresetSelect', cards: ['left', 'right'] },
    sciml: { gridId: 'plotGrid', selects: ['sciPlotType', 'sciPlotType2'], exampleSelect: 'sciExample', cards: ['left', 'right'] },
    agent: { gridId: 'agentPlotGrid', selects: ['leftAgentPlotType', 'rightAgentPlotType'], exampleSelect: 'agentPresetSelect', cards: ['left', 'right'] },
    symbolic: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'symbolicSelect', cards: ['left', 'right'] },
    sensitivity: { gridId: 'plotGrid', selects: ['leftPlotType', 'rightPlotType'], exampleSelect: 'sensitivitySelect', cards: ['left', 'right'] }
  };

  const registry = Object.create(null);
  const pageControllers = Object.create(null);
  const EXAMPLE_GLOBALS = {
    steady: 'FokoSteadyPresets', stochastic: 'FokoStochasticPresets', optimization: 'FokoOptimizationPresets',
    statistics: 'FokoStatisticsPresets', fitting: 'FokoFittingPresets', linalg: 'FokoLinalgPresets',
    networks: 'FokoNetworksPresets', ml: 'FokoMLPresets', agent: 'FokoAgentPresets', symbolic: 'FokoSymbolicPresets',
    sciml: 'FokoSciMLExamples', sensitivity: 'FokoSensitivityPresets'
  };
  const PLOT_GLOBALS = {
    agent: 'FokoAgentPlotMeta', fitting: 'FokoFittingPlotMeta', linalg: 'FokoLinalgPlotMeta',
    networks: 'FokoNetworksPlotMeta', ml: 'FokoMLPlotMeta', steady: 'FokoSteadyPlotMeta',
    stochastic: 'FokoStochasticPlotMeta', sciml: 'FokoSciMLPlotMeta', optimization: 'FokoOptimizationPlotMeta',
    sensitivity: 'FokoSensitivityPlotMeta'
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizePlotMap(plots) {
    const out = Object.create(null);
    if (Array.isArray(plots)) {
      plots.forEach(function (entry) {
        if (typeof entry === 'string') out[entry] = { id: entry, label: entry };
        else if (entry && entry.id) out[entry.id] = Object.assign({ id: entry.id, label: entry.label || entry.title || entry.id }, clone(entry));
      });
      return out;
    }
    Object.keys(plots || {}).forEach(function (id) {
      const value = plots[id];
      out[id] = Object.assign({ id: id, label: value && (value.label || value.title) || id }, clone(value || {}));
    });
    return out;
  }

  function normalizeExamples(examples) {
    if (!examples) return [];
    if (Array.isArray(examples)) {
      return examples.map(function (entry, index) {
        if (typeof entry === 'string') return { id: entry, title: entry, provenance: 'unspecified', order: index };
        return Object.assign({ id: entry.id || entry.key || entry.title || String(index), title: entry.title || entry.label || entry.id || String(index), provenance: entry.provenance || entry.source || 'unspecified', order: index }, clone(entry));
      });
    }
    return Object.keys(examples).map(function (id, index) {
      const entry = examples[id] || {};
      return Object.assign({ id: id, title: entry.title || entry.label || id, provenance: entry.provenance || entry.source || 'unspecified', order: index }, clone(entry));
    });
  }

  function ensureLab(labId) {
    if (!registry[labId]) registry[labId] = { id: labId, plots: Object.create(null), examples: [], compatiblePlotIds: [] };
    return registry[labId];
  }

  function registerLab(labId, definition) {
    const lab = ensureLab(labId);
    const def = definition || {};
    if (def.plots) {
      const incomingPlots = normalizePlotMap(def.plots);
      Object.keys(incomingPlots).forEach(function (id) {
        lab.plots[id] = Object.assign({}, lab.plots[id] || {}, incomingPlots[id]);
      });
    }
    if (def.examples) {
      const priorById = Object.create(null);
      lab.examples.forEach(function (entry) { priorById[entry.id] = entry; });
      lab.examples = normalizeExamples(def.examples).map(function (entry) {
        return Object.assign({}, priorById[entry.id] || {}, entry);
      });
    }
    if (def.compatiblePlotIds) lab.compatiblePlotIds = Array.from(new Set(def.compatiblePlotIds.map(String)));
    if (def.modelId) lab.modelId = String(def.modelId);
    if (def.computationBoundary) lab.computationBoundary = String(def.computationBoundary);
    return clone(lab);
  }

  function registerPlots(labId, plots) {
    return registerLab(labId, { plots: plots });
  }

  function registerExamples(labId, examples) {
    return registerLab(labId, { examples: examples });
  }

  function setCompatiblePlots(labId, plotIds) {
    const lab = ensureLab(labId);
    lab.compatiblePlotIds = Array.from(new Set((plotIds || []).filter(Boolean).map(String)));
    const controller = pageControllers[labId];
    if (controller) controller.refresh();
    return lab.compatiblePlotIds.slice();
  }

  function getLab(labId) {
    const lab = registry[labId];
    return lab ? clone(lab) : null;
  }

  function chooseDistinctSelections(options, requested, changedIndex) {
    const ids = Array.from(new Set((options || []).filter(Boolean).map(String)));
    const current = Array.isArray(requested) ? requested.map(String) : [];
    if (!ids.length) return [];
    if (ids.length === 1) return [ids[0], ids[0]];

    const result = [
      ids.includes(current[0]) ? current[0] : ids[0],
      ids.includes(current[1]) ? current[1] : ids.find(function (id) { return id !== (ids.includes(current[0]) ? current[0] : ids[0]); })
    ];

    if (result[0] === result[1]) {
      const changed = changedIndex === 1 ? 1 : 0;
      const other = changed === 0 ? 1 : 0;
      const replacement = ids.find(function (id) { return id !== result[changed]; });
      result[other] = replacement || result[other];
    }
    return result;
  }

  function resolveLayout(preferred, width, compatibleCount, minimumTwoWidth) {
    const requested = preferred === 'focus' ? 'focus' : 'two';
    const minWidth = Number.isFinite(minimumTwoWidth) ? minimumTwoWidth : 720;
    if (requested === 'focus') return { preferred: 'focus', effective: 'focus', reason: 'user-focus' };
    if ((compatibleCount || 0) < 2) return { preferred: 'two', effective: 'focus', reason: 'single-compatible-plot' };
    if (Number(width || 0) < minWidth) return { preferred: 'two', effective: 'focus', reason: 'narrow-viewport' };
    return { preferred: 'two', effective: 'two', reason: 'two-compatible-plots' };
  }

  function labelsFromSelect(select) {
    return Array.from(select && select.options || []).map(function (option) {
      return { id: option.value, label: option.textContent.trim(), disabled: option.disabled === true };
    }).filter(function (entry) { return entry.id && !entry.disabled && entry.id !== 'none'; });
  }

  function pageLabId() {
    const body = document.body;
    if (!body) return '';
    const explicit = body.dataset.lab;
    if (explicit === 'linear-algebra') return 'linalg';
    return explicit || '';
  }

  function createPageController(labId, config) {
    const page = Object.assign({}, LAB_PAGE_MAP[labId] || {}, config || {});
    const grid = document.getElementById(page.gridId);
    const selects = (page.selects || []).map(function (id) { return document.getElementById(id); }).filter(Boolean).slice(0, 2);
    if (!grid || !selects.length) return null;

    const controller = {
      labId: labId,
      grid: grid,
      selects: selects,
      refreshing: false,
      lastSelections: selects.map(function (select) { return select.value; }),
      refresh: refresh,
      enforce: reportLayout,
      destroy: destroy
    };

    function registerExamplesFromPage() {
      const select = page.exampleSelect ? document.getElementById(page.exampleSelect) : null;
      if (!select) return;
      const existing = ensureLab(labId);
      const options = Array.from(select.options || []).filter(function (option) { return option.value; }).map(function (option, index) {
        const prior = existing.examples.find(function (entry) { return entry.id === option.value; }) || {};
        return Object.assign({ id: option.value, title: option.textContent.trim(), provenance: 'declared-by-lab', order: index }, prior);
      });
      if (options.length) registerExamples(labId, options);
    }

    function availableOptions() {
      const first = labelsFromSelect(selects[0]);
      const second = labelsFromSelect(selects[1] || selects[0]);
      const secondIds = new Set(second.map(function (entry) { return entry.id; }));
      const common = first.filter(function (entry) { return secondIds.has(entry.id); });
      return common.length ? common : first.length ? first : second;
    }

    function reconcile(changedIndex) {
      const options = availableOptions();
      if (!options.length) return [];
      const ids = options.map(function (entry) { return entry.id; });
      const requested = selects.map(function (select) { return select.value; });
      controller.lastSelections = requested.slice();
      registerLab(labId, { plots: options, compatiblePlotIds: ids });
      return requested;
    }


    function reportLayout() {
      return {
        preferred: grid.dataset.preferredLayout || grid.dataset.layout || 'two',
        effective: grid.dataset.layout || 'two',
        reason: grid.dataset.layoutReason || 'owned-by-focused-lab'
      };
    }

    function refresh(changedIndex) {
      if (controller.refreshing) return reportLayout();
      controller.refreshing = true;
      try {
        registerExamplesFromPage();
        reconcile(changedIndex);
        return reportLayout();
      } finally {
        controller.refreshing = false;
      }
    }

    function destroy() {
      delete pageControllers[labId];
    }

    // The registry is metadata-only. Focused workspaces own plot selection,
    // rendering, layout, resizing, and persistence. This avoids a second event
    // path racing the workspace after a selector change.

    pageControllers[labId] = controller;
    refresh();
    return controller;
  }

  function notifyOptionsChanged(labId) {
    const id = labId || pageLabId();
    const controller = pageControllers[id];
    if (controller) return controller.refresh();
    return null;
  }

  function notifyRendered(labId) {
    const id = labId || pageLabId();
    const controller = pageControllers[id];
    return controller ? controller.enforce() : null;
  }

  function autoAttach() {
    const labId = pageLabId();
    if (!labId || !LAB_PAGE_MAP[labId]) return;
    const examplesGlobal = EXAMPLE_GLOBALS[labId];
    const plotsGlobal = PLOT_GLOBALS[labId];
    if (examplesGlobal && root[examplesGlobal]) registerExamples(labId, root[examplesGlobal]);
    if (plotsGlobal && root[plotsGlobal]) registerPlots(labId, root[plotsGlobal]);
    createPageController(labId);
  }

  root.FokoScientificRegistry = {
    registerLab: registerLab,
    registerPlots: registerPlots,
    registerExamples: registerExamples,
    setCompatiblePlots: setCompatiblePlots,
    getLab: getLab,
    chooseDistinctSelections: chooseDistinctSelections,
    resolveLayout: resolveLayout,
    createPageController: createPageController,
    notifyOptionsChanged: notifyOptionsChanged,
    notifyRendered: notifyRendered,
    labs: registry
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoAttach, { once: true });
    else autoAttach();
  }
}(typeof window !== 'undefined' ? window : globalThis));
