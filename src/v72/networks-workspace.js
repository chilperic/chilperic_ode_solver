/* Foko Lab v72.7 Network authored workspace.
 * The controller binds authored markup to the pure FokoNetworksReference core.
 */
(function (root) {
  'use strict';

  const CORE = root.FokoNetworksReference;
  const PRESETS = root.FokoNetworksPresets || {};
  const PLOT = root.FokoPlotLifecycle;
  const RELEASE = '72.48.0';
  const STORAGE_KEY = 'fokolab:v72.7:networks-config';
  if (!CORE || !PLOT) throw new Error('Network Lab requires FokoNetworksReference and FokoPlotLifecycle.');

  const $ = function (id) { return document.getElementById(id); };
  const state = {
    currentName: Object.keys(PRESETS)[0] || '',
    edges: null,
    result: null,
    config: null,
    runtime: 0,
    layout: 'two',
    focusSide: 'left',
    plotTypes: { left: 'graph', right: 'adjacency' },
    lastPlotSide: 'left'
  };

  const PLOTS = {
    graph: { label: 'Graph view', title: 'Deterministic circular layout', evidence: 'Node positions are assigned on a circle for reproducibility. Distance and angle in this view have no inferred scientific meaning.' },
    adjacency: { label: 'Adjacency heatmap', title: 'Weighted adjacency matrix', evidence: 'The matrix records the entered edge weights. Node order follows first appearance in the edge list.' },
    degree: { label: 'Degree ranking', title: 'Node degree', evidence: 'Degree counts incident edges. In directed graphs, the displayed total is in-degree plus out-degree.' },
    strength: { label: 'Strength ranking', title: 'Weighted node strength', evidence: 'Strength sums entered weights. Its interpretation depends on whether a larger weight means stronger connection rather than larger cost.' },
    pagerank: { label: 'PageRank', title: 'PageRank scores', evidence: 'PageRank is a damped random-walk score. Cost weights are ignored; strength weights are normalized over outgoing edges.' },
    closeness: { label: 'Closeness', title: 'Path-based closeness', evidence: 'Closeness uses weighted path costs when weights are declared as costs; otherwise unit edge costs are used. Disconnected reachability is penalized.' },
    betweenness: { label: 'Betweenness', title: 'Shortest-path betweenness', evidence: 'Betweenness counts weighted shortest paths for cost weights and unit-cost paths for strength weights. It is sensitive to ties and graph definition.' },
    shortest: { label: 'Shortest path', title: 'Selected shortest route', evidence: 'Available only when weights are declared as additive costs. The route minimizes the listed total cost and ignores uncertainty, capacity and congestion.' },
    components: { label: 'Component sizes', title: 'Connectivity components', evidence: 'Weak components ignore edge direction. Directed graphs also report strongly connected components in the diagnostics.' },
    mst: { label: 'Minimum spanning tree', title: 'Minimum spanning tree', evidence: 'Available for undirected cost graphs. The tree minimizes total listed edge weight but does not include redundancy or reliability.' },
    communities: { label: 'Community heuristic', title: 'Label-propagation groups', evidence: 'The displayed partition is a deterministic weighted label-propagation heuristic. It is not a unique or validated latent community structure.' },
    resilience: { label: 'Node-removal scenario', title: 'Degree-ordered node removal', evidence: 'Nodes are removed by descending initial degree without adaptive re-ranking. This is a scenario, not a calibrated failure probability.' }
  };
  root.FokoNetworksPlotMeta = PLOTS;

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
      edgesText: $('networksEdges').value,
      directed: $('networksDirected').value === 'true',
      weightMeaning: $('networksWeightMeaning').value,
      operation: $('networksOperation').value,
      source: $('networksSource').value.trim(),
      target: $('networksTarget').value.trim(),
      damping: Number($('networksDamping').value) || 0.85,
      maxIterations: Math.max(10, Math.floor(Number($('networksMaxIterations').value) || 500))
    };
  }

  function applyConfig(config) {
    $('networksEdges').value = config.edgesText || '';
    $('networksDirected').value = String(!!config.directed);
    $('networksWeightMeaning').value = config.weightMeaning || 'cost';
    $('networksOperation').value = config.operation || 'summary';
    $('networksSource').value = config.source || '';
    $('networksTarget').value = config.target || '';
    $('networksDamping').value = String(config.damping == null ? 0.85 : config.damping);
    $('networksMaxIterations').value = String(config.maxIterations == null ? 500 : config.maxIterations);
    clearComputedEvidence('Configuration loaded. Analyze to regenerate graph evidence.');
    previewInput();
  }

  function importNetworksFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const raw = String(reader.result || '');
        if (/\.json$/i.test(file.name)) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.edges)) {
            const edgesText = parsed.edges.map(function (edge) { return Array.isArray(edge) ? edge.join(',') : [edge.source, edge.target, edge.weight == null ? 1 : edge.weight].join(','); }).join('\n');
            applyConfig(Object.assign({}, parsed, { edgesText: edgesText }));
          } else applyConfig(parsed.config || parsed);
        } else applyConfig(Object.assign(configFromInputs(), { edgesText: raw.trim() }));
        $('networksStatus').textContent = 'Imported network input. Analyze to regenerate evidence.';
      } catch (error) { $('networksStatus').textContent = 'Import failed: ' + error.message; }
      $('networksImport').value = '';
    };
    reader.onerror = function () { $('networksStatus').textContent = 'Could not read the selected network file.'; };
    reader.readAsText(file);
  }

  function renderPresetLibrary() {
    const names = Object.keys(PRESETS);
    $('networksSelect').innerHTML = names.map(function (name) { return '<option value="' + escapeHtml(name) + '">' + escapeHtml(PRESETS[name].title) + '</option>'; }).join('');
    $('networksDeck').innerHTML = names.map(function (name) {
      const preset = PRESETS[name];
      return '<button class="' + (name === state.currentName ? 'active' : '') + '" data-preset="' + escapeHtml(name) + '" type="button"><b>' + escapeHtml(preset.title) + '</b><small>' + escapeHtml(preset.operation) + '</small></button>';
    }).join('');
    $('networksSelect').value = state.currentName;
  }

  function loadPreset(name) {
    const preset = PRESETS[name]; if (!preset) return;
    state.currentName = name;
    $('networksSelect').value = name;
    $('networksEdges').value = preset.edges;
    $('networksDirected').value = String(preset.directed);
    $('networksOperation').value = preset.operation;
    $('networksSource').value = preset.source;
    $('networksTarget').value = preset.target;
    $('networksWeightMeaning').value = ['shortest', 'mst'].indexOf(preset.operation) >= 0 ? 'cost' : 'strength';
    $('networksNarrative').textContent = preset.title;
    $('networksScientificNote').textContent = preset.note;
    document.querySelectorAll('#networksDeck [data-preset]').forEach(function (button) { button.classList.toggle('active', button.dataset.preset === name); });
    clearComputedEvidence('Example loaded. Analyze to create structural evidence.');
    previewInput();
  }

  function previewInput() {
    try {
      const edges = CORE.parseEdges($('networksEdges').value);
      const ns = CORE.nodes(edges);
      $('networksInputSummary').innerHTML = '<b>' + ns.length + '</b> nodes · <b>' + edges.length + '</b> edges · total weight <b>' + number(edges.reduce(function (sum, edge) { return sum + edge.weight; }, 0)) + '</b>';
      $('networksStatus').textContent = 'Edge list parsed. Analyze to generate results.';
    } catch (error) {
      $('networksInputSummary').textContent = error.message;
      $('networksStatus').textContent = 'Edge list is invalid.';
    }
  }

  function computeResult(edges, config) {
    const summary = CORE.summary(edges, config.directed, { damping: config.damping, maxIterations: config.maxIterations, weightMeaning: config.weightMeaning });
    const result = { summary: summary, operation: config.operation };
    if (config.operation === 'shortest') {
      if (config.weightMeaning !== 'cost') throw new Error('Shortest-path analysis requires weights to be declared as costs or distances.');
      result.shortest = CORE.shortestPath(edges, config.source, config.target, config.directed);
    } else if (config.operation === 'mst') {
      if (config.directed) throw new Error('Minimum spanning tree requires an undirected graph.');
      if (config.weightMeaning !== 'cost') throw new Error('Minimum spanning tree requires weights to be declared as costs.');
      result.mst = CORE.minimumSpanningTree(edges);
    } else if (config.operation === 'communities') {
      if (config.weightMeaning !== 'strength') throw new Error('Label propagation requires weights to be declared as connection strengths.');
      result.communities = CORE.labelPropagation(edges, config.directed, config.maxIterations);
    } else if (config.operation === 'resilience') {
      result.resilience = CORE.resilienceByNodeRemoval(edges, config.directed);
    }
    return result;
  }

  function run() {
    const started = performance.now(); $('networksProgress').style.width = '35%';
    try {
      const config = configFromInputs();
      const edges = CORE.parseEdges(config.edgesText);
      state.edges = edges; state.config = config; state.result = computeResult(edges, config); state.runtime = performance.now() - started;
      renderResult();
      $('networksStatus').textContent = 'Analysis completed. Inspect weight interpretation and structural limitations.';
      $('networksProgress').style.width = '100%';
      setTimeout(function () { $('networksProgress').style.width = '0%'; }, 350);
    } catch (error) {
      state.result = null;
      $('networksTopStatus').textContent = 'Failed'; $('networksStatus').textContent = error.message;
      $('provenanceStatus').textContent = 'Computation failed'; $('provenanceWarning').textContent = error.message;
      $('networksDiagnostics').classList.remove('empty'); $('networksDiagnostics').textContent = error.message;
      $('networksProgress').style.width = '0%';
    }
  }

  function availablePlotTypes() {
    const available = ['graph', 'adjacency', 'degree', 'strength', 'pagerank', 'closeness', 'betweenness', 'components'];
    if (state.result.shortest) available.push('shortest');
    if (state.result.mst) available.push('mst');
    if (state.result.communities) available.push('communities');
    if (state.result.resilience) available.push('resilience');
    return available;
  }

  function ensurePlotSelections(available) {
    const defaults = ['graph', 'adjacency'];
    ['left', 'right'].forEach(function (side, index) {
      if (available.indexOf(state.plotTypes[side]) < 0) state.plotTypes[side] = defaults[index] || available[0];
      const select = $(side + 'PlotType');
      select.innerHTML = available.map(function (type) { return '<option value="' + type + '">' + escapeHtml(PLOTS[type].label) + '</option>'; }).join('');
      select.value = state.plotTypes[side];
    });
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('networks');
}

  function chartLayout(xTitle, yTitle) {
    return { margin: { t: 24, r: 18, b: 56, l: 62 }, paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', font: { family: 'Inter, system-ui, sans-serif', color: '#172033', size: 11 }, xaxis: { title: xTitle, gridcolor: '#e7ebf1' }, yaxis: { title: yTitle, gridcolor: '#e7ebf1' }, legend: { orientation: 'h', y: 1.08 } };
  }

  function graphTraces(edgeSubset, communityLabels) {
    const edges = state.edges; const positions = CORE.circularLayout(edges); const ns = CORE.nodes(edges);
    const highlighted = new Set((edgeSubset || []).map(String));
    const regularX = []; const regularY = []; const highlightX = []; const highlightY = [];
    edges.forEach(function (edge, i) {
      const x = highlighted.has(String(i)) ? highlightX : regularX;
      const y = highlighted.has(String(i)) ? highlightY : regularY;
      x.push(positions[edge.source].x, positions[edge.target].x, null);
      y.push(positions[edge.source].y, positions[edge.target].y, null);
    });
    const traces = [];
    if (regularX.length) traces.push({ x: regularX, y: regularY, mode: 'lines', line: { width: 1.5 }, hoverinfo: 'skip', name: 'edges' });
    if (highlightX.length) traces.push({ x: highlightX, y: highlightY, mode: 'lines', line: { width: 5 }, hoverinfo: 'skip', name: 'selected structure' });
    const groups = communityLabels ? Array.from(new Set(ns.map(function (node) { return communityLabels[node]; }))) : ['all'];
    groups.forEach(function (group) {
      const selected = ns.filter(function (node) { return !communityLabels || communityLabels[node] === group; });
      traces.push({ x: selected.map(function (node) { return positions[node].x; }), y: selected.map(function (node) { return positions[node].y; }), mode: 'markers+text', text: selected, textposition: 'top center', marker: { size: 14 }, name: communityLabels ? 'community ' + group : 'nodes' });
    });
    return traces;
  }

  function rankedTrace(values, name) {
    const entries = Object.entries(values).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
    return { x: entries.map(function (entry) { return entry[0]; }), y: entries.map(function (entry) { return entry[1]; }), type: 'bar', name: name };
  }

  function plotSpec(type) {
    const summary = state.result.summary;
    if (type === 'graph') return { traces: graphTraces(), layout: Object.assign(chartLayout('', ''), { xaxis: { visible: false }, yaxis: { visible: false, scaleanchor: 'x' } }) };
    if (type === 'adjacency') { const adj = CORE.adjacencyMatrix(state.edges, state.config.directed); return { traces: [{ z: adj.matrix, x: adj.nodes, y: adj.nodes, type: 'heatmap', colorscale: 'Viridis', colorbar: { title: 'weight' } }], layout: chartLayout('target', 'source') }; }
    if (type === 'degree') return { traces: [rankedTrace(summary.degree.totalDegree, 'degree')], layout: chartLayout('node', 'degree') };
    if (type === 'strength') return { traces: [rankedTrace(summary.degree.totalStrength, 'strength')], layout: chartLayout('node', 'weight sum') };
    if (type === 'pagerank') return { traces: [rankedTrace(summary.pageRank.scores, 'PageRank')], layout: chartLayout('node', 'PageRank') };
    if (type === 'closeness') return { traces: [rankedTrace(summary.closeness, 'closeness')], layout: chartLayout('node', 'closeness') };
    if (type === 'betweenness') return { traces: [rankedTrace(summary.betweenness, 'betweenness')], layout: chartLayout('node', 'betweenness') };
    if (type === 'components') {
      const weak = summary.weakComponents.map(function (component) { return component.length; });
      const strong = summary.strongComponents.map(function (component) { return component.length; });
      return { traces: [{ x: weak.map(function (_, i) { return i + 1; }), y: weak, type: 'bar', name: 'weak' }, { x: strong.map(function (_, i) { return i + 1; }), y: strong, type: 'bar', name: state.config.directed ? 'strong' : 'connected' }], layout: Object.assign(chartLayout('component index', 'nodes'), { barmode: 'group' }) };
    }
    if (type === 'shortest') return { traces: graphTraces(state.result.shortest.edgeIndices), layout: Object.assign(chartLayout('', ''), { xaxis: { visible: false }, yaxis: { visible: false, scaleanchor: 'x' } }) };
    if (type === 'mst') return { traces: graphTraces(state.result.mst.edges.map(function (edge) { return edge.index; })), layout: Object.assign(chartLayout('', ''), { xaxis: { visible: false }, yaxis: { visible: false, scaleanchor: 'x' } }) };
    if (type === 'communities') return { traces: graphTraces([], state.result.communities.labels), layout: Object.assign(chartLayout('', ''), { xaxis: { visible: false }, yaxis: { visible: false, scaleanchor: 'x' } }) };
    if (type === 'resilience') {
      const steps = state.result.resilience.steps;
      return { traces: [{ x: steps.map(function (step) { return step.removedCount; }), y: steps.map(function (step) { return step.largestComponent; }), mode: 'lines+markers', name: 'largest weak component' }, { x: steps.map(function (step) { return step.removedCount; }), y: steps.map(function (step) { return step.weakComponents; }), mode: 'lines+markers', name: 'weak components', yaxis: 'y2' }], layout: Object.assign(chartLayout('removed nodes', 'largest component'), { yaxis2: { title: 'weak components', overlaying: 'y', side: 'right' } }) };
    }
    throw new Error('Unsupported plot type: ' + type);
  }

  function renderPlot(side) {
    if (!state.result) return Promise.resolve();
    const host = $(side + 'Plot');
    if (!host || host.offsetParent === null) return Promise.resolve();
    const type = state.plotTypes[side]; const definition = PLOTS[type]; const spec = plotSpec(type);
    $(side + 'PlotTitle').textContent = definition.title; $(side + 'PlotEvidence').textContent = definition.evidence;
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

  function topNode(values) {
    return Object.entries(values).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); })[0];
  }

  function diagnosticsHtml() {
    const result = state.result; const summary = result.summary;
    const rows = [
      ['Nodes / edges', summary.nodeCount + ' / ' + summary.edgeCount],
      ['Density', number(summary.density)],
      ['Weak components', summary.weakComponents.length],
      ['Strong components', state.config.directed ? summary.strongComponents.length : 'not distinct for undirected graph'],
      ['Weight treatment', summary.weightTreatment],
      ['Top total degree', topNode(summary.degree.totalDegree).join(': ')],
      ['Top PageRank', topNode(summary.pageRank.scores)[0] + ': ' + number(topNode(summary.pageRank.scores)[1])],
      ['PageRank convergence', summary.pageRank.converged ? 'yes in ' + summary.pageRank.iterations + ' iterations' : 'not reached']
    ];
    if (result.shortest) rows.push(['Shortest path', result.shortest.reachable ? result.shortest.path.join(' → ') + ' · cost ' + number(result.shortest.distance) : 'unreachable']);
    if (result.mst) rows.push(['MST', result.mst.complete ? result.mst.edges.length + ' edges · weight ' + number(result.mst.totalWeight) : 'forest; graph disconnected']);
    if (result.communities) rows.push(['Communities', result.communities.communities.length + ' groups · ' + result.communities.method]);
    if (result.resilience) rows.push(['Removal strategy', result.resilience.strategy]);
    const warnings = [];
    if (summary.selfLoops) warnings.push(summary.selfLoops + ' self-loop(s) are present; density and centrality interpretation may need adjustment.');
    if (summary.weakComponents.length > 1) warnings.push('The graph is disconnected; path-based centralities include a reachability penalty.');
    if (state.config.operation === 'communities') warnings.push('Label propagation is heuristic and can be unstable under small graph changes.');
    if (state.config.operation === 'resilience') warnings.push('Removal order is fixed from initial degree and is not adaptively recomputed.');
    return '<table class="diagnostic-table"><tbody>' + rows.map(function (row) { return '<tr><th>' + escapeHtml(row[0]) + '</th><td>' + escapeHtml(row[1]) + '</td></tr>'; }).join('') + '</tbody></table>' + (warnings.length ? '<h3>Warnings</h3><ul>' + warnings.map(function (warning) { return '<li>' + escapeHtml(warning) + '</li>'; }).join('') + '</ul>' : '<p>No automatic structural warning was triggered. This is not evidence that the graph definition is correct.</p>');
  }

  function methodDescription() {
    return {
      summary: 'Graph summary with explicit weight-treatment rules',
      shortest: 'Dijkstra shortest path for non-negative additive costs',
      centrality: 'Degree, PageRank and path-based centrality comparison',
      mst: 'Kruskal minimum spanning tree for an undirected cost graph',
      communities: 'Deterministic weighted label propagation heuristic',
      resilience: 'Descending-initial-degree node-removal scenario'
    }[state.config.operation];
  }

  function weightMetric() {
    if (state.result.shortest) return state.result.shortest.reachable ? state.result.shortest.distance : Infinity;
    if (state.result.mst) return state.result.mst.totalWeight;
    return state.result.summary.totalWeight;
  }

  function renderResult() {
    const summary = state.result.summary;
    $('networksTopStatus').textContent = 'Computed'; $('networksRuntime').textContent = number(state.runtime, 1) + ' ms';
    $('networksSize').textContent = summary.nodeCount + ' / ' + summary.edgeCount;
    $('networksDirection').textContent = state.config.directed ? 'directed' : 'undirected';
    $('networksOperationMetric').textContent = state.config.operation;
    $('networksDensity').textContent = number(summary.density);
    $('networksComponents').textContent = String(summary.weakComponents.length);
    $('networksMaxDegree').textContent = number(Math.max.apply(null, Object.values(summary.degree.totalDegree)));
    $('networksWeightMetric').textContent = number(weightMetric());
    $('networksDiagnostics').classList.remove('empty'); $('networksDiagnostics').innerHTML = diagnosticsHtml();
    $('networksResultKind').textContent = state.config.operation + ' · ' + summary.nodeCount + ' nodes · ' + summary.edgeCount + ' edges';
    $('provenanceStatus').textContent = 'Browser-computed small graph result';
    $('provenanceMethod').textContent = methodDescription();
    $('provenanceData').textContent = summary.nodeCount + ' nodes; ' + summary.edgeCount + ' edges; ' + (state.config.directed ? 'directed' : 'undirected');
    $('provenanceAssumptions').textContent = 'Weights declared as ' + state.config.weightMeaning + '. ' + summary.weightTreatment + '.';
    $('provenanceReproducibility').textContent = 'Configuration only; result must be recomputed';
    $('provenanceWarning').textContent = summary.nodeCount > 150 ? 'Graph is large for the browser reference. Export to a specialized graph library.' : 'No automatic warning was triggered. Graph construction and measurement assumptions still require validation.';
    renderPlots();
  }

  function clearPlot(side) {
    const host = $(side + 'Plot'); PLOT.clear(host, 'Analyze to create a plot.'); $(side + 'PlotEvidence').textContent = 'No plot has been computed.';
  }

  function clearComputedEvidence(message) {
    state.edges = null; state.result = null; state.config = null; state.runtime = 0;
    ['left', 'right'].forEach(clearPlot);
    $('networksResultKind').textContent = 'No computed graph result'; $('networksTopStatus').textContent = 'Ready'; $('networksRuntime').textContent = '—'; $('networksSize').textContent = '—'; $('networksDirection').textContent = '—'; $('networksOperationMetric').textContent = '—'; $('networksDensity').textContent = '—'; $('networksComponents').textContent = '—'; $('networksMaxDegree').textContent = '—'; $('networksWeightMetric').textContent = '—';
    $('networksDiagnostics').classList.add('empty'); $('networksDiagnostics').textContent = message || 'Analyze to see metrics, paths, components and limitations.';
    $('provenanceStatus').textContent = 'Not computed'; $('provenanceMethod').textContent = 'Not run'; $('provenanceData').textContent = 'Not parsed'; $('provenanceAssumptions').textContent = 'Not assessed'; $('provenanceReproducibility').textContent = 'Configuration only'; $('provenanceWarning').textContent = 'No numerical result exists yet.';
  }

  function effectiveLayout(requested) {
    return root.FokoLayoutStability.effectiveLayout(requested, { breakpoint: 1024, compatibleCount: 2 });
  }
  function applyLayout(requested, updateState) {
    if (updateState !== false) state.layout = requested === 'focus' ? 'focus' : 'two';
    const report = root.FokoLayoutStability.apply({
      grid: $('plotGrid'),
      preferred: state.layout,
      focus: state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2
    });
    if (state.result) renderPlots();
    if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('networks');
    return report;
  }

  function exportCurrent(format, side) {
    if (!state.result) return;
    const selected = side || state.lastPlotSide; root.Plotly.downloadImage($(selected + 'Plot'), { format: format, filename: 'fokolab-networks-' + state.plotTypes[selected], width: 1200, height: 760 });
  }
  function metricsCsv() {
    const s = state.result.summary;
    const rows = [['metric','value'],['nodes',s.nodeCount],['edges',s.edgeCount],['density',s.density],['weak_components',s.weakComponents.length],['strong_components',s.strongComponents.length],['total_weight',s.totalWeight],['operation_weight',weightMetric()]];
    return rows.map(function (row) { return row.join(','); }).join('\n') + '\n';
  }
  function pythonScript() {
    const graphClass = state.config.directed ? 'DiGraph' : 'Graph';
    const componentCall = state.config.directed ? 'list(nx.weakly_connected_components(G))' : 'list(nx.connected_components(G))';
    return `# Foko Lab v${RELEASE} NetworkX validation scaffold
import networkx as nx

edges = ${JSON.stringify(state.edges.map(function (edge) { return [edge.source, edge.target, edge.weight]; }))}
G = nx.${graphClass}()
G.add_weighted_edges_from(edges)
print("nodes", G.number_of_nodes(), "edges", G.number_of_edges())
print("density", nx.density(G))
print("weak/connected components", ${componentCall})
# Check weight semantics before using shortest paths, PageRank or community algorithms.
`;
  }

  function bindEvents() {
    $('runNetworks').addEventListener('click', run);
    $('resetNetworks').addEventListener('click', function () { loadPreset(state.currentName); });
    $('networksImport').addEventListener('change', function () { importNetworksFile(this.files && this.files[0]); });
    $('loadNetworks').addEventListener('click', function () { loadPreset($('networksSelect').value); });
    $('networksSelect').addEventListener('change', function () { state.currentName = this.value; loadPreset(this.value); });
    $('networksDeck').addEventListener('click', function (event) { const button = event.target.closest('[data-preset]'); if (button) loadPreset(button.dataset.preset); });
    $('networksEdges').addEventListener('input', previewInput);
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) { button.addEventListener('click', function () { applyLayout(button.dataset.layoutMode, true); }); });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) { button.addEventListener('click', function () { state.focusSide = button.dataset.focusSide; applyLayout('focus', true); }); });
    ['left','right'].forEach(function (side) { $(side + 'PlotType').addEventListener('change', function () { state.plotTypes[side] = this.value; renderPlot(side); }); });
    document.querySelectorAll('[data-export-side]').forEach(function (button) { button.addEventListener('click', function () { exportCurrent('png', button.dataset.exportSide); }); });
    $('exportNetworksPng').addEventListener('click', function () { exportCurrent('png'); }); $('exportNetworksSvg').addEventListener('click', function () { exportCurrent('svg'); });
    $('saveNetworksSession').addEventListener('click', function () { localStorage.setItem(STORAGE_KEY, JSON.stringify(configFromInputs())); $('networksStatus').textContent = 'Configuration saved locally. Computed evidence was not stored.'; });
    $('restoreNetworksSession').addEventListener('click', function () { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) { $('networksStatus').textContent = 'No saved configuration exists.'; return; } applyConfig(JSON.parse(raw)); $('networksStatus').textContent = 'Configuration restored. Computed evidence was not restored.'; });
    $('copyNetworksShareUrl').addEventListener('click', function () { const url = new URL(window.location.href); url.searchParams.set('state', encodeState(configFromInputs())); navigator.clipboard.writeText(url.toString()).then(function () { $('networksStatus').textContent = 'Share URL copied. It contains configuration only.'; }); });
    $('exportNetworksCsv').addEventListener('click', function () { if (state.result) download('fokolab-network-metrics.csv', metricsCsv(), 'text/csv'); });
    $('exportNetworksJson').addEventListener('click', function () { if (state.result) download('fokolab-network-result.json', JSON.stringify({ release: RELEASE, config: state.config, result: state.result }, null, 2), 'application/json'); });
    $('exportNetworksPython').addEventListener('click', function () { if (state.result) download('fokolab_network_validate.py', pythonScript(), 'text/x-python'); });
    document.querySelectorAll('[data-jump]').forEach(function (button) { button.addEventListener('click', function () { const target = document.querySelector(button.dataset.jump); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    window.addEventListener('resize', function () { applyLayout(state.layout, false); });
  }

  function restoreFromUrl() {
    const encoded = new URL(window.location.href).searchParams.get('state'); if (!encoded) return false;
    try { applyConfig(decodeState(encoded)); $('networksStatus').textContent = 'Configuration loaded from URL. Analyze to regenerate evidence.'; return true; }
    catch (_) { $('networksStatus').textContent = 'Share state could not be decoded.'; return false; }
  }

  function boot() { renderPresetLibrary(); bindEvents(); if (!restoreFromUrl()) { const requested = new URL(window.location.href).searchParams.get('example'); loadPreset(requested && PRESETS[requested] ? requested : state.currentName); setTimeout(run, 40); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}(typeof window !== 'undefined' ? window : globalThis));
