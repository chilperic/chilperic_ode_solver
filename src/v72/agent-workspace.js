/* Foko Lab v72.48.0 live Agent workspace.
 * Worker-backed finite ensembles, explicit rendering states, cancellation,
 * deterministic fallback graphics, and model-specific endpoint evidence.
 */
(function (root) {
  'use strict';
  const CORE = root.FokoAgentReference;
  const PRESETS = root.FokoAgentPresets || {};
  const PLOT = root.FokoPlotLifecycle;
  const RELEASE = '72.48.0';
  const STORAGE_KEY = 'fokolab:v72.16:agent-config';
  const LAYOUT_STORAGE_KEY = 'fokolab:v72:agent-layout';
  const VALID_LAYOUTS = new Set(['two', 'focus']);
  const VALID_SIDES = new Set(['left', 'right']);
  if (!CORE) throw new Error('Agent Lab requires FokoAgentReference.');
  if (!PLOT) throw new Error('Agent Lab requires FokoPlotLifecycle.');
  const $ = function (id) { return document.getElementById(id); };
  const SIDES = ['left', 'right'];
  const state = {
    preset: Object.keys(PRESETS)[0] || '', result: null, runtime: 0, renderRuntime: 0,
    layout: 'two', effectiveLayout: 'two', focusSide: 'left', lastPlotSide: 'left',
    plotTypes: { left: 'spatial-dynamics', right: 'population' },
    customModel: null,
    plotSerial: { left: 0, right: 0 },
    animations: { left: null, right: null },
    runSerial: 0, worker: null, fallback: null, activeRequestId: null, cancelled: false,
    live: { active: false, paused: false, config: null, states: [], colors: [], frames: [], latest: null, raf: 0, frameSequence: 0 }
  };
  const PLOTS = {
    'spatial-dynamics': { label: 'Live spatial simulation', title: 'Live spatial simulation / replay', lattice: true, animation: true, evidence: 'During computation this panel shows the actual representative seeded lattice as it evolves. After completion, the recorded frames can be reviewed once without automatic looping. It is one stochastic realization, not an ensemble-average spatial field or empirical movie.' },
    initial: { label: 'Representative initial lattice', title: 'Initial spatial state', lattice: true, evidence: 'The exact initial lattice from the representative derived seed. Initialization is part of the model specification, not measurement data.' },
    spatial: { label: 'Representative final lattice', title: 'Representative final spatial state', lattice: true, evidence: 'This is the first derived-seed realization. It is one stochastic trajectory, not an ensemble average or calibrated spatial map.' },
    change: { label: 'Initial-to-final change map', title: 'Sites changed between initial and final state', evidence: 'A binary initial-to-final comparison. It does not show transient changes that later returned to the initial state.' },
    population: { label: 'Population time curves', title: 'Population time curves', evidence: 'Lines are ensemble means and shaded regions are pointwise 5th–95th percentiles across independent seeded runs.' },
    representative: { label: 'Representative time curve', title: 'Representative population time curve', evidence: 'Counts come from the representative first seed only. Apparent oscillations or transitions can be realization-specific.' },
    'spatial-metrics': { label: 'Spatial metrics through time', title: 'Spatial organization dynamics', evidence: 'Composition-adjusted categorical autocorrelation, neighbour agreement, diversity and occupancy are summarized across independent runs. They are descriptive finite-lattice metrics, not calibrated biological observables.' },
    'cluster-dynamics': { label: 'Cluster dynamics', title: 'Cluster organization through time', evidence: 'Cluster count and largest-cluster fraction are computed from same-state von Neumann connected components. They depend on lattice resolution, the declared empty state and the recording schedule.' },
    'spatial-autocorrelation': { label: 'Final spatial autocorrelation', title: 'Categorical spatial autocorrelation across runs', evidence: 'The composition-adjusted excess of same-state neighbour pairs is reported across independent seeds. It is a categorical lattice diagnostic, not continuous-valued Moran’s I and not empirical spatial inference.' },
    phase: { label: 'Population phase path', title: 'Population-state phase path', evidence: 'The ensemble-mean trajectory of two selected state counts. Geometry depends on the chosen states, finite horizon and update convention.' },
    'endpoint-spatial': { label: 'Endpoint vs spatial structure', title: 'Endpoint–spatial association across runs', evidence: 'Each point is one derived seed. Association across simulations is conditional on fixed parameters and does not imply causality or parameter identifiability.' },
    'event-time': { label: 'Representative events through time', title: 'Transition events by recorded interval', evidence: 'Interval event counts come from the representative run. They depend on update schedule and recording interval and are not continuous-time rates.' },
    events: { label: 'Transition-event totals', title: 'Mean event totals across runs', evidence: 'Bars summarize algorithmic transition events. Counts depend on the update convention and cannot be interpreted as physical rates without calibration.' },
    'final-distribution': { label: 'Final-state distributions', title: 'Final counts across runs', evidence: 'Finite-ensemble variability at the configured terminal step. It does not establish a stationary distribution.' },
    composition: { label: 'Final composition with uncertainty', title: 'Final state composition', evidence: 'Mean terminal proportions with 5th–95th percentiles across runs. These intervals summarize Monte Carlo variability under fixed parameters.' },
    diversity: { label: 'Final diversity distribution', title: 'State-diversity variability', evidence: 'Normalized Shannon entropy describes final state composition only. It does not quantify spatial pattern or functional diversity.' },
    agreement: { label: 'Spatial-agreement distribution', title: 'Neighbour agreement across runs', evidence: 'Agreement is the fraction of evaluated nearest-neighbour pairs sharing a state. It is topology- and occupancy-dependent.' },
    clusters: { label: 'Representative cluster sizes', title: 'Final same-state cluster sizes', evidence: 'Connected components use same-state von Neumann adjacency and exclude the declared empty state. Sizes depend on lattice resolution.' },
    outcomes: { label: 'Terminal outcomes across runs', title: 'Finite-horizon terminal outcomes', evidence: 'Categories are evaluated at the configured horizon. They are not proof of a stationary or asymptotic state.' },
    endpoint: { label: 'Model-specific endpoint', title: 'Model-specific endpoint distribution', evidence: 'This endpoint is defined by the selected teaching model and conditional on its rules. It is not calibrated empirical evidence.' }
  };
  root.FokoAgentPlotMeta = PLOTS;
  const PARAM_LABELS = {
    activation: 'Activation', division: 'Division', qDeath: 'Quiescent death', aDeath: 'Activated death', clearance: 'Dead-cell clearance',
    beta: 'Per-neighbour infection', gamma: 'Recovery', copyProbability: 'Copy neighbour', similarityThreshold: 'Similarity threshold',
    moveProbability: 'Relocation attempt', preyBirth: 'Prey birth', predatorBirth: 'Predator reproduction', predatorDeath: 'Predator death',
    substrateSupply: 'Substrate supply', condensation: 'Acetyl/malonyl condensation', elongation: 'Elongation continuation', terminate14: 'C14 termination', terminate16: 'C16 termination', terminate18: 'C18 termination', productRelease: 'Product release', coaInhibition: 'CoA inhibition', coaRelease: 'CoA release',
    division0: 'Generation-0 division', divisionLater: 'Later-generation division', death: 'Cell death', growth: 'Tree growth', lightning: 'Spontaneous ignition', spread: 'Neighbour fire spread', burnout: 'Burnout', recovery: 'Ash recovery', temptation: 'Defection temptation', imitation: 'Payoff-based imitation', nutrientSupply: 'Nutrient replenishment', attachment: 'Neighbour attachment', inactivation: 'Biomass inactivation', detachment: 'Inactive detachment', reactivation: 'Biomass reactivation'
  };
  const ENDPOINT_LABELS = {
    netExpansion: 'net occupied-cell expansion', activatedFraction: 'activated fraction', cumulativeDivisions: 'cumulative divisions',
    attackFraction: 'finite-horizon attack fraction', finalRecoveredFraction: 'final recovered fraction', peakInfectious: 'peak infectious count',
    consensus: 'consensus indicator', finalOpinionAFraction: 'final opinion-A fraction', satisfiedFraction: 'satisfied occupied fraction',
    relocations: 'relocations', coexistence: 'coexistence indicator', predatorFraction: 'predator fraction', preyFraction: 'prey fraction',
    totalProductFraction: 'fatty-acid product fraction', C14Fraction: 'C14:0 share of product', C16Fraction: 'C16:0 share of product', C18Fraction: 'C18:0 share of product', coaBoundFraction: 'CoA-bound fraction',
    generationWeightedMean: 'generation-weighted mean', livingFraction: 'living-cell fraction', burningFraction: 'burning fraction', ashFraction: 'ash fraction', cooperatorFraction: 'cooperator fraction', activeBiomassFraction: 'active biomass fraction', totalBiomassFraction: 'total biomass fraction', nutrientFraction: 'nutrient fraction'
  };


  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmt(value, digits) { const x = Number(value); if (!Number.isFinite(x)) return '—'; if (x !== 0 && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3)) return x.toExponential(2); return x.toFixed(digits == null ? 3 : digits).replace(/\.?0+$/, ''); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function encodeState(value) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
  function decodeState(value) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }
  function download(name, content, type) { const blob = new Blob([content], {type:type || 'text/plain;charset=utf-8'}); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(function(){URL.revokeObjectURL(url);},0); }
  function messageNode(message) { const node=document.createElement('div'); node.className='diagnostics empty'; node.textContent=message; return node; }
  function rgba(hex, alpha) { const clean = hex.replace('#',''); const n = parseInt(clean.length === 3 ? clean.split('').map(function(c){return c+c;}).join('') : clean,16); return 'rgba(' + ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + alpha + ')'; }
  function nextFrame() { return new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); }); }

  function activeRenderRoots(host) {
    if (!host) return [];
    return Array.from(host.children).filter(function (child) {
      return child.classList && (child.classList.contains('plot-container') || child.classList.contains('agent-panel-render-root'));
    });
  }
  function markSingleActiveRenderRoot(host, kind) {
    const roots = activeRenderRoots(host);
    host.dataset.agentRenderKind = kind || 'unknown';
    host.dataset.agentRenderRootCount = String(roots.length);
    if (roots.length !== 1) throw new Error('Agent panel render invariant failed: expected one active render root, found ' + roots.length + '.');
    return roots[0];
  }
  function teardownPanel(side, stateName) {
    const host = $(side + 'AgentPlot');
    if (!host) throw new Error('Agent plot host is unavailable for ' + side + '.');
    stopAnimation(side);
    host.classList.remove('has-agent-animation');
    delete host.dataset.liveStep;
    delete host.dataset.animationStep;
    delete host.dataset.agentRenderKind;
    host.dataset.agentRenderRootCount = '0';
    PLOT.takeover(host, stateName || 'rendering');
    return host;
  }
  function customRenderRoot(host, kind) {
    const rootNode = document.createElement('div');
    rootNode.className = 'agent-panel-render-root';
    rootNode.dataset.agentRenderKind = kind || 'canvas';
    host.appendChild(rootNode);
    return rootNode;
  }


  function liveDelayFromInput() {
    const input = $('agentLiveSpeed');
    const value = input ? Number(input.value) : 90;
    return Math.max(24, Math.min(500, Number.isFinite(value) ? value : 90));
  }
  function updateLiveBadges(text, paused) {
    document.querySelectorAll('.agent-live-badge').forEach(function (badge) {
      badge.textContent = text;
      badge.dataset.paused = paused ? 'true' : 'false';
    });
  }
  function stopLivePreview() {
    const live = state.live;
    live.active = false;
    live.paused = false;
    live.latest = null;
    live.frameSequence = 0;
    if (live.raf) cancelAnimationFrame(live.raf);
    live.raf = 0;
  }
  function liveCanvas(host, className, label) {
    if (!host) throw new Error('Agent plot host is unavailable. Refresh the page or choose another plot panel.');
    const side = host.id.indexOf('left') === 0 ? 'left' : 'right';
    teardownPanel(side, 'rendering');
    host.dataset.liveStep = '0';
    const rootNode = customRenderRoot(host, 'live-preview');
    const canvas = document.createElement('canvas');
    canvas.className = className;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    const badge = document.createElement('span');
    badge.className = 'agent-live-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.textContent = 'Live · waiting for computed step 0';
    rootNode.append(canvas, badge);
    markSingleActiveRenderRoot(host, 'live-preview');
    return canvas;
  }
  function sizeCanvas(canvas, minimumHeight) {
    const host = canvas.parentElement;
    const ratio = Math.max(1, Math.min(2, root.devicePixelRatio || 1));
    const width = Math.max(320, host.clientWidth || 640);
    const height = Math.max(minimumHeight || 360, Math.min(560, Math.round(width * 0.68)));
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context: context, width: width, height: height };
  }
  function drawLiveGrid(frame) {
    if (!frame || !frame.grid) return;
    document.querySelectorAll('#agentPlotGrid canvas.agent-live-lattice').forEach(function (canvas) {
      const box = sizeCanvas(canvas, 380), context = box.context, size = state.live.config.size;
      context.clearRect(0, 0, box.width, box.height);
      const pad = 18, footer = 34;
      const cell = Math.min((box.width - 2 * pad) / size, (box.height - 2 * pad - footer) / size);
      const drawW = cell * size, drawH = cell * size;
      const ox = (box.width - drawW) / 2, oy = pad + (box.height - footer - 2 * pad - drawH) / 2;
      context.imageSmoothingEnabled = false;
      for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) {
        const value = frame.grid[row * size + col];
        context.fillStyle = state.live.colors[value] || '#e2e8f0';
        context.fillRect(ox + col * cell, oy + row * cell, Math.ceil(cell + 0.25), Math.ceil(cell + 0.25));
      }
      context.strokeStyle = '#94a3b8';
      context.lineWidth = 1;
      context.strokeRect(ox, oy, drawW, drawH);
      context.fillStyle = '#334155';
      context.font = '600 14px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Algorithmic step ' + frame.step + ' / ' + frame.totalSteps, box.width / 2, box.height - 10);
      const host = canvas.closest('.plot');
      if (host) { host.dataset.liveStep = String(frame.step); PLOT.setState(host, 'rendered', false); }
    });
  }
  function drawLivePopulation() {
    const frames = state.live.frames;
    if (!frames.length) return;
    document.querySelectorAll('#agentPlotGrid canvas.agent-live-population').forEach(function (canvas) {
      const box = sizeCanvas(canvas, 380), context = box.context;
      context.clearRect(0, 0, box.width, box.height);
      const margin = { left: 54, right: 18, top: 20, bottom: 44 };
      const w = box.width - margin.left - margin.right, h = box.height - margin.top - margin.bottom;
      const maxStep = Math.max(1, state.live.config.steps);
      const capacity = state.live.config.size * state.live.config.size;
      context.strokeStyle = '#cbd5e1'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(margin.left, margin.top); context.lineTo(margin.left, margin.top + h); context.lineTo(margin.left + w, margin.top + h); context.stroke();
      context.fillStyle = '#475569'; context.font = '12px system-ui, sans-serif'; context.textAlign = 'center';
      context.fillText('Algorithmic step', margin.left + w / 2, box.height - 10);
      context.save(); context.translate(14, margin.top + h / 2); context.rotate(-Math.PI / 2); context.fillText('Population count', 0, 0); context.restore();
      state.live.states.forEach(function (name, stateIndex) {
        context.strokeStyle = state.live.colors[stateIndex] || '#0f766e';
        context.lineWidth = 2;
        context.beginPath();
        frames.forEach(function (frame, index) {
          const x = margin.left + w * frame.step / maxStep;
          const y = margin.top + h * (1 - (frame.counts[stateIndex] || 0) / capacity);
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
      });
      const last = frames[frames.length - 1];
      context.fillStyle = '#334155'; context.textAlign = 'right'; context.font = '600 13px system-ui, sans-serif';
      context.fillText('Step ' + last.step + ' / ' + last.totalSteps, margin.left + w, margin.top + 14);
      const host = canvas.closest('.plot');
      if (host) { host.dataset.liveStep = String(last.step); PLOT.setState(host, 'rendered', false); }
    });
  }
  function renderLiveFrame(frame, frameSequence) {
    if (!state.live.active || !frame) return;
    const previous = state.live.frames[state.live.frames.length - 1];
    if (!previous || previous.step !== frame.step) state.live.frames.push(frame);
    else state.live.frames[state.live.frames.length - 1] = frame;
    state.live.frameSequence = Math.max(state.live.frameSequence + 1, Number(frameSequence) || 0);
    drawLiveGrid(frame);
    drawLivePopulation();
    updateLiveBadges('Live · computed step ' + frame.step + ' / ' + frame.totalSteps, state.live.paused);
    $('agentTopStatus').textContent = state.live.paused ? 'Paused' : 'Simulating';
    $('agentStatus').textContent = (state.live.paused ? 'Paused at' : 'Live representative run ·') + ' step ' + frame.step + ' of ' + frame.totalSteps + ' · both panels show the current computed state.';
  }
  function queueLiveFrame(frame, frameSequence) {
    if (!state.live.active) return;
    state.live.latest = { frame: frame, sequence: frameSequence };
    if (state.live.raf) return;
    state.live.raf = requestAnimationFrame(function () {
      state.live.raf = 0;
      const latest = state.live.latest;
      state.live.latest = null;
      if (latest) renderLiveFrame(latest.frame, latest.sequence);
    });
  }
  function mountLivePanel(side) {
    const host=$(side+'AgentPlot'), kind=state.plotTypes[side], meta=PLOTS[kind];
    if(!host||!meta)return;
    $(side+'AgentPlotTitle').textContent=meta.title;
    renderStateLegend(side,kind);
    if(kind==='spatial-dynamics'){
      liveCanvas(host,'agent-live-lattice','Live representative lattice simulation');
      $(side+'AgentPlotEvidence').textContent='The representative seeded lattice is advanced in paced numerical chunks. Every displayed frame is the state just computed at that algorithmic step, not a replay of a completed run; after completion the recorded frames remain available as a manual replay.';
    }else if(kind==='population'||kind==='representative'){
      liveCanvas(host,'agent-live-population','Live representative population time curve');
      $(side+'AgentPlotEvidence').textContent='State counts are appended from the same incremental representative run. Final ensemble uncertainty is rendered only after every independent run completes.';
    }else{
      teardownPanel(side,'pending');
      const rootNode=customRenderRoot(host,'live-pending');
      rootNode.appendChild(messageNode('This evidence view becomes available after the ensemble completes. Choose Live spatial simulation or Population time curves to follow the current run.'));
      markSingleActiveRenderRoot(host,'live-pending');
      PLOT.setState(host,'pending',false);
      $(side+'AgentPlotEvidence').textContent=meta.evidence;
    }
  }
  function refreshLivePanels(sides) {
    (sides||SIDES).forEach(mountLivePanel);
    const last=state.live.frames[state.live.frames.length-1];
    if(last)drawLiveGrid(last);
    drawLivePopulation();
    if(last)updateLiveBadges((state.live.paused?'Paused · step ':'Live · computed step ')+last.step+' / '+last.totalSteps,state.live.paused);
  }
  function startLivePreview(config) {
    stopLivePreview();
    const meta = config.model === 'custom' ? config.customModel : CORE.MODEL_META[config.model];
    state.live.active = true;
    state.live.config = config;
    state.live.states = (meta.states || []).map(function (entry) { return typeof entry === 'string' ? entry : entry.name; });
    state.live.colors = (meta.colors || []).slice();
    state.live.frames = [];
    refreshLivePanels(SIDES);
  }

  const CUSTOM_TEMPLATE = {
    title: 'Custom contact process',
    states: [
      { name: 'empty', color: '#f8fbfd' },
      { name: 'susceptible', color: '#8ec5ff' },
      { name: 'active', color: '#ef4444' }
    ],
    parameters: { contact: 0.08, recovery: 0.04 },
    transitions: [
      { from: 1, to: 2, kind: 'neighbor-contact', parameter: 'contact', neighborState: 2, event: 'activation' },
      { from: 2, to: 1, kind: 'spontaneous', parameter: 'recovery', event: 'recovery' }
    ],
    defaultFractions: [0.10, 0.86, 0.04],
    emptyState: 0,
    endpointLabel: 'finite-horizon active fraction'
  };
  function parseCustomModel() {
    const raw = $('agentCustomModelJson').value.trim();
    if (!raw) throw new Error('Enter or import a custom Agent model JSON document.');
    const parsed = JSON.parse(raw); const validated = CORE.validateCustomModel(parsed); state.customModel = validated; return validated;
  }
  function metaForUi(model) { return model === 'custom' ? (state.customModel || parseCustomModel()) : CORE.MODEL_META[model]; }
  function countsFromFractions(fractions, capacity) {
    const raw=fractions.map(function(value){return Math.max(0,Number(value)||0);}); const sum=raw.reduce(function(a,b){return a+b;},0)||1;
    const scaled=raw.map(function(value){return value/sum*capacity;}); const counts=scaled.map(Math.floor); let left=capacity-counts.reduce(function(a,b){return a+b;},0);
    scaled.map(function(value,index){return {index:index,remainder:value-Math.floor(value)};}).sort(function(a,b){return b.remainder-a.remainder||a.index-b.index;}).forEach(function(item){if(left>0){counts[item.index]+=1;left-=1;}});
    return counts;
  }
  function renderPopulationSummary() {
    const size=Math.max(0,Math.floor(Number($('agentSize').value)||0)), capacity=size*size;
    const mode=$('agentInitialMode').value; const values=[];
    document.querySelectorAll(mode==='counts'?'.agent-count-input':'.agent-fraction-input').forEach(function(input){values[Number(input.dataset.stateIndex)]=Number(input.value)||0;});
    const sum=values.reduce(function(a,b){return a+b;},0); const summary=$('agentPopulationSummary');
    if(mode==='counts') { summary.textContent='Capacity '+capacity+' cells · entered '+sum+' · '+(sum===capacity?'exactly specified':'difference '+(capacity-sum)); summary.classList.toggle('warning',sum!==capacity); }
    else { const counts=countsFromFractions(values,capacity); summary.textContent='Fraction sum '+fmt(sum,4)+' · exact allocation '+counts.join(' / ')+' cells'; summary.classList.remove('warning'); }
  }
  function syncCountsFromFractions() {
    const capacity=Math.max(0,Math.floor(Number($('agentSize').value)||0))**2; const fractions=[];
    document.querySelectorAll('.agent-fraction-input').forEach(function(input){fractions[Number(input.dataset.stateIndex)]=Number(input.value)||0;});
    const counts=countsFromFractions(fractions,capacity); document.querySelectorAll('.agent-count-input').forEach(function(input){input.value=String(counts[Number(input.dataset.stateIndex)]||0);}); renderPopulationSummary();
  }
  function setInitialMode(mode) {
    $('agentInitialMode').value=mode||'counts'; $('agentCountGrid').hidden=$('agentInitialMode').value!=='counts'; $('agentFractionGrid').hidden=$('agentInitialMode').value!=='fractions'; renderPopulationSummary();
  }

  function renderPresetLibrary() {
    const names = Object.keys(PRESETS);
    $('agentPresetSelect').innerHTML = names.map(function (name) { return '<option value="'+esc(name)+'">'+esc(PRESETS[name].title)+'</option>'; }).join('');
    $('agentPresetDeck').innerHTML = names.map(function (name) { const p=PRESETS[name]; return '<button data-preset="'+esc(name)+'" class="'+(name===state.preset?'active':'')+'" type="button"><b>'+esc(p.title)+'</b><small>'+esc(p.family)+'</small></button>'; }).join('');
    $('agentModel').innerHTML = Object.keys(CORE.MODEL_META).map(function (key) { return '<option value="'+esc(key)+'">'+esc(CORE.MODEL_META[key].title)+'</option>'; }).join('');
  }
  function renderEditors(model, params, fractions, counts) {
    const meta = metaForUi(model); const capacity=Math.max(1,Math.floor(Number($('agentSize').value)||32))**2;
    $('agentParamGrid').innerHTML = meta.params.map(function (key) { const value=params[key] == null ? (meta.parameters&&meta.parameters[key] != null ? meta.parameters[key] : 0) : params[key]; return '<label><span>'+esc(PARAM_LABELS[key]||key)+'</span><input class="agent-param-input" data-param="'+esc(key)+'" min="0" max="1" step="0.001" type="number" value="'+esc(value)+'"/></label>'; }).join('');
    const baseFractions=fractions||meta.defaultFractions; const baseCounts=counts||countsFromFractions(baseFractions,capacity);
    $('agentFractionGrid').innerHTML = meta.states.map(function (name,i) { return '<label><span>'+esc(name)+' fraction</span><input class="agent-fraction-input" data-state-index="'+i+'" min="0" step="0.001" type="number" value="'+esc(baseFractions[i] == null ? 0 : baseFractions[i])+'"/></label>'; }).join('');
    $('agentCountGrid').innerHTML = meta.states.map(function (name,i) { return '<label><span>'+esc(name)+' count</span><input class="agent-count-input" data-state-index="'+i+'" min="0" max="'+capacity+'" step="1" type="number" value="'+esc(baseCounts[i] == null ? 0 : baseCounts[i])+'"/></label>'; }).join('');
    $('agentModelSummary').innerHTML = '<b>'+esc(meta.title)+'</b> · '+meta.states.length+' states · '+meta.params.length+' parameters · '+(model==='custom'?'declarative user model':'curated built-in model');
    $('agentCustomModelBlock').hidden=model!=='custom';
    document.querySelectorAll('.agent-fraction-input').forEach(function(input){input.addEventListener('input',function(){if($('agentInitialMode').value==='fractions')syncCountsFromFractions();});});
    document.querySelectorAll('.agent-count-input').forEach(function(input){input.addEventListener('input',renderPopulationSummary);});
    setInitialMode($('agentInitialMode').value||'counts');
  }
  function applyConfig(config, message) {
    if(config.model==='custom'&&config.customModel){state.customModel=config.customModel;$('agentCustomModelJson').value=JSON.stringify(config.customModel,null,2);} $('agentModel').value=config.model; $('agentSize').value=config.size; $('agentSteps').value=config.steps; $('agentRuns').value=config.runs; $('agentSeed').value=config.seed; $('agentRecordEvery').value=config.recordEvery; if ($('agentSnapshotCount')) $('agentSnapshotCount').value=String(config.snapshotCount || 4); $('agentNeighborhood').value=config.neighborhood; $('agentBoundary').value=config.boundary;
    if ($('agentUpdateSchedule')) $('agentUpdateSchedule').value=config.updateSchedule || 'random-with-replacement';
    if ($('agentInitialization')) $('agentInitialization').value=config.initialization || 'random';
    $('agentInitialMode').value=config.initialMode||'counts'; renderEditors(config.model, config.params || {}, config.initialFractions || metaForUi(config.model).defaultFractions, config.initialCounts); setInitialMode(config.initialMode||'counts');
    clearComputed(message || 'Configuration loaded. Run the ensemble to regenerate evidence.');
  }
  function loadPreset(name, autorun) {
    const preset=PRESETS[name] || PRESETS[Object.keys(PRESETS)[0]]; if(!preset)return;
    state.preset=name in PRESETS?name:Object.keys(PRESETS)[0]; $('agentPresetSelect').value=state.preset;
    document.querySelectorAll('#agentPresetDeck [data-preset]').forEach(function(button){button.classList.toggle('active',button.dataset.preset===state.preset);});
    $('agentPresetQuestion').innerHTML='<b>Question:</b> '+esc(preset.question); $('agentPresetNote').textContent=preset.note;
    applyConfig(clone(preset), 'Example loaded. Run the ensemble to compute stochastic evidence.');
    if(autorun!==false)setTimeout(run,40);
  }
  function configFromInputs() {
    const model=$('agentModel').value; const customModel=model==='custom'?parseCustomModel():null; const meta=model==='custom'?customModel:CORE.MODEL_META[model]; const params={}; const fractions=[], counts=[];
    document.querySelectorAll('.agent-param-input').forEach(function(input){params[input.dataset.param]=Number(input.value);});
    document.querySelectorAll('.agent-fraction-input').forEach(function(input){fractions[Number(input.dataset.stateIndex)]=Number(input.value);});
    document.querySelectorAll('.agent-count-input').forEach(function(input){counts[Number(input.dataset.stateIndex)]=Number(input.value);});
    return CORE.validateConfig({
      model:model,customModel:customModel,size:Number($('agentSize').value),steps:Number($('agentSteps').value),runs:Number($('agentRuns').value),seed:Number($('agentSeed').value),recordEvery:Number($('agentRecordEvery').value),snapshotCount:Number($('agentSnapshotCount') ? $('agentSnapshotCount').value : 4),captureSnapshots:false,
      neighborhood:$('agentNeighborhood').value,boundary:$('agentBoundary').value,
      updateSchedule:$('agentUpdateSchedule') ? $('agentUpdateSchedule').value : 'random-with-replacement', initialization:$('agentInitialization') ? $('agentInitialization').value : 'random',
      params:params,initialMode:$('agentInitialMode').value,initialCounts:counts,initialFractions:fractions.length?fractions:meta.defaultFractions
    });
  }
  function clearPlot(side) {
    stopAnimation(side);
    state.plotSerial[side] += 1;
    const host=$(side+'AgentPlot'); const legend=$(side+'AgentPlotLegend'); if (legend) legend.innerHTML='';
    PLOT.clear(host, 'Run the ensemble to create computed evidence.');
    $(side+'AgentPlotEvidence').textContent='No plot has been computed.';
  }
  function stopWorker() {
    if (state.worker) {
      try { state.worker.terminate(); } catch (_) {}
      state.worker = null;
    }
  }
  function stopFallback() {
    const job = state.fallback;
    if (job && job.timer) clearTimeout(job.timer);
    if (job) job.cancelled = true;
    state.fallback = null;
  }
  function stopComputation() {
    stopWorker();
    stopFallback();
    state.activeRequestId = null;
  }
  function setPausedUi(paused) {
    state.live.paused = paused === true;
    const button = $('pauseAgent');
    if (button) {
      button.textContent = state.live.paused ? 'Resume live run' : 'Pause live run';
      button.setAttribute('aria-pressed', state.live.paused ? 'true' : 'false');
    }
    const last = state.live.frames[state.live.frames.length - 1];
    if (last) updateLiveBadges((state.live.paused ? 'Paused · step ' : 'Live · computed step ') + last.step + ' / ' + last.totalSteps, state.live.paused);
  }
  function clearComputed(message) {
    state.runSerial += 1; stopComputation(); stopLivePreview(); state.result=null; state.runtime=0; state.renderRuntime=0; state.cancelled=false; SIDES.forEach(clearPlot);
    $('agentResultKind').textContent='No computed agent result'; $('agentTopStatus').textContent='Ready'; $('agentRuntime').textContent='—'; $('agentResultModel').textContent='—'; $('agentResultRuns').textContent='—'; $('agentResultGrid').textContent='—'; $('agentOccupied').textContent='—'; $('agentAgreement').textContent='—'; $('agentDiversity').textContent='—'; $('agentAttempts').textContent='—';
    if ($('agentAbsorbed')) $('agentAbsorbed').textContent='—'; if ($('agentAutocorrelation')) $('agentAutocorrelation').textContent='—'; if ($('agentLargestCluster')) $('agentLargestCluster').textContent='—';
    $('agentDiagnostics').classList.add('empty'); $('agentDiagnostics').textContent=message || 'Run an ensemble to inspect state totals, events and variability.';
    $('agentBoundaryStatus').textContent='Not computed'; $('agentBoundaryTopology').textContent='Not configured'; $('agentBoundarySeeds').textContent='Not generated'; $('agentBoundaryClaim').textContent='No scientific result yet'; $('agentStatus').textContent=message || 'Ready.';
    $('agentProgress').style.width='0%'; setRunning(false);
  }
  function setRunning(running) {
    const button=$('runAgent'); if(button){button.disabled=running;button.textContent=running?'Computing live…':'Run live ensemble';}
    if ($('cancelAgent')) $('cancelAgent').hidden=!running;
    if ($('pauseAgent')) $('pauseAgent').hidden=!running;
    if (!running) setPausedUi(false);
  }
  function failRun(message, serial) {
    if(serial!==state.runSerial)return;
    stopComputation(); stopLivePreview(); state.result=null; setRunning(false); $('agentTopStatus').textContent='Failed'; $('agentStatus').textContent=message; $('agentDiagnostics').classList.remove('empty'); $('agentDiagnostics').textContent=message; $('agentProgress').style.width='0%';
  }
  function failRender(message, serial) {
    if(serial!==state.runSerial)return;
    stopComputation(); setRunning(false); $('agentTopStatus').textContent='Render failed'; $('agentStatus').textContent=message; $('agentProgress').style.width='0%';
    SIDES.forEach(function(side){const host=$(side+'AgentPlot');if(host&&visibleSides().includes(side)&&!hasVisibleEvidence(host)){PLOT.takeover(host, 'failed');host.appendChild(messageNode('Computed numerical result retained, but this plot could not be rendered. Export JSON for independent inspection.'));PLOT.setState(host, 'failed', false);}});
  }
  async function acceptResult(result, start, serial) {
    if(serial!==state.runSerial)return;
    stopComputation(); stopLivePreview(); state.result=result; state.runtime=performance.now()-start; const renderStart=performance.now();
    try {
      await renderResult();
      if(serial!==state.runSerial)return;
      state.renderRuntime=performance.now()-renderStart;
      $('agentStatus').textContent='Computed and rendered. Inspect replicate variability, update semantics and provenance.';
      $('agentProgress').style.width='100%'; setTimeout(function(){$('agentProgress').style.width='0%';},400); setRunning(false);
    } catch (error) { failRender('Computed numerical result retained, but rendering failed: '+(error.message||error), serial); }
  }
  function run() {
    const serial=++state.runSerial, start=performance.now();
    state.cancelled=false; stopComputation(); stopLivePreview(); SIDES.forEach(stopAnimation);
    state.result=null;
    $('agentResultKind').textContent='No computed agent result';
    $('agentRuntime').textContent='—'; $('agentResultRuns').textContent='—';
    $('agentOccupied').textContent='—'; $('agentAgreement').textContent='—'; $('agentDiversity').textContent='—'; $('agentAttempts').textContent='—';
    let config;
    try { config=configFromInputs(); } catch (error) { failRun(error.message, serial); return; }
    const liveDelayMs=liveDelayFromInput();
    startLivePreview(config); $('agentProgress').style.width='4%'; $('agentStatus').textContent='Starting genuinely live representative simulation…'; $('agentTopStatus').textContent='Simulating'; setRunning(true);

    function mainThreadFallback(reason) {
      if (typeof CORE.createSimulationRunner !== 'function') {
        failRun(reason+' Incremental Agent runner is unavailable.', serial);
        return;
      }
      $('agentStatus').textContent=reason+' Using a paced main-thread fallback. Interaction may be slower, but visible frames remain current computed states.';
      try {
        const firstSeed=CORE.deriveSeed(config.seed,0);
        const runner=CORE.createSimulationRunner(Object.assign({},config,{captureSnapshots:true}),firstSeed);
        const job={serial:serial,config:config,runner:runner,runs:[],nextRunIndex:1,stepsPerFrame:Math.max(1,Math.ceil(config.steps/Math.max(4,config.snapshotCount||24))),liveDelayMs:liveDelayMs,timer:0,next:null,paused:false,cancelled:false};
        state.fallback=job;
        function schedule(callback,delay){
          if(state.fallback!==job||job.cancelled)return;
          job.next=callback;
          if(job.paused)return;
          if(job.timer)clearTimeout(job.timer);
          job.timer=setTimeout(function(){job.timer=0;if(state.fallback===job&&!job.cancelled&&!job.paused)callback();},Math.max(0,delay||0));
        }
        job.resume=function(){if(job.next)schedule(job.next,0);};
        function liveFrame(){
          const frame=runner.frame();
          queueLiveFrame(frame,state.live.frameSequence+1);
          const fraction=frame.totalSteps?frame.step/frame.totalSteps:0;
          $('agentProgress').style.width=Math.max(4,Math.min(45,4+fraction*41)).toFixed(1)+'%';
        }
        function pumpRepresentative(){
          if(serial!==state.runSerial||state.fallback!==job)return;
          try{
            runner.advance(job.stepsPerFrame); liveFrame();
            if(runner.done){
              job.runs.push(runner.result());
              $('agentStatus').textContent='Representative run complete. Computing independent ensemble runs.';
              if($('pauseAgent'))$('pauseAgent').hidden=true;
              schedule(pumpEnsemble,0);
            }else schedule(pumpRepresentative,job.liveDelayMs);
          }catch(error){failRun(error.message,serial);}
        }
        function pumpEnsemble(){
          if(serial!==state.runSerial||state.fallback!==job)return;
          if(job.nextRunIndex>=config.runs){
            const result=CORE.summarizeRuns(config,job.runs);
            state.fallback=null;
            acceptResult(result,start,serial);
            return;
          }
          try{
            const index=job.nextRunIndex,seed=CORE.deriveSeed(config.seed,index);
            job.runs.push(CORE.simulate(Object.assign({},config,{captureSnapshots:false}),seed));
            job.nextRunIndex+=1;
            const fraction=job.nextRunIndex/config.runs;
            $('agentProgress').style.width=Math.max(45,Math.min(94,45+fraction*49)).toFixed(1)+'%';
            $('agentStatus').textContent='Ensemble run '+job.nextRunIndex+' of '+config.runs+' · derived seed '+seed;
            schedule(pumpEnsemble,0);
          }catch(error){failRun(error.message,serial);}
        }
        liveFrame();
        schedule(pumpRepresentative,liveDelayMs);
      } catch (error) { failRun(error.message||String(error),serial); }
    }

    if (root.Worker) {
      try {
        const requestId='agent-'+Date.now()+'-'+serial; state.activeRequestId=requestId;
        const worker=new Worker('src/v72/agent-worker.js?v=72.48.0'); state.worker=worker;
        worker.onmessage=function(event){
          const message=event.data||{}; if(serial!==state.runSerial||message.requestId!==requestId)return;
          if(message.type==='started'){
            $('agentStatus').textContent='Live numerical runner started · '+message.stepsPerFrame+' algorithmic step(s) per visible update · seed '+message.representativeSeed+'.';
          } else if(message.type==='live-frame'){
            queueLiveFrame(message.frame,message.frameSequence);
            const fraction=message.frame&&message.frame.totalSteps?message.frame.step/message.frame.totalSteps:0;
            $('agentProgress').style.width=Math.max(4,Math.min(45,4+fraction*41)).toFixed(1)+'%';
          } else if(message.type==='paused'){
            setPausedUi(true); $('agentTopStatus').textContent='Paused'; $('agentStatus').textContent='Live numerical runner paused at step '+message.step+' of '+message.totalSteps+'.';
          } else if(message.type==='resumed'){
            setPausedUi(false); $('agentTopStatus').textContent='Simulating'; $('agentStatus').textContent='Live numerical runner resumed from step '+message.step+' of '+message.totalSteps+'.';
          } else if(message.type==='representative-complete'){
            if($('pauseAgent'))$('pauseAgent').hidden=true;
            $('agentStatus').textContent='Representative live run complete. Computing independent ensemble runs without replaying the lattice.';
          } else if(message.type==='progress'){
            const pct=Math.max(45,Math.min(94,45+message.fraction*49)); $('agentProgress').style.width=pct.toFixed(1)+'%';
            $('agentStatus').textContent='Ensemble run '+message.completed+' of '+message.total+' · derived seed '+message.seed;
          } else if(message.type==='complete'){
            const publishDelay=Math.max(0,180-(performance.now()-start));
            if(publishDelay) setTimeout(function(){acceptResult(message.result,start,serial);},publishDelay);
            else acceptResult(message.result,start,serial);
          } else if(message.type==='cancelled'){
            cancelRun();
          } else if(message.type==='error') failRun(message.error||'Agent worker failed.',serial);
        };
        worker.onerror=function(error){
          stopWorker();
          if(serial===state.runSerial){startLivePreview(config);mainThreadFallback('Web Worker execution failed: '+(error.message||error)+'.');}
        };
        worker.postMessage({type:'run',requestId:requestId,config:config,liveDelayMs:liveDelayMs});
        return;
      } catch (error) {
        stopWorker(); mainThreadFallback('Web Worker startup failed: '+(error.message||error)+'.'); return;
      }
    }
    mainThreadFallback('Web Workers are unavailable.');
  }
  function togglePause() {
    if (!$('runAgent').disabled) return;
    const paused=!state.live.paused;
    setPausedUi(paused);
    if(state.worker&&state.activeRequestId){
      try{state.worker.postMessage({type:paused?'pause':'resume',requestId:state.activeRequestId});}catch(_){}
    }
    if(state.fallback){
      state.fallback.paused=paused;
      if(state.fallback.timer){clearTimeout(state.fallback.timer);state.fallback.timer=0;}
      if(!paused&&typeof state.fallback.resume==='function')state.fallback.resume();
      const last=state.live.frames[state.live.frames.length-1];
      $('agentTopStatus').textContent=paused?'Paused':'Simulating';
      $('agentStatus').textContent=(paused?'Main-thread live run paused':'Main-thread live run resumed')+(last?' at step '+last.step+' of '+last.totalSteps+'.':'.');
    }
  }
  function cancelRun() {
    if (!state.worker && !state.fallback && !$('runAgent').disabled) return;
    const requestId=state.activeRequestId,worker=state.worker;
    state.runSerial += 1; state.cancelled=true;
    if(worker&&requestId){try{worker.postMessage({type:'cancel',requestId:requestId});}catch(_){}}
    stopComputation(); stopLivePreview(); setRunning(false); updateLiveBadges('Cancelled · no result published',false); $('agentProgress').style.width='0%'; $('agentTopStatus').textContent='Cancelled'; $('agentStatus').textContent='Run cancelled. No partial ensemble was published.';
  }

  function discreteScale(colors) { const n=colors.length; const out=[]; colors.forEach(function(color,i){const lo=i/n,hi=(i+1)/n;out.push([lo,color],[Math.max(lo,hi-1e-9),color]);});return out; }
  function layout(x,y) { return {margin:{t:22,r:26,b:62,l:62},paper_bgcolor:'#fff',plot_bgcolor:'#fff',font:{family:'Inter, system-ui, sans-serif',color:'#172033',size:11},xaxis:{title:x,gridcolor:'#e7ebf1',automargin:true},yaxis:{title:y,gridcolor:'#e7ebf1',automargin:true},legend:{orientation:'h',y:-.24}}; }
  function eventSummary() {
    const names={}; state.result.runs.forEach(function(run){Object.keys(run.eventTotals).forEach(function(name){(names[name]||(names[name]=[])).push(run.eventTotals[name]);});});
    return Object.keys(names).map(function(name){const values=names[name];while(values.length<state.result.config.runs)values.push(0);const summary=CORE.summarizeValues(values);return {name:name,mean:summary.mean,q05:summary.q05,q95:summary.q95};});
  }
  function endpointChoice() {
    const endpoints=state.result.ensemble.endpoints||{};
    const preferred=['totalProductFraction','C16Fraction','generationWeightedMean','burningFraction','attackFraction','consensus','satisfiedFraction','coexistence','netExpansion','activatedFraction','finalRecoveredFraction','predatorFraction','cooperatorFraction','activeBiomassFraction','totalBiomassFraction'];
    const key=preferred.find(function(name){return endpoints[name]&&endpoints[name].values.length;}) || Object.keys(endpoints).find(function(name){return endpoints[name]&&endpoints[name].values.length;});
    return key ? {key:key,summary:endpoints[key],label:ENDPOINT_LABELS[key]||key} : null;
  }
  function matrixFromGrid(grid, size) {
    const z=[]; for(let row=0;row<size;row++) z.push(grid.slice(row*size,(row+1)*size)); return z;
  }
  function stateNamesMatrix(grid, states, size) {
    const out=[]; for(let row=0;row<size;row++) out.push(grid.slice(row*size,(row+1)*size).map(function(value){return states[value]||String(value);})); return out;
  }
  function latticeTrace(grid, states, colors, size, axisIndex) {
    const suffix=axisIndex&&axisIndex>1?String(axisIndex):'';
    return {z:matrixFromGrid(grid,size),customdata:stateNamesMatrix(grid,states,size),type:'heatmap',zmin:-0.5,zmax:states.length-0.5,colorscale:discreteScale(colors),showscale:false,zsmooth:false,xaxis:'x'+suffix,yaxis:'y'+suffix,hovertemplate:'row %{y}<br>column %{x}<br>%{customdata}<extra></extra>'};
  }
  function addBand(traces,x,summary,color,name){
    traces.push({x:x,y:summary.q05,mode:'lines',line:{width:0,color:color},showlegend:false,hoverinfo:'skip'});
    traces.push({x:x,y:summary.q95,mode:'lines',line:{width:0,color:color},fill:'tonexty',fillcolor:rgba(color,.10),showlegend:false,hoverinfo:'skip'});
    traces.push({x:x,y:summary.mean,mode:'lines',line:{width:2.4,color:color},name:name});
  }
  function phaseStates(result) {
    const ranges=result.states.map(function(name,index){const values=result.ensemble.mean.map(function(row){return row[index];});return {index:index,name:name,range:Math.max.apply(null,values)-Math.min.apply(null,values)};}).sort(function(a,b){return b.range-a.range;});
    return ranges.slice(0,2);
  }
  function plotSpec(kind) {
    const r=state.result, rep=r.representative, colors=r.colors, states=r.states; let traces=[],lay=layout('','');
    if(kind==='spatial-dynamics'){
      // Animated spatial dynamics are rendered by renderAnimatedSpatial().
      // Keep a single-frame specification as a deterministic non-animated fallback.
      traces=[latticeTrace(rep.finalGrid,states,colors,r.config.size,1)];
      lay=layout('column','row');lay.margin={t:18,r:18,b:44,l:50};lay.xaxis.showticklabels=false;lay.yaxis.showticklabels=false;lay.yaxis.autorange='reversed';lay.yaxis.scaleanchor='x';lay.yaxis.scaleratio=1;
    } else if(kind==='initial'||kind==='spatial'){
      traces=[latticeTrace(kind==='initial'?rep.initialGrid:rep.finalGrid,states,colors,r.config.size,1)];lay=layout('column','row');lay.margin={t:18,r:18,b:44,l:50};lay.xaxis.showticklabels=false;lay.yaxis.showticklabels=false;lay.yaxis.autorange='reversed';lay.yaxis.scaleanchor='x';lay.yaxis.scaleratio=1;
    } else if(kind==='change'){
      const z=[];for(let row=0;row<r.config.size;row++){const values=[];for(let col=0;col<r.config.size;col++){const index=row*r.config.size+col;values.push(rep.initialGrid[index]===rep.finalGrid[index]?0:1);}z.push(values);}
      traces=[{z:z,type:'heatmap',zmin:0,zmax:1,colorscale:[[0,'#f1f5f9'],[.499,'#f1f5f9'],[.5,'#e11d48'],[1,'#e11d48']],showscale:false,zsmooth:false,hovertemplate:'row %{y}<br>column %{x}<br>changed %{z}<extra></extra>'}];lay=layout('column','row');lay.yaxis.autorange='reversed';lay.yaxis.scaleanchor='x';lay.yaxis.scaleratio=1;
    } else if(kind==='population'){
      states.forEach(function(name,s){addBand(traces,r.times,{q05:r.ensemble.q05.map(function(row){return row[s];}),q95:r.ensemble.q95.map(function(row){return row[s];}),mean:r.ensemble.mean.map(function(row){return row[s];})},colors[s],name);});lay=layout('algorithmic step','agent count');
    } else if(kind==='representative'){
      states.forEach(function(name,s){traces.push({x:rep.times,y:rep.counts.map(function(row){return row[s];}),mode:'lines',name:name,line:{color:colors[s],width:2.2}});});lay=layout('algorithmic step','agent count');
    } else if(kind==='spatial-metrics'){
      const spatial=r.ensemble.spatial; addBand(traces,spatial.times,spatial.autocorrelation,'#155eef','categorical autocorrelation');addBand(traces,spatial.times,spatial.agreement,'#0891b2','neighbour agreement');addBand(traces,spatial.times,spatial.diversity,'#7c3aed','composition diversity');addBand(traces,spatial.times,spatial.occupiedFraction,'#0f766e','occupied fraction');lay=layout('algorithmic step','spatial metric');lay.yaxis.range=[-1,1];
    } else if(kind==='cluster-dynamics'){
      const spatial=r.ensemble.spatial; addBand(traces,spatial.times,spatial.clusterCount,'#b45309','cluster count'); traces.push({x:spatial.times,y:spatial.largestClusterFraction.mean,mode:'lines',name:'largest-cluster fraction',line:{width:2.4,color:'#0f766e'},yaxis:'y2'}); lay=layout('algorithmic step','cluster count');lay.yaxis2={title:'largest-cluster fraction',overlaying:'y',side:'right',range:[0,1],gridcolor:'rgba(0,0,0,0)'};
    } else if(kind==='spatial-autocorrelation'){
      const values=r.ensemble.metrics.categoricalAutocorrelation.values;traces=[{y:values,type:'box',name:'independent runs',boxpoints:'all',jitter:.35,pointpos:0,marker:{color:'#155eef'}}];lay=layout('','categorical autocorrelation');lay.yaxis.range=[-1,1];
    } else if(kind==='phase'){
      const selected=phaseStates(r); if(selected.length<2)return {traces:[],layout:lay}; const a=selected[0],b=selected[1];const x=r.ensemble.mean.map(function(row){return row[a.index];}),y=r.ensemble.mean.map(function(row){return row[b.index];});traces=[{x:x,y:y,mode:'lines+markers',name:a.name+' vs '+b.name,line:{width:2.4,color:'#155eef'},marker:{size:5,color:r.times,colorscale:'Viridis',showscale:true,colorbar:{title:'step',thickness:10}}},{x:[x[0]],y:[y[0]],mode:'markers',name:'start',marker:{size:10,color:'#0f766e',symbol:'circle-open'}},{x:[x[x.length-1]],y:[y[y.length-1]],mode:'markers',name:'end',marker:{size:10,color:'#b42318',symbol:'diamond'}}];lay=layout(a.name+' count',b.name+' count');
    } else if(kind==='endpoint-spatial'){
      const endpoint=endpointChoice(); const values=endpoint?endpoint.summary.values:[];const agreement=r.runs.map(function(run){return run.metrics.spatialAgreement;});const pairs=values.map(function(value,index){return {x:agreement[index],y:value,seed:r.runs[index].seed};}).filter(function(row){return Number.isFinite(row.x)&&Number.isFinite(row.y);});traces=[{x:pairs.map(function(row){return row.x;}),y:pairs.map(function(row){return row.y;}),customdata:pairs.map(function(row){return row.seed;}),mode:'markers',marker:{size:8,color:'#155eef',opacity:.72},name:'derived seeds',hovertemplate:'agreement %{x:.3f}<br>endpoint %{y:.3f}<br>seed %{customdata}<extra></extra>'}];lay=layout('final neighbour agreement',endpoint?endpoint.label:'model endpoint');
    } else if(kind==='event-time'){
      const eventNames=Array.from(new Set(rep.eventSeries.flatMap(function(row){return Object.keys(row.counts||{});})));traces=eventNames.map(function(name,index){return {x:rep.eventSeries.map(function(row){return row.step;}),y:rep.eventSeries.map(function(row){return row.counts[name]||0;}),mode:'lines+markers',name:name,line:{width:2,color:['#155eef','#0f766e','#b45309','#be123c','#7c3aed','#0891b2'][index%6]}};});lay=layout('algorithmic step','events per recorded interval');
    } else if(kind==='events'){
      const summary=eventSummary();traces=[{x:summary.map(function(o){return o.name;}),y:summary.map(function(o){return o.mean;}),error_y:{type:'data',symmetric:false,array:summary.map(function(o){return o.q95-o.mean;}),arrayminus:summary.map(function(o){return o.mean-o.q05;}),visible:true},type:'bar',name:'mean events'}];lay=layout('transition event','count per run');lay.margin.b=112;
    } else if(kind==='final-distribution'){
      traces=states.map(function(name,s){return {y:r.ensemble.finalByState[s],type:'box',name:name,marker:{color:colors[s]},boxpoints:'outliers'};});lay=layout('state','final count');
    } else if(kind==='composition'){
      const total=r.config.size*r.config.size;const summaries=r.ensemble.finalByState.map(function(values){return CORE.summarizeValues(values.map(function(value){return value/total;}));});traces=[{x:states,y:summaries.map(function(row){return row.mean;}),type:'bar',marker:{color:colors},error_y:{type:'data',symmetric:false,array:summaries.map(function(row){return row.q95-row.mean;}),arrayminus:summaries.map(function(row){return row.mean-row.q05;}),visible:true},hovertemplate:'%{x}<br>mean %{y:.3f}<extra></extra>'}];lay=layout('state','final population fraction');lay.yaxis.range=[0,1];lay.margin.b=100;
    } else if(kind==='diversity'){
      const values=r.ensemble.metrics.normalizedDiversity.values;traces=[{x:values,type:'histogram',name:'runs',marker:{color:'#008b92'}},{x:[rep.metrics.normalizedDiversity,rep.metrics.normalizedDiversity],y:[0,Math.max(1,values.length/3)],mode:'lines',name:'representative',line:{color:'#b45309',dash:'dash'}}];lay=layout('normalized Shannon entropy','runs');
    } else if(kind==='agreement'){
      const values=r.ensemble.metrics.spatialAgreement.values;traces=[{y:values,type:'box',name:'independent runs',boxpoints:'all',jitter:.35,pointpos:0,marker:{color:'#155eef'}}];lay=layout('','nearest-neighbour agreement');lay.yaxis.range=[0,1];
    } else if(kind==='clusters'){
      const sizes=(rep.clusters&&rep.clusters.sizes)||[];traces=[{x:sizes,type:'histogram',marker:{color:'#0f766e'},name:'clusters'}];lay=layout('same-state cluster size','cluster count');
    } else if(kind==='outcomes'){
      const outcomes=r.ensemble.absorption.terminalOutcomes||[];traces=[{x:outcomes.map(function(o){return o.label;}),y:outcomes.map(function(o){return o.proportion;}),type:'bar',marker:{color:'#155eef'},name:'run proportion',error_y:{type:'data',symmetric:false,array:outcomes.map(function(o){return o.wilson95.high-o.proportion;}),arrayminus:outcomes.map(function(o){return o.proportion-o.wilson95.low;}),visible:true}}];lay=layout('terminal category','run proportion');lay.yaxis.range=[0,1];lay.margin.b=92;
    } else if(kind==='endpoint'){
      const endpoint=endpointChoice();if(endpoint){traces=[{y:endpoint.summary.values,type:'box',name:endpoint.label,boxpoints:'all',jitter:.35,pointpos:0,marker:{color:'#7c3aed'}}];lay=layout('',endpoint.label);}
    }
    return {traces:traces,layout:lay};
  }
  function compatiblePlotKeys() {
    if(!state.result)return Object.keys(PLOTS);
    const keys=Object.keys(PLOTS);
    return keys.filter(function(key){
      if(key==='spatial-dynamics')return state.result.representative.snapshots&&state.result.representative.snapshots.length>=2;
      if(key==='phase')return state.result.states.length>=2;
      if(key==='endpoint-spatial'||key==='endpoint')return !!endpointChoice();
      if(key==='event-time')return state.result.representative.eventSeries.some(function(row){return Object.keys(row.counts||{}).length;});
      if(key==='events')return eventSummary().length>0;
      if(key==='clusters')return state.result.representative.clusters&&state.result.representative.clusters.sizes.length>0;
      return true;
    });
  }
  function populatePlotSelectors() {
    const keys=compatiblePlotKeys(),used=new Set();
    SIDES.forEach(function(side,index){const select=$(side+'AgentPlotType');select.innerHTML=keys.map(function(key){return '<option value="'+key+'">'+esc(PLOTS[key].label)+'</option>';}).join('');let desired=state.plotTypes[side];if(!keys.includes(desired)||used.has(desired))desired=keys.find(function(key){return !used.has(key);})||keys[index%keys.length];state.plotTypes[side]=desired;used.add(desired);select.value=desired;});
  
  if(root.FokoScientificRegistry) root.FokoScientificRegistry.notifyOptionsChanged('agent');
}
  function renderStateLegend(side, kind) {
    const legend=$(side+'AgentPlotLegend'); if(!legend)return;
    const lattice = PLOTS[kind] && PLOTS[kind].lattice;
    const names = state.result ? state.result.states : (state.live.active ? state.live.states : []);
    const colors = state.result ? state.result.colors : (state.live.active ? state.live.colors : []);
    if(!lattice || !names.length){legend.innerHTML='';legend.hidden=true;return;}
    legend.hidden=false; legend.innerHTML=names.map(function(name,index){return '<span><i style="background:'+esc(colors[index]||'#94a3b8')+'"></i>'+esc(name)+'</span>';}).join('');
  }
  function stopAnimation(side) {
    const animation=state.animations[side];
    if(!animation)return;
    animation.playing=false;
    if(animation.timer){clearTimeout(animation.timer);animation.timer=0;}
    state.animations[side]=null;
    const host=document.getElementById(side+'AgentPlot');if(host)host.classList.remove('has-agent-animation');
  }
  function drawAnimationGrid(animation, index) {
    if(!animation||!animation.snapshots.length)return;
    const frame=Math.max(0,Math.min(animation.snapshots.length-1,index));
    animation.frameIndex=frame;
    const snapshot=animation.snapshots[frame],canvas=animation.canvas,wrap=animation.wrap;
    const width=Math.max(280,Math.floor(wrap.clientWidth||canvas.clientWidth||520));
    const height=Math.max(280,Math.min(520,Math.floor((wrap.clientHeight||420))));
    const dpr=Math.min(2,root.devicePixelRatio||1);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);c.fillStyle='#ffffff';c.fillRect(0,0,width,height);
    const size=state.result.config.size,pad=18,usableW=width-2*pad,usableH=height-2*pad,cell=Math.max(.5,Math.min(usableW/size,usableH/size));
    const gridW=cell*size,gridH=cell*size,ox=(width-gridW)/2,oy=(height-gridH)/2;
    const grid=snapshot.grid,colors=state.result.colors;
    for(let row=0;row<size;row++)for(let col=0;col<size;col++){
      const value=grid[row*size+col];c.fillStyle=colors[value]||'#e2e8f0';c.fillRect(ox+col*cell,oy+row*cell,Math.ceil(cell+.2),Math.ceil(cell+.2));
    }
    c.strokeStyle='rgba(15,23,42,.32)';c.lineWidth=1;c.strokeRect(ox-.5,oy-.5,gridW+1,gridH+1);
    animation.slider.value=String(frame);
    animation.output.textContent='Step '+snapshot.step+' · frame '+(frame+1)+'/'+animation.snapshots.length;
    animation.host.dataset.animationStep=String(snapshot.step);
  }
  function scheduleAnimation(side) {
    const animation=state.animations[side];
    if(!animation||!animation.playing)return;
    if(animation.timer)clearTimeout(animation.timer);
    animation.timer=setTimeout(function(){
      const current=state.animations[side];if(!current||!current.playing)return;
      const next=current.frameIndex+1; if(next>=current.snapshots.length){setAnimationPlaying(side,false);current.playButton.textContent='Replay';return;} drawAnimationGrid(current,next);scheduleAnimation(side);
    },animation.delay);
  }
  function setAnimationPlaying(side, playing) {
    const animation=state.animations[side];if(!animation)return;
    animation.playing=Boolean(playing);animation.playButton.textContent=animation.playing?'Pause':(animation.frameIndex>=animation.snapshots.length-1?'Replay':'Play');animation.playButton.setAttribute('aria-pressed',String(animation.playing));
    if(animation.playing)scheduleAnimation(side);else if(animation.timer){clearTimeout(animation.timer);animation.timer=0;}
  }
  function redrawAnimation(side) {
    const animation=state.animations[side];if(animation)drawAnimationGrid(animation,animation.frameIndex);
  }
  async function renderAnimatedSpatial(side, host, meta, ticket) {
    if (!host) throw new Error('Agent animation host is unavailable for ' + side + '.');
    const snapshots=(state.result.representative.snapshots||[]).slice();
    if(snapshots.length<2)throw new Error('The representative run did not record enough lattice frames for animation.');
    host.classList.add('has-agent-animation');
    const rootNode=customRenderRoot(host,'spatial-animation');
    const wrap=document.createElement('div');wrap.className='agent-animation-canvas-wrap';
    const canvas=document.createElement('canvas');canvas.className='agent-animation-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',meta.title+' at the selected algorithmic step');wrap.appendChild(canvas);
    const controls=document.createElement('div');controls.className='agent-animation-controls';
    const play=document.createElement('button');play.type='button';play.className='secondary agent-animation-play';play.textContent='Replay';play.setAttribute('aria-pressed','false');play.setAttribute('aria-label','Play or pause the spatial dynamics animation');
    const slider=document.createElement('input');slider.type='range';slider.className='agent-animation-slider';slider.min='0';slider.max=String(snapshots.length-1);slider.step='1';slider.value='0';slider.setAttribute('aria-label','Spatial dynamics frame');
    const output=document.createElement('output');output.className='agent-animation-step';output.textContent='Step '+snapshots[0].step;
    const speed=document.createElement('select');speed.className='agent-animation-speed';speed.setAttribute('aria-label','Animation speed');speed.innerHTML='<option value="900">0.7×</option><option value="600" selected>1×</option><option value="360">1.7×</option><option value="220">2.7×</option>';
    controls.append(play,slider,output,speed);rootNode.append(wrap,controls);
    const animation={side:side,host:host,wrap:wrap,canvas:canvas,playButton:play,slider:slider,output:output,speed:speed,snapshots:snapshots,frameIndex:0,delay:Number(speed.value),playing:false,timer:0};
    state.animations[side]=animation;
    slider.addEventListener('input',function(){setAnimationPlaying(side,false);drawAnimationGrid(animation,Number(this.value));});
    play.addEventListener('click',function(){if(!animation.playing&&animation.frameIndex>=animation.snapshots.length-1)drawAnimationGrid(animation,0);setAnimationPlaying(side,!animation.playing);});
    speed.addEventListener('change',function(){animation.delay=Number(this.value)||600;if(animation.playing)scheduleAnimation(side);});
    const reduceMotion=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion){animation.playing=false;play.textContent='Replay';play.setAttribute('aria-pressed','false');}
    await nextFrame();if(ticket!==state.plotSerial[side]){if(state.animations[side]===animation)stopAnimation(side);return 'stale';}
    drawAnimationGrid(animation,snapshots.length-1);markSingleActiveRenderRoot(host,'spatial-animation');PLOT.setState(host, 'rendered', false);return 'rendered';
  }
  function fallbackCanvas(host,kind){
    if (!host) throw new Error('Agent fallback plot host is unavailable.');
    const r=state.result,rep=r.representative,states=r.states,colors=r.colors;
    PLOT.takeover(host, 'rendering'); const rootNode=customRenderRoot(host,'fallback-'+kind); const canvas=document.createElement('canvas'); const width=Math.max(300,host.clientWidth||520),height=Math.max(320,Math.min(500,host.clientHeight||420)),dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',PLOTS[kind].title+' fallback rendering');rootNode.appendChild(canvas);
    const c=canvas.getContext('2d');c.scale(dpr,dpr);c.fillStyle='#fff';c.fillRect(0,0,width,height);c.font='12px Inter,system-ui,sans-serif';c.fillStyle='#334155';c.fillText('Canvas fallback · computed evidence',16,20);
    const L=52,R=20,T=42,B=58,W=width-L-R,H=height-T-B;
    function axes(xLabel,yLabel){c.strokeStyle='#94a3b8';c.lineWidth=1;c.beginPath();c.moveTo(L,T);c.lineTo(L,T+H);c.lineTo(L+W,T+H);c.stroke();c.fillStyle='#475569';c.textAlign='center';c.fillText(xLabel,L+W/2,height-12);c.save();c.translate(14,T+H/2);c.rotate(-Math.PI/2);c.fillText(yLabel,0,0);c.restore();}
    function lineSeries(times,series,palette,yLabel,maxOverride){const maxX=Math.max.apply(null,times)||1,maxY=maxOverride||Math.max(1,...series.flat().filter(Number.isFinite).map(Number));axes('algorithmic step',yLabel||'value');series.forEach(function(values,j){c.strokeStyle=(palette||colors)[j%(palette||colors).length];c.lineWidth=2;c.beginPath();values.forEach(function(v,i){if(!Number.isFinite(v))return;const x=L+W*(times[i]/maxX),y=T+H*(1-v/maxY);if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();});}
    function drawGrid(grid,x0,y0,panelW,panelH,label){const size=r.config.size,cell=Math.min(panelW/size,panelH/size),ox=x0+(panelW-cell*size)/2,oy=y0+(panelH-cell*size)/2;c.imageSmoothingEnabled=false;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const v=grid[y*size+x];c.fillStyle=colors[v]||'#e2e8f0';c.fillRect(ox+x*cell,oy+y*cell,Math.ceil(cell+.25),Math.ceil(cell+.25));}c.strokeStyle='#94a3b8';c.strokeRect(ox,oy,cell*size,cell*size);c.fillStyle='#475569';c.textAlign='center';c.fillText(label,x0+panelW/2,y0-5);}
    if(kind==='spatial-dynamics'){
      // A single representative frame is the honest fallback when animation cannot mount.
      drawGrid(rep.finalGrid,L,T,W,H,'step '+r.config.steps);
    } else if(kind==='initial'||kind==='spatial') drawGrid(kind==='initial'?rep.initialGrid:rep.finalGrid,L,T,W,H,kind==='initial'?'step 0':'step '+r.config.steps);
    else if(kind==='change'){
      const size=r.config.size,cell=Math.min(W/size,H/size),ox=L+(W-cell*size)/2,oy=T+(H-cell*size)/2;c.imageSmoothingEnabled=false;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x;c.fillStyle=rep.initialGrid[i]===rep.finalGrid[i]?'#f1f5f9':'#e11d48';c.fillRect(ox+x*cell,oy+y*cell,Math.ceil(cell+.2),Math.ceil(cell+.2));}c.strokeStyle='#94a3b8';c.strokeRect(ox,oy,cell*size,cell*size);
    } else if(kind==='population') lineSeries(r.times,states.map(function(_,j){return r.ensemble.mean.map(function(row){return row[j];});}),colors,'agent count');
    else if(kind==='representative') lineSeries(rep.times,states.map(function(_,j){return rep.counts.map(function(row){return row[j];});}),colors,'agent count');
    else if(kind==='spatial-metrics'){const spatial=r.ensemble.spatial;lineSeries(spatial.times,[spatial.autocorrelation.mean,spatial.agreement.mean,spatial.diversity.mean,spatial.occupiedFraction.mean],['#155eef','#0891b2','#7c3aed','#0f766e'],'spatial metric',1);}
    else if(kind==='cluster-dynamics'){const spatial=r.ensemble.spatial;lineSeries(spatial.times,[spatial.clusterCount.mean],['#b45309'],'cluster count');}
    else if(kind==='phase'){
      const selected=phaseStates(r);const xs=r.ensemble.mean.map(function(row){return row[selected[0].index];}),ys=r.ensemble.mean.map(function(row){return row[selected[1].index];});const maxX=Math.max(1,...xs),maxY=Math.max(1,...ys);axes(selected[0].name,selected[1].name);c.strokeStyle='#155eef';c.lineWidth=2.5;c.beginPath();xs.forEach(function(v,i){const x=L+W*v/maxX,y=T+H*(1-ys[i]/maxY);if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();
    } else {
      let labels=[],values=[];
      if(kind==='events'){const rows=eventSummary();labels=rows.map(function(o){return o.name;});values=rows.map(function(o){return o.mean;});}
      else if(kind==='outcomes'){const rows=r.ensemble.absorption.terminalOutcomes||[];labels=rows.map(function(o){return o.label;});values=rows.map(function(o){return o.proportion;});}
      else if(kind==='final-distribution'){labels=states;values=r.ensemble.finalByState.map(function(v){return CORE.summarizeValues(v).mean;});}
      else if(kind==='composition'){labels=states;values=r.ensemble.finalByState.map(function(v){return CORE.summarizeValues(v).mean/(r.config.size*r.config.size);});}
      else if(kind==='clusters'){values=(rep.clusters&&rep.clusters.sizes)||[];labels=values.map(function(_,i){return String(i+1);});}
      else if(kind==='endpoint'){const endpoint=endpointChoice();values=endpoint?endpoint.summary.values:[];labels=values.map(function(_,i){return String(i+1);});}
      else if(kind==='endpoint-spatial'){const endpoint=endpointChoice();values=endpoint?endpoint.summary.values:[];labels=values.map(function(_,i){return String(i+1);});}
      else if(kind==='diversity')values=r.ensemble.metrics.normalizedDiversity.values;
      else if(kind==='agreement')values=r.ensemble.metrics.spatialAgreement.values;
      else if(kind==='spatial-autocorrelation')values=r.ensemble.metrics.categoricalAutocorrelation.values;
      else if(kind==='event-time'){const rows=rep.eventSeries;values=rows.map(function(row){return Object.values(row.counts||{}).reduce(function(a,b){return a+b;},0);});labels=rows.map(function(row){return String(row.step);});}
      const max=Math.max(1,...values.filter(Number.isFinite).map(Number));axes(labels.length>16?'index':'category','value');const bw=W/Math.max(1,values.length);values.forEach(function(v,i){const h=H*Number(v)/max;c.fillStyle=colors[i%colors.length]||'#155eef';c.fillRect(L+i*bw+1,T+H-h,Math.max(1,bw-2),h);});
    }
    markSingleActiveRenderRoot(host,'fallback-'+kind);PLOT.setState(host, 'fallback', false);
  }
  function hasVisibleEvidence(host) {
    const canvas=host.querySelector('canvas'); if(canvas&&canvas.width>100&&canvas.height>100)return true;
    const svg=host.querySelector('.main-svg, svg'); if(svg){const rect=svg.getBoundingClientRect();if(rect.width>100&&rect.height>100)return true;}
    return false;
  }
  async function renderPlot(side) {
    if(!state.result)return 'idle'; const ticket=++state.plotSerial[side]; const kind=state.plotTypes[side],meta=PLOTS[kind],host=$(side+'AgentPlot');
    $(side+'AgentPlotTitle').textContent=meta.title;$(side+'AgentPlotEvidence').textContent=meta.evidence;renderStateLegend(side,kind);state.lastPlotSide=side;
    if(!visibleSides().includes(side)){stopAnimation(side);PLOT.setState(host, 'pending', false);return 'pending';}
    teardownPanel(side,'rendering');
    if(kind==='spatial-dynamics'){
      try{return await renderAnimatedSpatial(side,host,meta,ticket);}catch(error){if(ticket!==state.plotSerial[side])return 'stale';fallbackCanvas(host,'spatial');$(side+'AgentPlotEvidence').textContent=meta.evidence+' Animation controls could not mount, so the current representative lattice is shown as a static canvas.';return 'fallback';}
    }
    const spec=plotSpec(kind);
    try{
      if(host.clientWidth<180||host.clientHeight<180)throw new Error('Plot host has no usable geometry.');
      if(!spec.traces.length)throw new Error('This result has no compatible traces for the selected plot.');
      const outcome=await PLOT.render(host,spec.traces,spec.layout,{responsive:true,displaylogo:false,displayModeBar:'hover'});
      if(ticket!==state.plotSerial[side])return 'stale';
      if(outcome&&outcome.error)throw outcome.error;
      if(!host.data||!host.data.length||!hasVisibleEvidence(host))throw new Error('Plotly returned no visible evidence.');
      markSingleActiveRenderRoot(host,kind);
      return 'rendered';
    }catch(error){if(ticket!==state.plotSerial[side])return 'stale';fallbackCanvas(host,kind);$(side+'AgentPlotEvidence').textContent=meta.evidence+' Plotly could not mount this panel, so the same computed result is shown with the built-in canvas fallback.';return 'fallback';}
  }
  function safeStoredLayout() {
    try {
      const saved=JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)||'null');
      if(saved&&VALID_LAYOUTS.has(saved.layout))state.layout=saved.layout;
      if(saved&&VALID_SIDES.has(saved.focus))state.focusSide=saved.focus;
    } catch (_) { /* Invalid local state must not affect the workspace. */ }
  }
  function persistLayout() {
    localStorage.setItem(LAYOUT_STORAGE_KEY,JSON.stringify({layout:state.layout,focus:state.focusSide}));
  }
  function effectiveLayout() { return root.FokoLayoutStability.effectiveLayout(state.layout,{breakpoint: 1024,compatibleCount: 2}); }
  function visibleSides() { return state.effectiveLayout==='focus'?[state.focusSide]:SIDES.slice(); }
  function syncLayoutDom() {
    const grid=$('agentPlotGrid');
    if(!grid)return null;
    const report=root.FokoLayoutStability.apply({
      grid:grid,
      preferred:state.layout,
      focus:state.focusSide,
      breakpoint: 1024,
      compatibleCount: 2,
      layoutButtons:'[data-layout-mode]',
      focusButtons:'.focus-card[data-focus-side]'
    });
    state.effectiveLayout=report?report.effective:effectiveLayout();
    return report;
  }
  function refreshVisiblePanels() {
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      const activeSides=visibleSides();
      SIDES.forEach(function(side){if(!activeSides.includes(side))stopAnimation(side);});
      activeSides.forEach(function(side){
        const host=$(side+'AgentPlot');
        if(!state.result||!host)return;
        if(host.dataset.renderState==='rendered'){
          if(state.animations[side])redrawAnimation(side);
          else PLOT.resize(host);
        } else renderPlot(side);
      });
    });});
  }
  function renderLayout(renderVisible) {
    const report=syncLayoutDom();
    if(renderVisible!==false)refreshVisiblePanels();
    if(root.FokoScientificRegistry)root.FokoScientificRegistry.notifyRendered('agent');
    return report;
  }
  function chooseLayout(layout) {
    if(!VALID_LAYOUTS.has(layout))return renderLayout(false);
    state.layout=layout;
    persistLayout();
    return renderLayout(true);
  }
  function chooseFocus(side) {
    if(!VALID_SIDES.has(side))return renderLayout(false);
    state.focusSide=side;
    state.layout='focus';
    persistLayout();
    return renderLayout(true);
  }
  function endpointHtml() {
    const endpoint=endpointChoice(); if(!endpoint)return '<p>No model-specific scalar endpoint was defined.</p>';
    return '<p><b>'+esc(endpoint.label)+':</b> mean '+fmt(endpoint.summary.mean,3)+'; Monte Carlo SE '+fmt(endpoint.summary.mcse,3)+'; 5–95% ['+fmt(endpoint.summary.q05,3)+', '+fmt(endpoint.summary.q95,3)+'].</p>';
  }
  function diagnosticsHtml() {
    const r=state.result,rep=r.representative;
    const rows=r.states.map(function(name,i){const summary=CORE.summarizeValues(r.ensemble.finalByState[i]);return '<tr><th>'+esc(name)+'</th><td>'+fmt(rep.finalCounts[i],0)+'</td><td>'+fmt(summary.mean,1)+'</td><td>'+fmt(summary.mcse,2)+'</td><td>['+fmt(summary.q05,1)+', '+fmt(summary.q95,1)+']</td></tr>';}).join('');
    const events=eventSummary().map(function(o){return '<li>'+esc(o.name)+': mean '+fmt(o.mean,1)+'; 5–95% ['+fmt(o.q05,1)+', '+fmt(o.q95,1)+']</li>';}).join('')||'<li>No transitions were recorded.</li>';
    const absorption=r.ensemble.absorption;
    const exact='<p><b>Initial population:</b> '+r.config.initialCounts.map(function(value,index){return esc(r.states[index])+': '+value;}).join('; ')+' ('+esc(r.config.initialMode)+' input).</p>'; const normalized=r.config.initialFractionsWereNormalized?'<p><b>Initialization normalization:</b> entered fractions summed to '+fmt(r.provenance.initialFractionInputSum,4)+' and were normalized to one before simulation.</p>':'';
    return exact+'<table class="diagnostic-table"><thead><tr><th>Final state</th><th>Representative</th><th>Mean</th><th>MCSE</th><th>5–95%</th></tr></thead><tbody>'+rows+'</tbody></table>'+endpointHtml()+'<p><b>Irreversible terminal condition reached:</b> '+absorption.count+'/'+r.config.runs+' ('+fmt(100*absorption.fraction,1)+'%; Wilson 95% ['+fmt(100*absorption.wilson95.low,1)+'%, '+fmt(100*absorption.wilson95.high,1)+'%]). Median first recorded terminal step: '+fmt(absorption.stepSummary.q50,1)+'.</p><p><b>Clusters:</b> representative '+rep.metrics.clusterCount+'; largest occupied-state cluster fraction '+fmt(rep.metrics.largestClusterFraction,3)+'.</p>'+normalized+'<h3>Transition events per run</h3><ul>'+events+'</ul><h3>Interpretation boundary</h3><p>One step is one '+esc(r.config.updateSchedule)+' site-based asynchronous lattice sweep. Finite-run percentiles and Monte Carlo errors describe simulation variability only. They do not estimate parameter uncertainty, measurement error, model discrepancy, stationarity or real-world predictive validity.</p>';
  }
  async function renderResult() {
    const r=state.result,rep=r.representative,meta=r.config.model==='custom'?r.config.customModel:CORE.MODEL_META[r.config.model];populatePlotSelectors();renderLayout(false);$('agentTopStatus').textContent='Rendering';
    $('agentResultKind').textContent=meta.title+' · '+r.config.runs+' runs · master seed '+r.config.seed+' · config '+r.provenance.configHash;$('agentRuntime').textContent=fmt(state.runtime,1)+' ms';$('agentResultModel').textContent=meta.title;$('agentResultRuns').textContent=String(r.config.runs);$('agentResultGrid').textContent=r.config.size+'×'+r.config.size;$('agentOccupied').textContent=fmt(rep.metrics.occupied,0);$('agentAgreement').textContent=fmt(rep.metrics.spatialAgreement);if($('agentAutocorrelation'))$('agentAutocorrelation').textContent=fmt(rep.metrics.categoricalAutocorrelation);$('agentDiversity').textContent=fmt(rep.metrics.normalizedDiversity);$('agentAttempts').textContent=String(r.config.size*r.config.size*r.config.steps);if($('agentAbsorbed'))$('agentAbsorbed').textContent=fmt(100*r.ensemble.absorption.fraction,1)+'%';if($('agentLargestCluster'))$('agentLargestCluster').textContent=fmt(rep.metrics.largestClusterFraction,3);
    $('agentDiagnostics').classList.remove('empty');$('agentDiagnostics').innerHTML=diagnosticsHtml();$('agentBoundaryStatus').textContent='Browser-computed finite stochastic ensemble';$('agentBoundaryAlgorithm').textContent=r.provenance.updateSchedule+' · '+r.provenance.siteUpdateSemantics+' · '+r.provenance.updateAttemptsPerStep+' attempts/step';$('agentBoundaryTopology').textContent=r.config.neighborhood+' · '+r.config.boundary+' boundary · '+r.config.initialization+' initialization';$('agentBoundarySeeds').textContent='master '+r.config.seed+'; '+r.provenance.seeds.slice(0,3).join(', ')+' … ('+r.config.runs+' derived)';$('agentBoundaryClaim').textContent='Conditional simulation evidence under explicit local rules';$('agentBoundaryText').textContent='No calibration, causal interpretation, equilibrium certificate or external validity is implied by the simulated patterns. Configuration hash: '+r.provenance.configHash+'.';
    const results=await Promise.all(visibleSides().map(renderPlot));if(results.some(function(value){return value!=='rendered'&&value!=='fallback';}))throw new Error('At least one visible panel did not produce evidence.');renderLayout(false);$('agentTopStatus').textContent='Rendered';
  }
  function configForStorage(){return configFromInputs();}
  function csvResult(){const r=state.result;const head=['step'].concat(r.states.map(function(s){return s+'_mean';}),r.states.map(function(s){return s+'_q05';}),r.states.map(function(s){return s+'_q95';}));const rows=[head];r.times.forEach(function(t,i){rows.push([t].concat(r.ensemble.mean[i],r.ensemble.q05[i],r.ensemble.q95[i]));});return rows.map(function(row){return row.join(',');}).join('\n')+'\n';}
  function pythonScript(){const c=configForStorage();return '# Foko Lab v'+RELEASE+' Agent validation scaffold\n# Reimplement the exact update schedule and topology before comparing results.\nimport json\nconfig = '+JSON.stringify(c,null,2)+'\nprint(json.dumps(config, indent=2))\n# Required external checks: derived seeds, finite-size effects, alternative update\n# schedules/topologies, parameter sensitivity, and an explicit observation model\n# before calibration to empirical data.\n';}
  function exportPlot(side,format){if(!state.result)return;const host=$(side+'AgentPlot'),canvas=host&&host.querySelector('canvas');if(host&&host.data&&root.Plotly&&typeof root.Plotly.downloadImage==='function'){root.Plotly.downloadImage(host,{format:format||'png',filename:'fokolab-agent-'+state.plotTypes[side],width:1100,height:760});return;}if(canvas&&(format||'png')==='png'){const link=document.createElement('a');link.download='fokolab-agent-'+state.plotTypes[side]+'.png';link.href=canvas.toDataURL('image/png');link.click();return;}$('agentStatus').textContent='This panel is using the canvas fallback; PNG export is available, but SVG requires Plotly.';}
  function copyShareUrl(){const url=new URL(location.href);url.searchParams.set('state',encodeState(configForStorage()));const done=function(){$('agentStatus').textContent='Share URL copied. It contains configuration and seed only.';};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url.toString()).then(done).catch(function(){prompt('Copy share URL',url.toString());});else prompt('Copy share URL',url.toString());}
  function bind(){
    $('loadAgentPreset').addEventListener('click',function(){loadPreset($('agentPresetSelect').value);});$('agentPresetSelect').addEventListener('change',function(){loadPreset(this.value);});$('agentPresetDeck').addEventListener('click',function(e){const b=e.target.closest('[data-preset]');if(b)loadPreset(b.dataset.preset);});
    $('agentModel').addEventListener('change',function(){if(this.value==='custom'&&!$('agentCustomModelJson').value.trim())$('agentCustomModelJson').value=JSON.stringify(CUSTOM_TEMPLATE,null,2);const meta=metaForUi(this.value);renderEditors(this.value,Object.fromEntries(meta.params.map(function(k){return [k,meta.parameters&&meta.parameters[k]!=null?meta.parameters[k]:0.05];})),meta.defaultFractions);clearComputed('Model changed. Configure the rules and exact initial population, then run the ensemble.');});$('agentInitialMode').addEventListener('change',function(){if(this.value==='counts')syncCountsFromFractions();setInitialMode(this.value);});$('agentSize').addEventListener('change',syncCountsFromFractions);$('validateAgentCustomModel').addEventListener('click',function(){try{const meta=parseCustomModel();renderEditors('custom',meta.parameters,meta.defaultFractions);$('agentStatus').textContent='Custom model validated: '+meta.states.length+' states and '+meta.transitions.length+' ordered transition rules.';}catch(error){$('agentStatus').textContent=error.message;}});$('downloadAgentModelTemplate').addEventListener('click',function(){download('fokolab-agent-custom-template.json',JSON.stringify(CUSTOM_TEMPLATE,null,2),'application/json');});if($('exportAgentModel'))$('exportAgentModel').addEventListener('click',function(){try{const config=configForStorage();const meta=config.model==='custom'?config.customModel:CORE.MODEL_META[config.model];download('fokolab-agent-model-'+config.model+'.json',JSON.stringify({schema:'foko.agent-model/1',release:RELEASE,model:config.model,title:meta.title,states:meta.states,colors:meta.colors,parameters:config.params,customModel:config.model==='custom'?config.customModel:null,initialPopulation:{mode:config.initialMode,counts:config.initialCounts,fractions:config.initialFractions},topology:{size:config.size,neighborhood:config.neighborhood,boundary:config.boundary,updateSchedule:config.updateSchedule,initialization:config.initialization}},null,2),'application/json');$('agentStatus').textContent='Exact model definition exported separately from simulation results.';}catch(error){$('agentStatus').textContent='Model export failed: '+error.message;}});$('agentCustomModelFile').addEventListener('change',function(){const file=this.files&&this.files[0];if(!file)return;file.text().then(function(text){$('agentCustomModelJson').value=text;$('agentModel').value='custom';const meta=parseCustomModel();renderEditors('custom',meta.parameters,meta.defaultFractions);clearComputed('Custom model imported and validated.');}).catch(function(error){$('agentStatus').textContent='Custom model import failed: '+error.message;});});$('importAgentConfig').addEventListener('change',function(){const file=this.files&&this.files[0];if(!file)return;file.text().then(function(text){const parsed=JSON.parse(text);applyConfig(parsed.result&&parsed.result.config?parsed.result.config:(parsed.config||parsed),'Imported Agent configuration loaded. Run to regenerate evidence.');}).catch(function(error){$('agentStatus').textContent='Agent configuration import failed: '+error.message;});});$('runAgent').addEventListener('click',run);$('resetAgent').addEventListener('click',function(){loadPreset(state.preset);});if($('pauseAgent'))$('pauseAgent').addEventListener('click',togglePause);if($('cancelAgent'))$('cancelAgent').addEventListener('click',cancelRun);
    SIDES.forEach(function(side){$(side+'AgentPlotType').addEventListener('change',function(){const requested=this.value,old=state.plotTypes[side],changed=[side],other=SIDES.find(function(candidate){return candidate!==side&&state.plotTypes[candidate]===requested;});if(other&&old&&old!==requested){state.plotTypes[other]=old;$(other+'AgentPlotType').value=old;changed.push(other);}state.plotTypes[side]=requested;if(state.live.active&&!state.result)refreshLivePanels(changed);else changed.forEach(function(changedSide){if(visibleSides().includes(changedSide))renderPlot(changedSide);});});});document.querySelectorAll('[data-layout-mode]').forEach(function(b){b.addEventListener('click',function(){chooseLayout(this.dataset.layoutMode);});});document.querySelectorAll('.focus-card[data-focus-side]').forEach(function(b){b.addEventListener('click',function(event){event.stopPropagation();chooseFocus(this.dataset.focusSide);});});document.querySelectorAll('[data-export-side]').forEach(function(b){b.addEventListener('click',function(){exportPlot(this.dataset.exportSide,'png');});});$('exportAgentPng').addEventListener('click',function(){exportPlot(state.lastPlotSide,'png');});$('exportAgentSvg').addEventListener('click',function(){exportPlot(state.lastPlotSide,'svg');});
    $('saveAgentSession').addEventListener('click',function(){localStorage.setItem(STORAGE_KEY,JSON.stringify(configForStorage()));$('agentStatus').textContent='Configuration saved locally. Computed output was not stored.';});$('restoreAgentSession').addEventListener('click',function(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return $('agentStatus').textContent='No saved Agent configuration exists.';applyConfig(JSON.parse(raw),'Configuration restored. Run to regenerate evidence.');});$('copyAgentShareUrl').addEventListener('click',copyShareUrl);$('exportAgentCsv').addEventListener('click',function(){if(state.result)download('fokolab-agent-population.csv',csvResult(),'text/csv');});$('exportAgentJson').addEventListener('click',function(){if(state.result)download('fokolab-agent-result.json',JSON.stringify({release:RELEASE,generated:new Date().toISOString(),result:state.result},null,2),'application/json');});$('exportAgentPython').addEventListener('click',function(){download('fokolab-agent-validation.py',pythonScript(),'text/x-python');});
    document.querySelectorAll('[data-jump]').forEach(function(button){button.addEventListener('click',function(){const target=document.querySelector(this.dataset.jump);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('[data-jump]').forEach(function(b){b.classList.toggle('active',b===button);});});});window.addEventListener('resize',function(){renderLayout(true);},{passive:true});
  }
  root.FokoAgentLayout = Object.freeze({render:renderLayout,chooseLayout:chooseLayout,chooseFocus:chooseFocus,report:function(){return syncLayoutDom();}});
  root.FokoAgentRenderInvariant = {
    activeRenderRoots: function (side) { const host=$(side+'AgentPlot'); return activeRenderRoots(host).length; },
    activeRenderKind: function (side) { const host=$(side+'AgentPlot'); return host ? host.dataset.agentRenderKind || '' : ''; }
  };
  function init(){safeStoredLayout();renderLayout(false);$('agentCustomModelJson').value=JSON.stringify(CUSTOM_TEMPLATE,null,2);renderPresetLibrary();populatePlotSelectors();bind();const url=new URL(location.href),encoded=url.searchParams.get('state'),requested=url.searchParams.get('example');if(encoded){try{applyConfig(decodeState(encoded),'Shared configuration loaded. Recomputing from the stored master seed.');setTimeout(run,50);return;}catch(error){$('agentStatus').textContent='Invalid shared state: '+error.message;}}loadPreset(requested&&PRESETS[requested]?requested:state.preset,true);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}(typeof window !== 'undefined' ? window : globalThis));
