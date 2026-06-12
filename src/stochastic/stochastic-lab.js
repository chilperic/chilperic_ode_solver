'use strict';

const $ = id => document.getElementById(id);
const clone = obj => JSON.parse(JSON.stringify(obj));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const fmt = x => {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return '—';
  const n = Number(x);
  if (Math.abs(n) >= 10000 || (Math.abs(n) > 0 && Math.abs(n) < 0.001)) return n.toExponential(3);
  return Math.round(n * 1000) / 1000;
};
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const variance = a => { const m = mean(a); return a.length ? mean(a.map(x => (x - m) ** 2)) : 0; };
const quantile = (a, p) => {
  if (!a.length) return 0;
  const b = [...a].sort((x, y) => x - y);
  const i = clamp(Math.floor(p * (b.length - 1)), 0, b.length - 1);
  return b[i];
};
const sum = a => a.reduce((s, x) => s + x, 0);
function mulberry32(seed) { let a = seed >>> 0; return function() { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randn(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function poisson(lambda, rng) { if (lambda <= 0) return 0; if (lambda < 30) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return k - 1; } return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * randn(rng))); }
function binom(n, p, rng) { n = Math.max(0, Math.floor(n)); p = clamp(p, 0, 1); if (n < 120) { let x = 0; for (let i = 0; i < n; i++) if (rng() < p) x++; return x; } return Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * randn(rng)))); }
function hist(values, bins = 35) { if (!values.length) return { x: [], y: [] }; const mn = Math.min(...values), mx = Math.max(...values); const lo = mn === mx ? mn - 0.5 : mn; const hi = mn === mx ? mx + 0.5 : mx; const w = (hi - lo) / bins || 1; const y = Array(bins).fill(0); values.forEach(v => { let k = Math.floor((v - lo) / w); k = clamp(k, 0, bins - 1); y[k]++; }); return { x: y.map((_, i) => lo + (i + 0.5) * w), y }; }
function grid(tEnd, n) { return Array.from({ length: n }, (_, i) => i * tEnd / (n - 1)); }
function traceLine(name, x, y, extra = {}) { return { type: 'scatter', mode: 'lines', name, x, y, ...extra }; }
function traceMarker(name, x, y, extra = {}) { return { type: 'scatter', mode: 'markers', name, x, y, ...extra }; }
function plotLayout(title, xaxis, yaxis) { return { title: { text: title, font: { size: 14 } }, margin: { l: 52, r: 22, t: 44, b: 46 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'Inter, system-ui, sans-serif' }, xaxis: { title: xaxis, zeroline: false }, yaxis: { title: yaxis, zeroline: false }, legend: { orientation: 'h', y: -0.24 } }; }
function renderPlot(id, traces, title, xaxis, yaxis) { if (!window.Plotly) return; Plotly.react(id, traces, plotLayout(title, xaxis, yaxis), { responsive: true, displaylogo: false }); $(id).classList.add('plot-ready'); }
function downloadText(filename, text, mime = 'text/plain') { const blob = new Blob([text], { type: mime }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function csvEscape(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s; }

const PRESETS = [
  {
    id: 'birth-death', family: 'CTMC / Gillespie', engine: 'ctmc', title: 'Birth-death process',
    tags: ['Gillespie', 'extinction', 'mean-field'],
    concept: 'A population changes by random birth and death events. The deterministic exponential curve hides finite-population extinction.',
    compare: ['Mean-field ODE: dX/dt = (b-d)X.', 'Stochastic CTMC: X is integer-valued and can hit the absorbing state X = 0.'],
    insight: 'This is the smallest serious bridge from ODE thinking to event-based stochastic dynamics.',
    model: { states: [{ name: 'X', initial: 50 }], params: { b: 0.35, d: 0.30 }, events: [{ name: 'birth', propensity: 'b*X', updates: { X: 1 } }, { name: 'death', propensity: 'd*X', updates: { X: -1 } }] },
    settings: { tEnd: 30, runs: 250, plotVariable: 'X' }
  },
  {
    id: 'sir', family: 'CTMC / Gillespie', engine: 'ctmc', title: 'Stochastic SIR epidemic',
    tags: ['epidemic', 'fade-out', 'R0'],
    concept: 'Infection and recovery occur as random events in a finite population.',
    compare: ['Deterministic SIR predicts initial growth when R0 > 1.', 'Stochastic SIR can fade out before a large outbreak, especially from small initial infection.'],
    insight: 'R0 > 1 is not a guarantee. It is an average growth condition, not protection against early bad luck.',
    model: { states: [{ name: 'S', initial: 995 }, { name: 'I', initial: 5 }, { name: 'R', initial: 0 }], params: { beta: 0.32, gamma: 0.10, N: 1000 }, events: [{ name: 'infection', propensity: 'beta*S*I/N', updates: { S: -1, I: 1 } }, { name: 'recovery', propensity: 'gamma*I', updates: { I: -1, R: 1 } }] },
    settings: { tEnd: 160, runs: 300, plotVariable: 'I' }
  },
  {
    id: 'gene-expression', family: 'CTMC / Gillespie', engine: 'ctmc', title: 'Stochastic gene expression',
    tags: ['chemical kinetics', 'noise', 'bursting'],
    concept: 'mRNA and protein counts are generated and degraded by discrete molecular events.',
    compare: ['Rate equations give smooth average mRNA/protein levels.', 'Single-cell trajectories fluctuate strongly, especially at low copy number.'],
    insight: 'Biological noise is not measurement error here. It is part of the mechanism.',
    model: { states: [{ name: 'M', initial: 0 }, { name: 'P', initial: 0 }], params: { k_tx: 1.2, k_tl: 4.0, d_m: 0.25, d_p: 0.04 }, events: [{ name: 'transcription', propensity: 'k_tx', updates: { M: 1 } }, { name: 'mRNA decay', propensity: 'd_m*M', updates: { M: -1 } }, { name: 'translation', propensity: 'k_tl*M', updates: { P: 1 } }, { name: 'protein decay', propensity: 'd_p*P', updates: { P: -1 } }] },
    settings: { tEnd: 120, runs: 160, plotVariable: 'P' }
  },
  {
    id: 'michaelis-menten-ssa', family: 'CTMC / Gillespie', engine: 'ctmc', title: 'Stochastic Michaelis-Menten',
    tags: ['enzyme kinetics', 'SSA', 'chemistry'],
    concept: 'The reaction E + S ⇌ ES → E + P can be simulated by stochastic mass-action events instead of concentration ODEs.',
    compare: ['ODE kinetics assume continuous concentrations.', 'SSA kinetics expose molecule-count noise and reaction waiting times.'],
    insight: 'At low molecule counts, deterministic Michaelis-Menten smooths away discreteness that may matter.',
    model: { states: [{ name: 'E', initial: 30 }, { name: 'S', initial: 120 }, { name: 'ES', initial: 0 }, { name: 'P', initial: 0 }], params: { k1: 0.002, km1: 0.25, kcat: 0.18 }, events: [{ name: 'binding', propensity: 'k1*E*S', updates: { E: -1, S: -1, ES: 1 } }, { name: 'unbinding', propensity: 'km1*ES', updates: { E: 1, S: 1, ES: -1 } }, { name: 'catalysis', propensity: 'kcat*ES', updates: { E: 1, ES: -1, P: 1 } }] },
    settings: { tEnd: 80, runs: 160, plotVariable: 'P' }
  },
  {
    id: 'tcell', family: 'CTMC / Gillespie', engine: 'ctmc', title: 'Reduced T-cell proliferation event model',
    tags: ['CFSE', 'cell division', 'immunology'],
    concept: 'Quiescent T cells activate, activated cells divide into daughter quiescent cells, or die. Generation counts mimic CFSE logic.',
    compare: ['Generation-count ODEs track expected cell numbers.', 'Event simulation tracks activation, division, and apoptosis as competing random jumps.'],
    insight: 'This reduced model is a browser-scale workbench version of the thesis progression from CFSE data to stochastic master-equation thinking.',
    model: makeTCellModel(4), settings: { tEnd: 90, runs: 120, plotVariable: 'live' }
  },
  {
    id: 'galton', family: 'Branching process', engine: 'branching', title: 'Galton-Watson branching process',
    tags: ['extinction', 'genealogy', 'population'],
    concept: 'Each individual independently produces a random number of offspring in the next generation.',
    compare: ['Deterministic recursion: expected population grows like m^n.', 'Stochastic branching: extinction remains possible even when m > 1.'],
    insight: 'Supercritical does not mean safe. The first few generations dominate survival probability.',
    model: { params: { z0: 1, lambda: 1.12, generations: 50 }, offspring: 'poisson' }, settings: { runs: 1000, plotVariable: 'Z' }
  },
  {
    id: 'ruin', family: 'Random walk', engine: 'gambler', title: 'Gambler’s ruin',
    tags: ['absorbing states', 'finance', 'Markov chain'],
    concept: 'Capital moves up or down until it hits ruin or a target.',
    compare: ['Expected drift can be neutral or slightly positive.', 'Absorbing boundaries create ruin risk that average drift alone does not show.'],
    insight: 'A fair game is fatal for finite wealth if the opponent effectively has infinite time and capital.',
    model: { params: { capital: 20, target: 80, pwin: 0.5, maxSteps: 1000 } }, settings: { runs: 1000, plotVariable: 'capital' }
  },
  {
    id: 'ehrenfest', family: 'Finite Markov chain', engine: 'ehrenfest', title: 'Ehrenfest urn model',
    tags: ['thermodynamics', 'recurrence', 'equilibrium'],
    concept: 'At every step one randomly chosen ball moves to the other urn.',
    compare: ['Macroscopic intuition: relaxation toward equal split.', 'Finite stochastic chain: exact initial states recur eventually, although rarely.'],
    insight: 'Entropy-like relaxation and recurrence are not contradictions. They operate at different time scales.',
    model: { params: { balls: 80, initialA: 80, steps: 2500 } }, settings: { runs: 250, plotVariable: 'A' }
  },
  {
    id: 'wright-fisher', family: 'Population genetics', engine: 'wrightfisher', title: 'Wright-Fisher genetic drift',
    tags: ['fixation', 'neutral drift', 'genetics'],
    concept: 'The next generation is sampled from the current allele frequency.',
    compare: ['Neutral deterministic model keeps allele frequency constant.', 'Finite stochastic sampling eventually causes fixation or loss.'],
    insight: 'A neutral allele can dominate without being fitter. Sampling noise is enough.',
    model: { params: { N: 200, p0: 0.35, generations: 500, selection: 0.0 } }, settings: { runs: 500, plotVariable: 'p' }
  },
  {
    id: 'gbm', family: 'SDE', engine: 'gbm', title: 'Geometric Brownian motion',
    tags: ['finance', 'SDE', 'multiplicative noise'],
    concept: 'A positive quantity grows with drift and multiplicative Brownian noise.',
    compare: ['Expected value may grow exponentially.', 'Typical paths can decay when volatility dominates drift.'],
    insight: 'Mean and typical outcome are different objects. This is a Jensen-inequality trap.',
    model: { params: { X0: 1, mu: 0.04, sigma: 0.35, tEnd: 20 } }, settings: { runs: 1000, plotVariable: 'X' }
  },
  {
    id: 'parrondo', family: 'Random walk / game theory', engine: 'parrondo', title: 'Parrondo’s paradox',
    tags: ['paradox', 'switching', 'random walk'],
    concept: 'Two losing games can combine into a winning mixed strategy when one game is state-dependent.',
    compare: ['Each game alone has negative drift.', 'Random switching can exploit state structure and produce positive drift.'],
    insight: 'Averaging strategies is not equivalent to averaging their long-term dynamics.',
    model: { params: { capital: 30, steps: 5000, pA: 0.495, pBad: 0.095, pGood: 0.745, M: 3, mix: 0.5 } }, settings: { runs: 200, plotVariable: 'capital' }
  },
  {
    id: 'resonance', family: 'Noise-assisted dynamics', engine: 'resonance', title: 'Stochastic resonance',
    tags: ['signal processing', 'noise', 'threshold'],
    concept: 'A weak periodic signal cannot cross a threshold alone. Noise can make threshold crossings synchronize with the signal.',
    compare: ['Deterministic weak signal remains hidden below threshold.', 'Moderate noise reveals the signal; too little or too much fails.'],
    insight: 'Noise is not always damage. In threshold systems it can become information.',
    model: { params: { amplitude: 0.65, threshold: 1.0, noise: 0.45, cycles: 8, points: 600 } }, settings: { runs: 200, plotVariable: 'response' }
  },

  {
    id: 'ratchet', family: 'Noise-assisted dynamics', engine: 'ratchet', title: 'Flashing ratchet / Brownian motor',
    tags: ['Brownian motion', 'asymmetry', 'physics'],
    concept: 'Particles diffuse in an asymmetric periodic potential that is switched on and off. Thermal noise plus asymmetry creates directed transport.',
    compare: ['A symmetric deterministic view expects no net motion without a macroscopic force.', 'Stochastic diffusion plus timed asymmetric trapping can create positive average displacement.'],
    insight: 'The motor does not defeat thermodynamics. It rectifies fluctuations by using an externally switched asymmetric potential.',
    model: { params: { particles: 300, cycles: 80, onSteps: 8, offSteps: 14, sigma: 0.16, force: 0.12, asymmetry: 0.32 } }, settings: { runs: 1, plotVariable: 'x' }
  },
  {
    id: 'bandit', family: 'Decision under uncertainty', engine: 'bandit', title: 'Multi-armed bandit',
    tags: ['exploration', 'learning', 'regret'],
    concept: 'A learner chooses between uncertain options and balances immediate reward against information value.',
    compare: ['Greedy control exploits the current best estimate.', 'UCB/Thompson-style control may select uncertain arms because learning has value.'],
    insight: 'The apparently worse option can be rational when uncertainty itself is valuable.',
    model: { params: { horizon: 600, arms: 4, epsilon: 0.08, true1: 0.42, true2: 0.47, true3: 0.50, true4: 0.54 } }, settings: { runs: 300, plotVariable: 'reward' }
  },
  {
    id: 'secretary', family: 'Optimal stopping', engine: 'secretary', title: 'Secretary / search problem',
    tags: ['optimal stopping', 'search', 'decision'],
    concept: 'Offers arrive sequentially; rejected offers cannot be recalled.',
    compare: ['Naive strategy accepts good-looking offers early.', 'Optimal stopping sacrifices early choices to calibrate the threshold.'],
    insight: 'Waiting has option value. More uncertainty can justify stricter thresholds.',
    model: { params: { candidates: 100, observeFrac: 0.37 } }, settings: { runs: 5000, plotVariable: 'rank' }
  }
];
function makeTCellModel(h) {
  const states = [], events = [];
  for (let i = 0; i <= h; i++) { states.push({ name: `Q${i}`, initial: i === 0 ? 80 : 0 }); states.push({ name: `A${i}`, initial: 0 }); }
  states.push({ name: 'D', initial: 0 });
  const params = { alpha: 0.035, pi: 0.18, delta: 0.035 };
  for (let i = 0; i <= h; i++) {
    events.push({ name: `activate_${i}`, propensity: `alpha*Q${i}`, updates: { [`Q${i}`]: -1, [`A${i}`]: 1 } });
    events.push({ name: `death_${i}`, propensity: `delta*A${i}`, updates: { [`A${i}`]: -1, D: 1 } });
    if (i < h) events.push({ name: `divide_${i}`, propensity: `pi*A${i}`, updates: { [`A${i}`]: -1, [`Q${i + 1}`]: 2 } });
  }
  return { states, params, events, derived: { live: 'Q0+Q1+Q2+Q3+Q4+A0+A1+A2+A3+A4' } };
}

let currentPreset = null;
let currentModel = null;
let currentSettings = null;
let lastResult = null;
let activeTab = 'model';

function initTheme() {
  const saved = localStorage.getItem('chilperic-ode-theme') || 'aurora';
  document.documentElement.dataset.theme = saved;
  if ($('themeBtn')) $('themeBtn').value = saved;
  $('themeBtn')?.addEventListener('change', e => { document.documentElement.dataset.theme = e.target.value; localStorage.setItem('chilperic-ode-theme', e.target.value); });
}
function initTabs() {
  document.querySelectorAll('.stoch2-tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
}
function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.stoch2-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.stoch2-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
}
function initLibrary() {
  const families = [...new Set(PRESETS.map(m => m.family))];
  $('familyFilter').innerHTML = '<option value="all">All families</option>' + families.map(f => `<option value="${f}">${f}</option>`).join('');
  $('familyFilter').addEventListener('change', renderLibrary);
  renderLibrary();
}
function renderLibrary() {
  const filter = $('familyFilter').value || 'all';
  $('modelLibrary').innerHTML = PRESETS.filter(p => filter === 'all' || p.family === filter).map(p => `
    <button class="stoch2-model-button ${currentPreset?.id === p.id ? 'active' : ''}" data-id="${p.id}" type="button">
      <b>${p.title}</b><span>${p.family}</span>
    </button>`).join('');
  document.querySelectorAll('.stoch2-model-button').forEach(btn => btn.addEventListener('click', () => loadPreset(btn.dataset.id, true)));
}
function loadPreset(id, updateHash = false) {
  currentPreset = PRESETS.find(p => p.id === id) || PRESETS[0];
  currentModel = clone(currentPreset.model);
  currentSettings = { runs: currentPreset.settings?.runs || 200, seed: 12345, tEnd: currentPreset.settings?.tEnd || currentModel.params?.tEnd || 100, grid: 241, maxEvents: 50000, plotVariable: currentPreset.settings?.plotVariable || firstVariable(currentModel), showMeanField: true };
  if (updateHash) history.replaceState(null, '', '#' + currentPreset.id);
  renderLibrary();
  renderAll();
  runCurrent();
}
function firstVariable(model) { return model.derived ? Object.keys(model.derived)[0] : model.states?.[0]?.name || 'X'; }
function modelVariables(model) { return [...(model.states || []).map(s => s.name), ...Object.keys(model.derived || {})]; }
function renderAll() {
  $('modelFamily').textContent = currentPreset.family;
  $('modelTitle').textContent = currentPreset.title;
  $('modelConcept').textContent = currentPreset.concept;
  $('modelBadges').innerHTML = currentPreset.tags.map(t => `<span>${t}</span>`).join('');
  $('compareBox').innerHTML = `<div><b>Deterministic reading</b><p>${currentPreset.compare[0]}</p></div><div><b>Stochastic reading</b><p>${currentPreset.compare[1]}</p></div>`;
  renderParameterEditor();
  renderStructuredEditor();
  renderJsonEditor();
  renderSettings();
  renderGuide();
  updateExportPreview();
}
function renderParameterEditor() {
  const params = currentModel.params || {};
  $('parameterEditor').innerHTML = Object.keys(params).map(k => `<label><span>${k}</span><input data-param="${k}" type="number" step="any" value="${params[k]}"></label>`).join('') || '<p class="note">No numeric parameters for this model.</p>';
  document.querySelectorAll('[data-param]').forEach(input => input.addEventListener('change', () => { currentModel.params[input.dataset.param] = Number(input.value); syncAfterEdit(); }));
}
function renderStructuredEditor() {
  const box = $('structuredEditor');
  if (currentPreset.engine === 'ctmc') {
    box.innerHTML = `
      <div class="small-title">Initial states</div>
      <div class="stoch2-table"><div class="stoch2-tr head"><span>state</span><span>initial</span></div>${currentModel.states.map((s,i)=>`<div class="stoch2-tr"><input data-state-name="${i}" value="${s.name}"><input data-state-init="${i}" type="number" step="any" value="${s.initial}"></div>`).join('')}</div>
      <div class="small-title">Events / reactions</div>
      <div class="stoch2-event-list">${currentModel.events.map((e,i)=>`<details class="event-row"><summary>${e.name}</summary><label><span>name</span><input data-event-name="${i}" value="${e.name}"></label><label><span>propensity</span><input data-event-prop="${i}" value="${e.propensity}"></label><label><span>updates JSON</span><input data-event-updates="${i}" value='${JSON.stringify(e.updates)}'></label></details>`).join('')}</div>`;
  } else {
    box.innerHTML = '<p class="note">This family uses a specialized simulator. Edit parameters above or the full JSON schema below.</p>';
  }
  box.querySelectorAll('input').forEach(inp => inp.addEventListener('change', structuredChanged));
}
function structuredChanged(e) {
  const t = e.target;
  if (t.dataset.stateName !== undefined) currentModel.states[Number(t.dataset.stateName)].name = t.value.trim();
  if (t.dataset.stateInit !== undefined) currentModel.states[Number(t.dataset.stateInit)].initial = Number(t.value);
  if (t.dataset.eventName !== undefined) currentModel.events[Number(t.dataset.eventName)].name = t.value.trim();
  if (t.dataset.eventProp !== undefined) currentModel.events[Number(t.dataset.eventProp)].propensity = t.value.trim();
  if (t.dataset.eventUpdates !== undefined) {
    try { currentModel.events[Number(t.dataset.eventUpdates)].updates = JSON.parse(t.value); }
    catch { $('validationStatus').textContent = 'Invalid updates JSON.'; $('validationStatus').classList.add('bad'); return; }
  }
  syncAfterEdit();
}
function renderJsonEditor() { $('jsonEditor').value = JSON.stringify({ engine: currentPreset.engine, model: currentModel }, null, 2); }
function applyJson() {
  try {
    const parsed = JSON.parse($('jsonEditor').value);
    currentModel = parsed.model ? parsed.model : parsed;
    $('validationStatus').textContent = 'JSON applied.'; $('validationStatus').classList.remove('bad');
    renderAll(); maybeAutoRun();
  } catch (err) { $('validationStatus').textContent = 'Invalid JSON: ' + err.message; $('validationStatus').classList.add('bad'); }
}
function syncAfterEdit() { renderJsonEditor(); populatePlotVariable(); $('validationStatus').textContent = 'Model updated.'; $('validationStatus').classList.remove('bad'); updateExportPreview(); maybeAutoRun(); }
function renderSettings() {
  $('runsInput').value = currentSettings.runs;
  $('seedInput').value = currentSettings.seed;
  $('tEndInput').value = currentSettings.tEnd;
  $('gridInput').value = currentSettings.grid;
  $('maxEventsInput').value = currentSettings.maxEvents;
  $('meanFieldToggle').checked = currentSettings.showMeanField;
  populatePlotVariable();
}
function populatePlotVariable() {
  const vars = modelVariables(currentModel);
  if (!vars.includes(currentSettings.plotVariable)) currentSettings.plotVariable = vars[0] || 'X';
  $('plotVariable').innerHTML = vars.map(v => `<option value="${v}" ${v === currentSettings.plotVariable ? 'selected' : ''}>${v}</option>`).join('');
}
function readSettings() {
  currentSettings.runs = Number($('runsInput').value);
  currentSettings.seed = Number($('seedInput').value);
  currentSettings.tEnd = Number($('tEndInput').value);
  currentSettings.grid = Number($('gridInput').value);
  currentSettings.maxEvents = Number($('maxEventsInput').value);
  currentSettings.plotVariable = $('plotVariable').value;
  currentSettings.showMeanField = $('meanFieldToggle').checked;
}
function renderGuide() {
  const map = {
    ctmc: ['path ensemble', 'mean and quantile bands', 'final-state distribution', 'event counts and extinction/fade-out diagnostics'],
    branching: ['population genealogy', 'extinction probability', 'final population distribution', 'survival fraction by generation'],
    gambler: ['absorbing boundary probability', 'hitting time', 'sample capital paths'],
    ehrenfest: ['relaxation to equilibrium', 'recurrence risk', 'stationary-like distribution'],
    wrightfisher: ['fixation probability', 'loss probability', 'time to absorption', 'allele-frequency paths'],
    gbm: ['mean vs median', 'path ensemble', 'lognormal spread'],
    parrondo: ['capital trajectories for A, B, and mixed play', 'final profit distribution'],
    resonance: ['threshold crossing rate', 'noise scan', 'signal response'],
    ratchet: ['mean directional transport', 'particle spreading', 'effect of switching asymmetry'],
    bandit: ['cumulative regret', 'arm pulls', 'reward learning'],
    secretary: ['success probability', 'selected-rank distribution', 'stopping threshold']
  };
  $('diagnosticGuide').innerHTML = `<ul>${(map[currentPreset.engine] || []).map(x => `<li>${x}</li>`).join('')}</ul>`;
}
function maybeAutoRun() { if ($('autoRunToggle')?.checked) window.clearTimeout(window.__stochAuto); if ($('autoRunToggle')?.checked) window.__stochAuto = window.setTimeout(runCurrent, 350); }

function compileExpr(expr) {
  return Function('ctx', `with(ctx){ return Math.max(0, Number(${expr}) || 0); }`);
}
function stateObjectFrom(states) { const s = {}; states.forEach(v => { s[v.name] = Number(v.initial) || 0; }); return s; }
function valueOfVar(state, model, variable) {
  if (state[variable] !== undefined) return state[variable];
  if (model.derived?.[variable]) { try { return Function('ctx', `with(ctx){return Number(${model.derived[variable]}) || 0}`)(state); } catch { return 0; } }
  return 0;
}
function runCTMC(model, settings, rng) {
  const events = model.events.map(e => ({ ...e, fn: compileExpr(e.propensity) }));
  const tGrid = grid(settings.tEnd, settings.grid);
  const y = Array(settings.grid).fill(0); const eventCounts = Object.fromEntries(model.events.map(e => [e.name, 0]));
  let st = stateObjectFrom(model.states); let t = 0, idx = 0, steps = 0;
  const fillUntil = time => { while (idx < tGrid.length && tGrid[idx] <= time) { y[idx] = valueOfVar(st, model, settings.plotVariable); idx++; } };
  fillUntil(0);
  while (t < settings.tEnd && steps < settings.maxEvents) {
    const ctx = { ...st, ...(model.params || {}) };
    const props = events.map(e => e.fn(ctx));
    const a0 = sum(props);
    if (!(a0 > 0)) break;
    t += -Math.log(Math.max(rng(), 1e-12)) / a0;
    if (t > settings.tEnd) break;
    let u = rng() * a0, chosen = 0;
    for (let i = 0; i < props.length; i++) { u -= props[i]; if (u <= 0) { chosen = i; break; } }
    const ev = events[chosen];
    for (const [k, delta] of Object.entries(ev.updates || {})) st[k] = Math.max(0, (st[k] || 0) + Number(delta));
    eventCounts[ev.name] += 1; steps += 1; fillUntil(t);
  }
  fillUntil(settings.tEnd + 1e-9);
  return { x: tGrid, y, finalState: st, final: y[y.length - 1], events: eventCounts, steps };
}
function meanFieldCTMC(model, settings) {
  const names = (model.states || []).map(s => s.name); const p = model.params || {}; const events = model.events.map(e => ({ ...e, fn: compileExpr(e.propensity) }));
  let st = stateObjectFrom(model.states); const tGrid = grid(settings.tEnd, settings.grid); const y = [];
  const dt = settings.tEnd / Math.max(1, settings.grid - 1);
  function deriv(s) { const ctx = { ...s, ...p }; const d = Object.fromEntries(names.map(n => [n, 0])); events.forEach(e => { const a = e.fn(ctx); for (const [k, delta] of Object.entries(e.updates || {})) d[k] = (d[k] || 0) + Number(delta) * a; }); return d; }
  function add(s, d, h) { const out = { ...s }; names.forEach(n => out[n] = Math.max(0, s[n] + h * (d[n] || 0))); return out; }
  for (let i = 0; i < tGrid.length; i++) { y.push(valueOfVar(st, model, settings.plotVariable)); const k1 = deriv(st), k2 = deriv(add(st, k1, dt / 2)), k3 = deriv(add(st, k2, dt / 2)), k4 = deriv(add(st, k3, dt)); names.forEach(n => st[n] = Math.max(0, st[n] + dt * ((k1[n] || 0) + 2*(k2[n] || 0) + 2*(k3[n] || 0) + (k4[n] || 0)) / 6)); }
  return { x: tGrid, y };
}
function runEnsembleGeneric(singleRunner, model, settings) {
  const runs = clamp(Math.floor(settings.runs), 1, 10000); const paths = []; const finals = []; const extra = []; const rngSeed = settings.seed || 1;
  for (let r = 0; r < runs; r++) { const out = singleRunner(model, settings, mulberry32(rngSeed + r * 9973)); paths.push(out.y); finals.push(out.final); extra.push(out); }
  const x = extra[0]?.x || grid(settings.tEnd, settings.grid);
  const meanPath = x.map((_, i) => mean(paths.map(p => p[i])));
  const q10 = x.map((_, i) => quantile(paths.map(p => p[i]), 0.1));
  const q90 = x.map((_, i) => quantile(paths.map(p => p[i]), 0.9));
  return { x, paths, finals, extra, meanPath, q10, q90 };
}
function resultFromCTMC(model, settings) {
  const ens = runEnsembleGeneric(runCTMC, model, settings);
  const extinction = ens.finals.filter(v => v <= 0).length / ens.finals.length;
  const traces = ens.paths.slice(0, 12).map((y, i) => traceLine('path ' + (i + 1), ens.x, y, { line: { width: 1 }, opacity: 0.45 }));
  traces.push(traceLine('mean', ens.x, ens.meanPath, { line: { width: 3 } }));
  traces.push(traceLine('10–90% band lower', ens.x, ens.q10, { line: { dash: 'dot', width: 1 } }));
  traces.push(traceLine('10–90% band upper', ens.x, ens.q90, { line: { dash: 'dot', width: 1 }, fill: 'tonexty', opacity: 0.18 }));
  let mf = null; if (settings.showMeanField) { mf = meanFieldCTMC(model, settings); traces.push(traceLine('mean-field', mf.x, mf.y, { line: { dash: 'dash', width: 3 } })); }
  const h = hist(ens.finals);
  const eventMean = {}; Object.keys(ens.extra[0]?.events || {}).forEach(k => eventMean[k] = mean(ens.extra.map(e => e.events[k] || 0)));
  return { engine: 'ctmc', x: ens.x, paths: ens.paths, finals: ens.finals, meanField: mf, eventMean, metrics: { runs: ens.paths.length, 'mean final': mean(ens.finals), 'variance final': variance(ens.finals), 'P(final=0)': extinction, 'mean events': mean(ens.extra.map(e => e.steps)) }, tracesA: traces, tracesB: [{ type: 'bar', x: h.x, y: h.y, name: 'final distribution' }], titleA: `${settings.plotVariable}: stochastic paths and mean`, titleB: `Final ${settings.plotVariable} distribution`, xA: 'time', yA: settings.plotVariable, xB: `final ${settings.plotVariable}`, yB: 'runs' };
}

function runBranching(model, settings) {
  const p = model.params, runs = settings.runs, generations = Math.floor(p.generations), rngSeed = settings.seed; const x = Array.from({ length: generations + 1 }, (_, i) => i), paths = [], finals = [], extinctGen = [];
  for (let r = 0; r < runs; r++) { const rng = mulberry32(rngSeed + r * 17); let z = Math.floor(p.z0); const y = [z]; let extinct = z <= 0 ? 0 : null; for (let g = 1; g <= generations; g++) { let nz = 0; for (let i = 0; i < z && nz < 1e6; i++) nz += poisson(p.lambda, rng); z = nz; if (z === 0 && extinct === null) extinct = g; y.push(z); } paths.push(y); finals.push(z); extinctGen.push(extinct ?? generations); }
  const meanPath = x.map((_, i) => mean(paths.map(y => y[i]))); const h = hist(finals); return { metrics: { runs, 'P(extinction)': finals.filter(v => v === 0).length / runs, 'mean final population': mean(finals), 'median final population': quantile(finals, .5), 'mean extinction generation': mean(extinctGen) }, tracesA: [...paths.slice(0, 16).map((y,i)=>traceLine('tree '+(i+1), x, y, {opacity:.35, line:{width:1}})), traceLine('mean', x, meanPath, {line:{width:3}}), traceLine('deterministic m^n', x, x.map(g => p.z0 * p.lambda ** g), {line:{dash:'dash', width:3}})], tracesB: [{ type: 'bar', x: h.x, y: h.y, name: 'final population' }], titleA: 'Population over generations', titleB: 'Final population distribution', xA: 'generation', yA: 'population', xB: 'final population', yB: 'runs' };
}
function runGambler(model, settings) { const p = model.params, runs = settings.runs, paths=[], finals=[], times=[], success=[]; const maxSteps = Math.floor(p.maxSteps), x=Array.from({length:maxSteps+1},(_,i)=>i); for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*31);let c=p.capital,y=[c],t=0;while(t<maxSteps&&c>0&&c<p.target){c += rng()<p.pwin?1:-1;t++;y.push(c);} while(y.length<x.length)y.push(c);paths.push(y);finals.push(c);times.push(t);success.push(c>=p.target?1:0);} const h=hist(times); return {metrics:{runs,'P(ruin)':finals.filter(v=>v<=0).length/runs,'P(success)':mean(success),'mean hitting time':mean(times),'mean final capital':mean(finals)}, tracesA:paths.slice(0,18).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.45,line:{width:1}})), tracesB:[{type:'bar',x:h.x,y:h.y,name:'hitting time'}], titleA:'Capital paths', titleB:'Hitting-time distribution', xA:'step', yA:'capital', xB:'steps', yB:'runs'}; }
function runEhrenfest(model, settings){const p=model.params,runs=settings.runs,steps=Math.floor(p.steps),x=Array.from({length:steps+1},(_,i)=>i),paths=[],finals=[];for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*43);let a=Math.floor(p.initialA),y=[a];for(let t=0;t<steps;t++){ if(rng()<a/p.balls)a--;else a++; y.push(a);} paths.push(y); finals.push(a);} const meanPath=x.map((_,i)=>mean(paths.map(y=>y[i]))), h=hist(finals,30); return {metrics:{runs,'mean final urn A':mean(finals),'variance final':variance(finals),'equilibrium A':p.balls/2}, tracesA:[...paths.slice(0,12).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.35,line:{width:1}})),traceLine('mean',x,meanPath,{line:{width:3}}),traceLine('equilibrium',x,x.map(()=>p.balls/2),{line:{dash:'dash'}})], tracesB:[{type:'bar',x:h.x,y:h.y,name:'final A'}], titleA:'Urn A over time', titleB:'Final urn-A distribution', xA:'step', yA:'balls in A', xB:'balls in A', yB:'runs'};}
function runWrightFisher(model, settings){const p=model.params,runs=settings.runs,g=Math.floor(p.generations),x=Array.from({length:g+1},(_,i)=>i),paths=[],finals=[],absTimes=[];for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*53);let freq=p.p0,y=[freq],abs=null;for(let i=1;i<=g;i++){let w=freq*(1+p.selection);let pp=w/(w+1-freq);let copies=binom(2*p.N,pp,rng);freq=copies/(2*p.N); if(abs===null && (freq===0||freq===1))abs=i;y.push(freq);}paths.push(y);finals.push(freq);absTimes.push(abs??g);} const meanPath=x.map((_,i)=>mean(paths.map(y=>y[i]))), h=hist(finals,25);return {metrics:{runs,'P(fixation)':finals.filter(v=>v>=1).length/runs,'P(loss)':finals.filter(v=>v<=0).length/runs,'mean final frequency':mean(finals),'mean absorption time':mean(absTimes)}, tracesA:[...paths.slice(0,16).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.35,line:{width:1}})),traceLine('mean',x,meanPath,{line:{width:3}}),traceLine('neutral deterministic',x,x.map(()=>p.p0),{line:{dash:'dash'}})], tracesB:[{type:'bar',x:h.x,y:h.y,name:'final p'}],titleA:'Allele-frequency paths',titleB:'Final allele-frequency distribution',xA:'generation',yA:'allele frequency',xB:'final p',yB:'runs'};}
function runGBM(model, settings){const p=model.params,runs=settings.runs,n=settings.grid,tEnd=p.tEnd||settings.tEnd,dt=tEnd/(n-1),x=grid(tEnd,n),paths=[],finals=[];for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*61);let val=p.X0,y=[val];for(let i=1;i<n;i++){val*=Math.exp((p.mu-.5*p.sigma*p.sigma)*dt+p.sigma*Math.sqrt(dt)*randn(rng));y.push(val);}paths.push(y);finals.push(val);}const meanPath=x.map((_,i)=>mean(paths.map(y=>y[i]))), medianPath=x.map((_,i)=>quantile(paths.map(y=>y[i]),.5)), h=hist(finals);return {metrics:{runs,'mean final':mean(finals),'median final':quantile(finals,.5),'theoretical mean':p.X0*Math.exp(p.mu*tEnd),'typical growth exponent':p.mu-.5*p.sigma*p.sigma}, tracesA:[...paths.slice(0,18).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.3,line:{width:1}})),traceLine('mean',x,meanPath,{line:{width:3}}),traceLine('median',x,medianPath,{line:{dash:'dash',width:3}})], tracesB:[{type:'bar',x:h.x,y:h.y,name:'final X'}],titleA:'GBM paths: mean vs median',titleB:'Final value distribution',xA:'time',yA:'X',xB:'final X',yB:'runs'};}
function runParrondo(model, settings){const p=model.params,runs=settings.runs,steps=Math.floor(p.steps),x=Array.from({length:steps+1},(_,i)=>i);function play(kind,rng){let c=p.capital,y=[c];for(let i=0;i<steps;i++){let pr=p.pA;if(kind==='B')pr=(c%p.M===0)?p.pBad:p.pGood;if(kind==='mix')pr=(rng()<p.mix)?p.pA:((c%p.M===0)?p.pBad:p.pGood);c+=rng()<pr?1:-1;y.push(c);}return y;}const kinds=['A','B','mix'];const traces=[],metrics={runs};kinds.forEach(kind=>{const finals=[],sample=[];for(let r=0;r<runs;r++){const y=play(kind,mulberry32(settings.seed+r*71+(kind==='B'?1000:kind==='mix'?2000:0)));if(r<4)sample.push(y);finals.push(y[y.length-1]);}metrics['mean final '+kind]=mean(finals);sample.forEach((y,i)=>traces.push(traceLine(kind+' path '+(i+1),x,y,{opacity:.45,line:{width:1}})));traces.push(traceLine(kind+' mean final line', [0,steps], [mean(finals),mean(finals)], {line:{dash:kind==='mix'?'solid':'dot'}}));});return {metrics,tracesA:traces,tracesB:[{type:'bar',x:['A','B','mixed'],y:[metrics['mean final A'],metrics['mean final B'],metrics['mean final mix']],name:'mean final capital'}],titleA:'Representative capital paths',titleB:'Mean final capital by strategy',xA:'step',yA:'capital',xB:'strategy',yB:'mean final capital'};}
function runResonance(model, settings){const p=model.params,n=Math.floor(p.points),x=Array.from({length:n},(_,i)=>i/n*p.cycles*2*Math.PI),rng=mulberry32(settings.seed);const signal=x.map(t=>p.amplitude*Math.sin(t));const noisy=signal.map(s=>s+p.noise*randn(rng));const response=noisy.map(v=>v>p.threshold?1:0);const noiseScan=Array.from({length:31},(_,i)=>i*0.06);const quality=noiseScan.map(no=>{let hits=0,correct=0;for(let r=0;r<80;r++){const rr=mulberry32(settings.seed+r*97+Math.floor(no*1000));for(let i=0;i<n;i++){const ideal=signal[i]>.55*p.amplitude?1:0;const out=(signal[i]+no*randn(rr)>p.threshold)?1:0;hits+=out; if(out&&ideal)correct++;}}return hits?correct/hits:0;});return {metrics:{'crossing fraction':mean(response),'best scanned noise':noiseScan[quality.indexOf(Math.max(...quality))],'current noise':p.noise,'response quality':Math.max(...quality)},tracesA:[traceLine('weak signal',x,signal),traceLine('signal + noise',x,noisy,{opacity:.55}),traceLine('threshold',x,x.map(()=>p.threshold),{line:{dash:'dash'}}),traceLine('response',x,response.map(v=>v*p.threshold),{line:{width:3}})],tracesB:[traceLine('response quality',noiseScan,quality)],titleA:'Threshold response to weak periodic signal',titleB:'Noise scan',xA:'phase/time',yA:'signal',xB:'noise amplitude',yB:'quality'};}

function runRatchet(model, settings){
  const p=model.params, particles=Math.floor(p.particles), cycles=Math.floor(p.cycles), onSteps=Math.floor(p.onSteps), offSteps=Math.floor(p.offSteps), sigma=p.sigma, force=p.force, asym=p.asymmetry;
  const totalSteps=cycles*(onSteps+offSteps), dt=1, rng=mulberry32(settings.seed); let xs=Array(particles).fill(0).map(()=>rng());
  const meanX=[], spread=[], time=[];
  function localForce(x){ const u=((x%1)+1)%1; return u<asym ? -force/asym : force/(1-asym); }
  for(let step=0;step<=totalSteps;step++){
    time.push(step); meanX.push(mean(xs)); spread.push(Math.sqrt(variance(xs)));
    const phase=step%(onSteps+offSteps); const on=phase<onSteps;
    xs=xs.map(x=>x+(on?localForce(x):0)*dt+sigma*Math.sqrt(dt)*randn(rng));
  }
  const final=xs; const h=hist(final,40);
  return {metrics:{particles, cycles, 'mean displacement':mean(final), 'spread':Math.sqrt(variance(final)), 'switch period':onSteps+offSteps}, tracesA:[traceLine('mean position',time,meanX,{line:{width:3}}),traceLine('spread',time,spread,{line:{dash:'dot'}})], tracesB:[{type:'bar',x:h.x,y:h.y,name:'final positions'}], titleA:'Directed transport from flashing asymmetric potential', titleB:'Final particle positions', xA:'step', yA:'position', xB:'position', yB:'particles'};
}
function runBandit(model, settings){const p=model.params,runs=settings.runs,h=Math.floor(p.horizon),probs=[p.true1,p.true2,p.true3,p.true4].slice(0,Math.floor(p.arms));const cumRewards=Array(h).fill(0),pulls=Array(probs.length).fill(0),regrets=Array(h).fill(0);const best=Math.max(...probs);for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*83),n=Array(probs.length).fill(0),rew=Array(probs.length).fill(0);let cr=0;for(let t=0;t<h;t++){let arm;if(rng()<p.epsilon){arm=Math.floor(rng()*probs.length);}else{arm=0;let bestScore=-1;for(let a=0;a<probs.length;a++){const avg=n[a]?rew[a]/n[a]:0.5;const ucb=avg+Math.sqrt(2*Math.log(t+2)/(n[a]+1));if(ucb>bestScore){bestScore=ucb;arm=a;}}}const reward=rng()<probs[arm]?1:0;n[arm]++;rew[arm]+=reward;pulls[arm]++;cr+=reward;cumRewards[t]+=cr;regrets[t]+=(t+1)*best-cr;}}const x=Array.from({length:h},(_,i)=>i+1);return {metrics:{runs,'mean final reward':cumRewards[h-1]/runs,'mean final regret':regrets[h-1]/runs,'most pulled arm':pulls.indexOf(Math.max(...pulls))+1},tracesA:[traceLine('mean cumulative reward',x,cumRewards.map(v=>v/runs)),traceLine('mean regret',x,regrets.map(v=>v/runs),{line:{dash:'dash'}})],tracesB:[{type:'bar',x:probs.map((_,i)=>'arm '+(i+1)),y:pulls.map(v=>v/runs),name:'mean pulls'}],titleA:'Learning curve',titleB:'Exploration allocation',xA:'round',yA:'value',xB:'arm',yB:'pulls per run'};}
function runSecretary(model, settings){const p=model.params,runs=settings.runs,n=Math.floor(p.candidates),observe=Math.floor(n*p.observeFrac),ranks=[];let success=0;const rngBase=settings.seed;for(let r=0;r<runs;r++){const rng=mulberry32(rngBase+r*89);const vals=Array.from({length:n},()=>rng()).map((v,i)=>({v,i}));const best=Math.max(...vals.map(o=>o.v));const threshold=Math.max(...vals.slice(0,observe).map(o=>o.v));let chosen=vals[n-1];for(let i=observe;i<n;i++){if(vals[i].v>threshold){chosen=vals[i];break;}}if(chosen.v===best)success++;const sorted=[...vals].sort((a,b)=>b.v-a.v);ranks.push(sorted.findIndex(o=>o.i===chosen.i)+1);}const fracs=Array.from({length:95},(_,i)=>(i+3)/100),curve=fracs.map(f=>f*Math.log(1/f));const h=hist(ranks,30);return {metrics:{runs,'P(best selected)':success/runs,'mean selected rank':mean(ranks),'theoretical optimum fraction':1/Math.E},tracesA:[traceLine('success approximation',fracs,curve),traceMarker('chosen setting',[p.observeFrac],[p.observeFrac*Math.log(1/p.observeFrac)])],tracesB:[{type:'bar',x:h.x,y:h.y,name:'selected rank'}],titleA:'Classic stopping-rule approximation',titleB:'Selected-rank distribution',xA:'observation fraction',yA:'P(best)',xB:'rank, 1 is best',yB:'runs'};}
function computeResult() {
  readSettings();
  const e = currentPreset.engine;
  if (e === 'ctmc') return resultFromCTMC(currentModel, currentSettings);
  if (e === 'branching') return runBranching(currentModel, currentSettings);
  if (e === 'gambler') return runGambler(currentModel, currentSettings);
  if (e === 'ehrenfest') return runEhrenfest(currentModel, currentSettings);
  if (e === 'wrightfisher') return runWrightFisher(currentModel, currentSettings);
  if (e === 'gbm') return runGBM(currentModel, currentSettings);
  if (e === 'parrondo') return runParrondo(currentModel, currentSettings);
  if (e === 'resonance') return runResonance(currentModel, currentSettings);
  if (e === 'ratchet') return runRatchet(currentModel, currentSettings);
  if (e === 'bandit') return runBandit(currentModel, currentSettings);
  if (e === 'secretary') return runSecretary(currentModel, currentSettings);
  throw new Error('Unknown engine: ' + e);
}
function runCurrent() {
  readSettings(); $('runStatus').textContent = 'Running…'; $('runProgress').style.width = '35%';
  window.setTimeout(() => {
    try {
      const started = performance.now(); lastResult = computeResult(); lastResult.runtimeMs = performance.now() - started;
      $('runProgress').style.width = '100%'; $('runStatus').textContent = `Done in ${fmt(lastResult.runtimeMs)} ms.`; renderResult(); updateExportPreview();
      if (activeTab === 'model' || activeTab === 'simulation') setTab('results');
    } catch (err) { $('runStatus').textContent = 'Error: ' + err.message; $('runProgress').style.width = '0%'; console.error(err); }
  }, 20);
}
function renderResult() {
  const m = { ...(lastResult.metrics || {}), 'runtime ms': lastResult.runtimeMs };
  $('summaryGrid').innerHTML = Object.entries(m).map(([k, v]) => `<div><span>${k}</span><b>${fmt(v)}</b></div>`).join('');
  $('insightBox').textContent = currentPreset.insight;
  $('plotALabel').textContent = lastResult.titleA || 'ensemble'; $('plotBLabel').textContent = lastResult.titleB || 'diagnostic';
  renderPlot('plotA', lastResult.tracesA || [], lastResult.titleA || 'Main plot', lastResult.xA || '', lastResult.yA || '');
  renderPlot('plotB', lastResult.tracesB || [], lastResult.titleB || 'Diagnostic', lastResult.xB || '', lastResult.yB || '');
  renderMeanFieldBox();
}
function renderMeanFieldBox() {
  const mf = lastResult?.meanField;
  $('meanFieldBox').innerHTML = mf ? `<h3>Mean-field overlay</h3><p>The dashed curve is generated automatically from the CTMC stoichiometry: drift = sum of event updates multiplied by propensities. This is the stochastic analogue of an ODE limit, not a replacement for the finite-event simulation.</p>` : `<h3>Mean-field overlay</h3><p>This model family uses a specialized stochastic engine. A closed deterministic approximation is either model-specific or not shown in this browser workbench.</p>`;
}
function updateExportPreview() {
  const payload = { preset: currentPreset?.id, engine: currentPreset?.engine, model: currentModel, settings: currentSettings, summary: lastResult?.metrics || null };
  $('exportPreview').value = JSON.stringify(payload, null, 2);
}
function resultToCsv() {
  if (!lastResult) return '';
  if (lastResult.paths && lastResult.x) {
    const header = ['time', ...lastResult.paths.map((_, i) => 'run_' + (i + 1))];
    const rows = lastResult.x.map((t, i) => [t, ...lastResult.paths.map(p => p[i])]);
    return [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
  }
  return 'metric,value\n' + Object.entries(lastResult.metrics || {}).map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`).join('\n');
}
function pythonStarter() {
  return `# Stochastic Lab export starter\n# Model: ${currentPreset.title}\n# Engine: ${currentPreset.engine}\n\nmodel = ${JSON.stringify(currentModel, null, 2)}\nsettings = ${JSON.stringify(currentSettings, null, 2)}\n\n# For CTMC models, implement Gillespie SSA:\n# 1. evaluate propensities from current state\n# 2. sample tau = -log(U) / total_propensity\n# 3. choose event proportional to propensity\n# 4. apply integer state update\n# 5. repeat until t_end or absorbing state\n`;
}
function bindEvents() {
  $('applyJson').addEventListener('click', applyJson);
  $('resetModel').addEventListener('click', () => loadPreset(currentPreset.id, false));
  $('runModel').addEventListener('click', runCurrent);
  ['runsInput','seedInput','tEndInput','gridInput','maxEventsInput','plotVariable','meanFieldToggle'].forEach(id => $(id).addEventListener('change', () => { readSettings(); updateExportPreview(); maybeAutoRun(); }));
  $('copySummary').addEventListener('click', () => navigator.clipboard?.writeText(JSON.stringify(lastResult?.metrics || {}, null, 2)));
  $('downloadModel').addEventListener('click', () => downloadText(`${currentPreset.id}-model.json`, JSON.stringify({ engine: currentPreset.engine, model: currentModel, settings: currentSettings }, null, 2), 'application/json'));
  $('downloadCsv').addEventListener('click', () => downloadText(`${currentPreset.id}-trajectories.csv`, resultToCsv(), 'text/csv'));
  $('downloadSummary').addEventListener('click', () => downloadText(`${currentPreset.id}-summary.json`, JSON.stringify(lastResult?.metrics || {}, null, 2), 'application/json'));
  $('copyPython').addEventListener('click', () => { $('exportPreview').value = pythonStarter(); navigator.clipboard?.writeText(pythonStarter()); });
}
function boot() {
  initTheme(); initTabs(); initLibrary(); bindEvents();
  const alias = {gillespie:'birth-death', galton:'galton', wright:'wright-fisher', ratchet:'ratchet'}; const rawHash = location.hash.replace('#', ''); const hash = alias[rawHash] || rawHash; loadPreset(PRESETS.some(p => p.id === hash) ? hash : 'birth-death', false);
}
document.addEventListener('DOMContentLoaded', boot);
