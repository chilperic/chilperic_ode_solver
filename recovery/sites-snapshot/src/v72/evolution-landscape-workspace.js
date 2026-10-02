(function (root) {
  'use strict';
  const Core = root.FokoEvolutionLandscapeCore;
  const $ = function (id) { return document.getElementById(id); };
  if (!Core) return;
  let result = null;
  let animationTimer = null;

  const options = [
    ['fitness', 'Mean and best fitness'],
    ['diversity', 'Diversity and entropy'],
    ['distance', 'Distance to global optimum'],
    ['landscape', 'Enumerated fitness landscape'],
    ['fitness-heatmap', 'Fitness landscape heatmap'],
    ['contour', 'Fitness contours + population'],
    ['landscape-3d', '3D fitness landscape'],
    ['live-4d', 'Live 3D population + adaptive path'],
    ['final', 'Final genotype frequencies'],
    ['occupancy', 'Population occupancy heatmap']
  ];
  const evidence = {
    fitness: 'Mean and best fitness are summaries from one seeded finite realization, not ensemble expectations.',
    diversity: 'Diversity counts occupied genotypes; entropy uses their finite-population frequencies.',
    distance: 'Hamming distance follows the dominant genotype and can increase under drift or mutation.',
    landscape: 'Every binary genotype is enumerated. Genotype-index adjacency is not necessarily Hamming adjacency.',
    'fitness-heatmap': 'The binary genotype is split into two bit groups to create a lossless 2D map. Neighbouring cells are a display convention.',
    contour: 'Contours show fitness; bubble area and colour show population frequency at the selected generation. The slider supplies time.',
    'landscape-3d': 'The two horizontal axes encode the two genotype bit groups and height encodes fitness. This is a lossless finite projection, not phenotype geometry.',
    'live-4d': 'The two horizontal axes are a lossless split of the binary genotype, height is fitness, bubble size/colour are current frequency, and the generation-coloured line is the dominant-genotype path. Play or scrub changes the retained generation; camera orientation is preserved.',
    final: 'Final frequencies show one realization and do not establish mutation–selection equilibrium.',
    occupancy: 'Retained snapshots reveal movement through genotype space; genotype index ordering is a plotting convention.'
  };

  function value(id) { return $(id).value; }
  function escapeHtml(input) { return String(input || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function read() {
    return {
      type: value('evType'), length: Number(value('evLength')), k: Number(value('evK')),
      landscapeSeed: Number(value('evLandscapeSeed')), optimum: value('evOptimum'),
      customFitness: value('evCustomFitness'), population: Number(value('evPopulation')),
      generations: Number(value('evGenerations')), selection: Number(value('evSelection')),
      mutation: Number(value('evMutation')), initialGenotype: value('evInitial'), seed: Number(value('evSeed'))
    };
  }
  function apply(preset) {
    const length = Number(preset.length == null ? 7 : preset.length);
    const config = Object.assign({ type: 'nk', length: length, k: 2, landscapeSeed: 731,
      optimum: '1'.repeat(length), customFitness: '', population: 240, generations: 160,
      selection: 4, mutation: .01, initialGenotype: '0'.repeat(length), seed: 1729 }, preset);
    const map = { type: 'evType', length: 'evLength', k: 'evK', landscapeSeed: 'evLandscapeSeed',
      optimum: 'evOptimum', customFitness: 'evCustomFitness', population: 'evPopulation',
      generations: 'evGenerations', selection: 'evSelection', mutation: 'evMutation',
      initialGenotype: 'evInitial', seed: 'evSeed' };
    Object.keys(map).forEach(function (key) { $(map[key]).value = config[key]; });
    syncInputs();
  }
  function syncInputs() {
    $('evCustomDetails').open = value('evType') === 'custom';
    const n = Number(value('evLength'));
    if (value('evOptimum').length !== n) $('evOptimum').value = '1'.repeat(n);
    if (value('evInitial').length !== n) $('evInitial').value = '0'.repeat(n);
    renderEvolutionEquations();
  }
  function renderEvolutionEquations() {
    const target=$('evEquationPreview');if(!target)return;
    try {
      const length=Math.max(1,Number(value('evLength'))||1),selection=Number(value('evSelection')),mutation=Number(value('evMutation')),population=Math.max(1,Number(value('evPopulation'))||1);
      const source='\\begin{aligned}w_i^{(g)}&=n_i^{(g)}\\exp\\!\\left['+selection+'\\left(f_i-f_{\\max}\\right)\\right]\\\\[3pt]p_i^{(g)}&=\\frac{w_i^{(g)}}{\\sum_j w_j^{(g)}}\\\\[3pt]M_{ij}&='+mutation+'^{d_H(i,j)}(1-'+mutation+')^{'+length+'-d_H(i,j)}\\\\[3pt]\\mathbf n^{(g+1)}&\\sim\\operatorname{Multinomial}\\!\\left('+population+',\\;\\mathbf p^{(g)}M\\right)\\end{aligned}';
      target.dataset.invalid='false';root.FokoMathRender.render(target,source,{displayMode:true,throwOnError:true});
    } catch (error) { target.dataset.invalid='true';target.textContent='Evolution equation preview unavailable: '+(error.message||error); }
  }
  function showPresetInfo(preset) {
    $('evPresetInfo').textContent = preset ? preset.family + ' · ' + preset.summary : 'Custom landscape configuration.';
    document.querySelectorAll('[data-ev-preset]').forEach(function (button) { button.classList.toggle('active', preset && button.dataset.evPreset === preset.id); });
  }
  function loadPreset(preset, shouldRun) {
    if (!preset) return;
    $('evPreset').value = preset.id;
    apply(preset);
    showPresetInfo(preset);
    history.replaceState(null, '', '?example=' + encodeURIComponent(preset.id));
    if (shouldRun) run();
  }
  function layout(title, x, y) {
    return { title: title, xaxis: { title: x }, yaxis: { title: y }, margin: { l: 62, r: 24, t: 30, b: 68 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', hovermode: 'closest' };
  }
  function projection() {
    const leftBits = Math.ceil(result.landscape.length / 2);
    const rightBits = result.landscape.length - leftBits;
    const xValues = Array.from({ length: 2 ** leftBits }, function (_, i) { return i; });
    const yValues = Array.from({ length: 2 ** rightBits }, function (_, i) { return i; });
    const z = yValues.map(function () { return new Array(xValues.length).fill(null); });
    const coords = result.landscape.values.map(function (fitness, index) {
      const genotype = Core.bits(index, result.landscape.length);
      const x = parseInt(genotype.slice(0, leftBits), 2);
      const y = rightBits ? parseInt(genotype.slice(leftBits), 2) : 0;
      z[y][x] = fitness;
      return { index: index, genotype: genotype, x: x, y: y, fitness: fitness };
    });
    return { xValues: xValues, yValues: yValues, z: z, coords: coords, leftBits: leftBits, rightBits: rightBits };
  }
  function activeSnapshot() {
    if (!result) return null;
    const index = Math.max(0, Math.min(result.snapshots.length - 1, Number($('evSnapshot').value) || 0));
    return result.snapshots[index];
  }
  function activeSnapshotIndex() {
    if (!result) return 0;
    return Math.max(0, Math.min(result.snapshots.length - 1, Number($('evSnapshot').value) || 0));
  }
  function dominantIndex(counts) {
    let best = 0;
    for (let index = 1; index < counts.length; index += 1) if (counts[index] > counts[best]) best = index;
    return best;
  }
  function populationPoints(map) {
    const snapshot = activeSnapshot();
    if (!snapshot) return [];
    return map.coords.filter(function (point) { return snapshot.counts[point.index] > 0; }).map(function (point) {
      const frequency = snapshot.counts[point.index] / result.config.population;
      return Object.assign({ frequency: frequency, generation: snapshot.generation }, point);
    });
  }
  function view(kind) {
    const history = result.history;
    if (kind === 'fitness') return { traces: [
      { x: history.map(function (r) { return r.generation; }), y: history.map(function (r) { return r.meanFitness; }), mode: 'lines', line: { color: '#008b92', width: 3 }, name: 'mean fitness' },
      { x: history.map(function (r) { return r.generation; }), y: history.map(function (r) { return r.bestFitness; }), mode: 'lines', line: { color: '#7c3aed', width: 2, dash: 'dot' }, name: 'best occupied fitness' }
    ], layout: layout('Fitness through time', 'Generation', 'Fitness') };
    if (kind === 'diversity') return { traces: [
      { x: history.map(function (r) { return r.generation; }), y: history.map(function (r) { return r.diversity; }), mode: 'lines', line: { color: '#315f9f', width: 3 }, name: 'occupied genotypes', yaxis: 'y' },
      { x: history.map(function (r) { return r.generation; }), y: history.map(function (r) { return r.entropy; }), mode: 'lines', line: { color: '#d97706', width: 2 }, name: 'Shannon entropy', yaxis: 'y2' }
    ], layout: Object.assign(layout('Genotypic diversity', 'Generation', 'Occupied genotypes'), { yaxis2: { title: 'Entropy', overlaying: 'y', side: 'right' } }) };
    if (kind === 'distance') return { traces: [{ x: history.map(function (r) { return r.generation; }), y: history.map(function (r) { return r.distanceToOptimum; }), mode: 'lines+markers', marker: { size: 3 }, line: { color: '#b42318', width: 2 }, name: 'dominant distance' }], layout: layout('Dominant-genotype distance to global optimum', 'Generation', 'Hamming distance') };
    if (kind === 'landscape') return { traces: [
      { x: result.landscape.values.map(function (_, i) { return i; }), y: result.landscape.values, mode: 'markers', marker: { size: 6, color: result.landscape.values, colorscale: 'Viridis', showscale: true, colorbar: { title: 'Fitness' } }, text: result.landscape.values.map(function (_, i) { return Core.bits(i, result.landscape.length); }), name: 'genotypes' },
      { x: history.map(function (r) { return r.dominantIndex; }), y: history.map(function (r) { return result.landscape.values[r.dominantIndex]; }), mode: 'lines+markers', line: { color: '#b42318', width: 2 }, marker: { size: 4 }, name: 'dominant path' }
    ], layout: layout('Finite fitness landscape and dominant path', 'Genotype index', 'Fitness') };
    const map = projection();
    if (kind === 'fitness-heatmap') return { traces: [{ z: map.z, x: map.xValues, y: map.yValues, type: 'heatmap', colorscale: 'Viridis', colorbar: { title: 'Fitness' } }], layout: layout('Fitness landscape heatmap', 'Leading-bit index (' + map.leftBits + ' bits)', 'Trailing-bit index (' + map.rightBits + ' bits)') };
    if (kind === 'contour') {
      const points = populationPoints(map);
      return { traces: [
        { z: map.z, x: map.xValues, y: map.yValues, type: 'contour', colorscale: 'Viridis', contours: { coloring: 'heatmap' }, colorbar: { title: 'Fitness' }, name: 'fitness contours' },
        { x: points.map(function (p) { return p.x; }), y: points.map(function (p) { return p.y; }), mode: 'markers', marker: { size: points.map(function (p) { return 6 + 30 * Math.sqrt(p.frequency); }), color: points.map(function (p) { return p.frequency; }), colorscale: 'YlOrRd', cmin: 0, cmax: 1, line: { color: '#fff', width: 1 }, colorbar: { title: 'Frequency', x: 1.15 } }, text: points.map(function (p) { return p.genotype + ' · ' + (100 * p.frequency).toFixed(1) + '%'; }), name: 'population' }
      ], layout: layout('Fitness contours and population · generation ' + activeSnapshot().generation, 'Leading-bit index', 'Trailing-bit index') };
    }
    if (kind === 'landscape-3d' || kind === 'live-4d') {
      const points = populationPoints(map);
      const traces = [{ x: map.xValues, y: map.yValues, z: map.z, type: 'surface', colorscale: 'Viridis', opacity: kind === 'live-4d' ? .64 : .92, colorbar: { title: 'Fitness', thickness: 12, x: 1.02 }, name: 'fitness surface', hovertemplate: 'leading %{x}<br>trailing %{y}<br>fitness %{z:.5f}<extra></extra>' }];
      if (kind === 'live-4d') {
        const snapshotIndex = activeSnapshotIndex();
        const path = result.snapshots.slice(0, snapshotIndex + 1).map(function (snapshot, index) {
          const point = map.coords[dominantIndex(snapshot.counts)];
          return Object.assign({ generation: snapshot.generation, progress: result.snapshots.length > 1 ? index / (result.snapshots.length - 1) : 0 }, point);
        });
        traces.push({
          x: path.map(function (p) { return p.x; }), y: path.map(function (p) { return p.y; }), z: path.map(function (p) { return p.fitness; }),
          type: 'scatter3d', mode: 'lines+markers',
          line: { width: 7, color: path.map(function (p) { return p.progress; }), colorscale: 'Turbo', cmin: 0, cmax: 1, colorbar: { title: 'Generation progress', thickness: 12, x: -.12 } },
          marker: { size: 3.5, color: path.map(function (p) { return p.progress; }), colorscale: 'Turbo', cmin: 0, cmax: 1 },
          text: path.map(function (p) { return p.genotype + ' · generation ' + p.generation + ' · fitness ' + p.fitness.toFixed(5); }),
          hovertemplate: '%{text}<extra></extra>', name: 'dominant path'
        });
        traces.push({ x: points.map(function (p) { return p.x; }), y: points.map(function (p) { return p.y; }), z: points.map(function (p) { return p.fitness + .025 * (result.landscape.maximum - result.landscape.minimum || 1); }), type: 'scatter3d', mode: 'markers', marker: { size: points.map(function (p) { return 4 + 22 * Math.sqrt(p.frequency); }), color: points.map(function (p) { return p.frequency; }), colorscale: 'YlOrRd', cmin: 0, cmax: 1, opacity: .92, line: { color: '#ffffff', width: .45 }, colorbar: { title: 'Frequency', thickness: 12, x: 1.13 } }, text: points.map(function (p) { return p.genotype + ' · ' + (100 * p.frequency).toFixed(1) + '% · generation ' + p.generation; }), hovertemplate: '%{text}<extra></extra>', name: 'current population' });
        if (path.length) {
          const start = path[0], current = path[path.length - 1];
          traces.push({ x: [start.x], y: [start.y], z: [start.fitness], type: 'scatter3d', mode: 'markers', marker: { size: 8, color: '#111827', symbol: 'cross' }, text: ['Start · ' + start.genotype], hovertemplate: '%{text}<extra></extra>', name: 'start' });
          traces.push({ x: [current.x], y: [current.y], z: [current.fitness], type: 'scatter3d', mode: 'markers', marker: { size: 10, color: '#39d353', symbol: 'diamond', line: { color: '#ffffff', width: 1 } }, text: [(snapshotIndex === result.snapshots.length - 1 ? 'End' : 'Current') + ' · ' + current.genotype], hovertemplate: '%{text}<extra></extra>', name: snapshotIndex === result.snapshots.length - 1 ? 'end' : 'current' });
        }
      }
      else {
        const best = map.coords[result.landscape.bestIndex];
        traces.push({ x: [best.x], y: [best.y], z: [best.fitness], type: 'scatter3d', mode: 'markers', marker: { size: 7, color: '#b42318', symbol: 'diamond' }, text: [best.genotype], name: 'global optimum' });
      }
      return { traces: traces, layout: { title: kind === 'live-4d' ? 'Live population and adaptive path · generation ' + activeSnapshot().generation : '3D fitness landscape', uirevision: kind === 'live-4d' ? 'foko-evolution-live-camera' : 'foko-evolution-surface-camera', scene: { uirevision: kind === 'live-4d' ? 'foko-evolution-live-camera' : 'foko-evolution-surface-camera', xaxis: { title: 'Leading-bit index' }, yaxis: { title: 'Trailing-bit index' }, zaxis: { title: 'Fitness' }, camera: { eye: { x: 1.45, y: 1.45, z: 1.1 } }, aspectmode: 'manual', aspectratio: { x: 1, y: 1, z: .78 } }, margin: { l: 15, r: 15, t: 42, b: 15 }, paper_bgcolor: 'rgba(0,0,0,0)' } };
    }
    if (kind === 'occupancy') return { traces: [{ z: result.snapshots.map(function (s) { return s.counts.map(function (count) { return count / result.config.population; }); }), x: result.landscape.values.map(function (_, i) { return i; }), y: result.snapshots.map(function (s) { return s.generation; }), type: 'heatmap', colorscale: 'Viridis', colorbar: { title: 'Frequency' } }], layout: layout('Retained population occupancy', 'Genotype index', 'Generation') };
    const entries = result.finalCounts.map(function (count, index) { return { count: count, index: index }; }).filter(function (entry) { return entry.count; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 30);
    return { traces: [{ x: entries.map(function (entry) { return Core.bits(entry.index, result.landscape.length); }), y: entries.map(function (entry) { return entry.count / result.config.population; }), type: 'bar', marker: { color: entries.map(function (entry) { return result.landscape.values[entry.index]; }), colorscale: 'Viridis' }, name: 'final frequency' }], layout: layout('Final occupied genotypes (top 30)', 'Genotype', 'Frequency') };
  }
  function renderSide(side) {
    const select = $(side + 'EvPlotType');
    const choice = options.find(function (option) { return option[0] === select.value; }) || options[0];
    const visual = view(choice[0]);
    $(side + 'EvPlotTitle').textContent = choice[1];
    $(side + 'EvEvidence').textContent = evidence[choice[0]];
    root.FokoPlotLifecycle.render($(side + 'EvPlot'), visual.traces, visual.layout, { responsive: true, displaylogo: false });
  }
  function renderTimeViews() {
    if (!result) return;
    const snapshot = activeSnapshot();
    $('evSnapshotLabel').textContent = snapshot ? 'Generation ' + snapshot.generation + ' · frame ' + (activeSnapshotIndex() + 1) + '/' + result.snapshots.length : '0';
    ['left', 'right'].forEach(function (side) {
      if (['contour', 'live-4d'].includes($(side + 'EvPlotType').value)) renderSide(side);
    });
  }
  function stopAnimation() {
    if (animationTimer) root.clearTimeout(animationTimer);
    animationTimer = null;
    $('evPlay').textContent = '▶ Play evolution';
    $('evPlay').setAttribute('aria-pressed', 'false');
  }
  function scheduleAnimation() {
    if (!animationTimer || !result) return;
    const delay = Number(value('evPlaybackSpeed')) || 520;
    if (animationTimer !== true) root.clearTimeout(animationTimer);
    animationTimer = root.setTimeout(function () {
      if (!animationTimer || !result) return;
      const slider = $('evSnapshot');
      const atEnd = Number(slider.value) >= Number(slider.max);
      if (atEnd && !$('evLoop').checked) { stopAnimation(); $('evPlay').textContent = '↻ Replay evolution'; return; }
      slider.value = atEnd ? 0 : Number(slider.value) + 1;
      renderTimeViews();
      scheduleAnimation();
    }, delay);
  }
  function toggleAnimation() {
    if (!result) return;
    if (animationTimer) { stopAnimation(); return; }
    if (Number($('evSnapshot').value) >= Number($('evSnapshot').max)) $('evSnapshot').value = 0;
    $('evPlay').textContent = '❚❚ Pause';
    $('evPlay').setAttribute('aria-pressed', 'true');
    animationTimer = true;
    renderTimeViews();
    scheduleAnimation();
  }
  function stepAnimation(delta) {
    if (!result) return;
    stopAnimation();
    const slider = $('evSnapshot');
    slider.value = String(Math.max(0, Math.min(Number(slider.max), Number(slider.value) + delta)));
    renderTimeViews();
  }
  function run() {
    try {
      stopAnimation();
      $('evStatus').textContent = 'Simulating seeded population…';
      result = Core.simulate(read());
      $('evSnapshot').max = result.snapshots.length - 1;
      $('evSnapshot').value = result.snapshots.length - 1;
      $('evSnapshotLabel').textContent = 'Generation ' + result.snapshots[result.snapshots.length - 1].generation + ' · frame ' + result.snapshots.length + '/' + result.snapshots.length;
      renderSide('left'); renderSide('right');
      const last = result.history[result.history.length - 1];
      $('evTopStatus').textContent = 'Computed'; $('evBest').textContent = result.landscape.bestGenotype;
      $('evDominant').textContent = last.dominantGenotype; $('evMean').textContent = last.meanFitness.toFixed(4);
      $('evDiversity').textContent = last.diversity; $('evDistance').textContent = last.distanceToOptimum;
      $('evResultKind').textContent = result.config.population + ' individuals · ' + result.config.generations + ' generations · seed ' + result.config.seed;
      $('evDiagnostics').classList.remove('empty');
      $('evDiagnostics').textContent = result.method + '\n\n' + result.limitations.map(function (item) { return '• ' + item; }).join('\n');
      $('evStatus').textContent = 'Simulation complete. Use Play evolution for the retained time snapshots.';
    } catch (error) {
      $('evTopStatus').textContent = 'Input error'; $('evStatus').textContent = error.message;
    }
  }
  function downloadResult() {
    if (!result) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    link.download = 'evolution-landscape-result.json'; link.click();
    root.setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
  }
  function init() {
    Core.presets.forEach(function (preset) {
      const option = document.createElement('option'); option.value = preset.id; option.textContent = preset.title; $('evPreset').appendChild(option);
    });
    $('evPresetDeck').innerHTML = Core.presets.map(function (preset) {
      return '<button class="model-card" data-ev-preset="' + escapeHtml(preset.id) + '" type="button"><b>' + escapeHtml(preset.title) + '</b><small>' + escapeHtml(preset.family) + '</small><span>' + escapeHtml(preset.summary) + '</span></button>';
    }).join('');
    options.forEach(function (option) { ['leftEvPlotType', 'rightEvPlotType'].forEach(function (id) { const node = document.createElement('option'); node.value = option[0]; node.textContent = option[1]; $(id).appendChild(node); }); });
    $('leftEvPlotType').value = 'fitness'; $('rightEvPlotType').value = 'live-4d';
    $('evType').addEventListener('change', syncInputs); $('evLength').addEventListener('change', syncInputs); ['evPopulation','evSelection','evMutation'].forEach(function(id){$(id).addEventListener('input',renderEvolutionEquations);});
    $('runEvolution').addEventListener('click', run); $('evPlay').addEventListener('click', toggleAnimation);
    $('evStepBack').addEventListener('click', function () { stepAnimation(-1); });
    $('evStepForward').addEventListener('click', function () { stepAnimation(1); });
    $('evPlaybackSpeed').addEventListener('change', function () { if (animationTimer) scheduleAnimation(); });
    $('evSnapshot').addEventListener('input', renderTimeViews);
    $('evPreset').addEventListener('change', function () { showPresetInfo(Core.presets.find(function (preset) { return preset.id === value('evPreset'); })); });
    $('loadEvPreset').addEventListener('click', function () { loadPreset(Core.presets.find(function (preset) { return preset.id === value('evPreset'); }), true); });
    $('evPresetDeck').addEventListener('click', function (event) { const button = event.target.closest('[data-ev-preset]'); if (button) loadPreset(Core.presets.find(function (preset) { return preset.id === button.dataset.evPreset; }), true); });
    $('generateEvTemplate').addEventListener('click', function () { const n = Number(value('evLength')); $('evCustomFitness').value = Array.from({ length: 2 ** n }, function (_, i) { return Core.bits(i, n) + ',0'; }).join('\n'); $('evType').value = 'custom'; syncInputs(); });
    ['left', 'right'].forEach(function (side) { $(side + 'EvPlotType').addEventListener('change', function () { if (result) renderSide(side); }); });
    $('saveEv').addEventListener('click', function () { localStorage.setItem('fokolab:evolution', JSON.stringify(read())); $('evStatus').textContent = 'Model saved locally.'; });
    $('restoreEv').addEventListener('click', function () { const config = JSON.parse(localStorage.getItem('fokolab:evolution') || 'null'); if (config) { apply(config); showPresetInfo(null); run(); } });
    $('exportEv').addEventListener('click', downloadResult);
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) { button.addEventListener('click', function () { $('plotGrid').dataset.layout = button.dataset.layoutMode; document.querySelectorAll('[data-layout-mode]').forEach(function (item) { item.classList.toggle('active', item === button); }); root.dispatchEvent(new Event('resize')); }); });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) { button.addEventListener('click', function () { $('plotGrid').dataset.focusSide = button.dataset.focusSide; $('plotGrid').dataset.layout = 'focus'; root.dispatchEvent(new Event('resize')); }); });
    document.querySelectorAll('.side-nav [data-jump]').forEach(function (button) { button.addEventListener('click', function () { document.querySelector(button.dataset.jump).scrollIntoView({ behavior: 'smooth' }); }); });
    root.addEventListener('pagehide', stopAnimation);
    const requested = new URLSearchParams(location.search).get('example');
    const preset = Core.presets.find(function (item) { return item.id === requested; }) || Core.presets[0];
    $('evPreset').value = preset.id; apply(preset); showPresetInfo(preset); run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}(typeof window !== 'undefined' ? window : globalThis));
