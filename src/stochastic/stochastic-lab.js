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

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function isIdentifier(name) { return /^[A-Za-z_]\w*$/.test(String(name || '')); }
function customPreset(engine = 'ctmc', title = 'Custom stochastic model') {
  return {
    id: 'custom-ctmc',
    family: 'Custom model',
    engine,
    title,
    tags: ['editable', engine, 'user model'],
    concept: 'A user-defined stochastic model built from states, parameters, random events, propensities, and state updates.',
    compare: [
      'The deterministic reading follows the mean-field drift induced by the transition rules.',
      'The stochastic reading simulates finite random event histories and exposes distributions, extinction, and path variability.'
    ],
    insight: 'This model is user-defined. Validate the biological or physical meaning of every propensity before interpreting the output.'
  };
}
function blankCTMCModel() {
  return {
    params: { birth: 0.35, death: 0.25 },
    states: [{ name: 'X', initial: 40 }],
    events: [
      { name: 'birth', propensity: 'birth * X', updates: { X: 1 } },
      { name: 'death', propensity: 'death * X', updates: { X: -1 } }
    ],
    derived: {}
  };
}
function normalizeFullSchema(raw) {
  const parsed = raw || {};
  if (parsed.model) {
    return {
      engine: parsed.engine || currentPreset?.engine || 'ctmc',
      title: parsed.title || parsed.name || currentPreset?.title || 'Custom stochastic model',
      family: parsed.family || 'Custom model',
      model: parsed.model
    };
  }
  return {
    engine: parsed.engine || currentPreset?.engine || 'ctmc',
    title: parsed.title || parsed.name || 'Custom stochastic model',
    family: parsed.family || 'Custom model',
    model: parsed.states || parsed.events || parsed.params ? parsed : (parsed.model || blankCTMCModel())
  };
}
function extractSymbols(expr) {
  const symbols = new Set();
  const src = String(expr || '0');
  if (window.math?.parse) {
    try {
      const node = math.parse(src);
      node.traverse(n => { if (n.isSymbolNode) symbols.add(n.name); });
      return [...symbols];
    } catch {
      // syntax errors are handled by compileExpr; fall back only for symbol hints
    }
  }
  for (const m of src.matchAll(/\b([A-Za-z_]\w*)\b/g)) symbols.add(m[1]);
  return [...symbols];
}
function knownExpressionNames(model) {
  return new Set([
    ...(model?.states || []).map(s => s.name),
    ...Object.keys(model?.params || {}),
    ...Object.keys(model?.derived || {}),
    't', 'Math', 'e', 'E', 'pi', 'PI', 'Infinity',
    'min', 'max', 'abs', 'sqrt', 'exp', 'log', 'sin', 'cos', 'tan', 'pow', 'floor', 'ceil', 'round'
  ]);
}
function validateExpressionSymbols(expr, known, label, errors) {
  extractSymbols(expr).forEach(sym => {
    if (!known.has(sym)) errors.push(`${label} references unknown name "${sym}".`);
  });
}
function validateCTMCModel(model) {
  const errors = [];
  const warnings = [];
  if (!model || typeof model !== 'object') errors.push('Model must be an object.');
  if (!Array.isArray(model?.states) || !model.states.length) errors.push('CTMC model needs at least one state.');
  if (!Array.isArray(model?.events) || !model.events.length) errors.push('CTMC model needs at least one event.');
  const names = new Set();
  (model?.states || []).forEach((st, i) => {
    if (!isIdentifier(st.name)) errors.push(`State ${i + 1} has an invalid name. Use letters, numbers, and underscores; do not start with a number.`);
    if (names.has(st.name)) errors.push(`Duplicate state name: ${st.name}.`);
    names.add(st.name);
    if (!Number.isFinite(Number(st.initial))) errors.push(`Initial value for state ${st.name || i + 1} is not numeric.`);
  });
  Object.keys(model?.params || {}).forEach(k => {
    if (!isIdentifier(k)) errors.push(`Parameter name ${k} is not a valid identifier.`);
    if (names.has(k)) warnings.push(`Parameter ${k} has the same name as a state; state values take precedence in expressions.`);
    if (!Number.isFinite(Number(model.params[k]))) errors.push(`Parameter ${k} is not numeric.`);
  });
  const known = knownExpressionNames(model);
  (model?.events || []).forEach((ev, i) => {
    const label = `Event ${ev.name || i + 1}`;
    if (!ev.name) errors.push(`Event ${i + 1} has no name.`);
    if (!ev.propensity) errors.push(`${label} has no propensity.`);
    try { compileExpr(ev.propensity || '0'); } catch (err) { errors.push(`${label} has invalid propensity syntax: ${err.message}`); }
    validateExpressionSymbols(ev.propensity || '0', known, `${label} propensity`, errors);
    const updates = ev.updates || {};
    if (!Object.keys(updates).length) warnings.push(`${label} has no state update.`);
    Object.entries(updates).forEach(([state, delta]) => {
      if (!names.has(state)) errors.push(`${label} updates unknown state ${state}.`);
      if (!Number.isFinite(Number(delta))) errors.push(`${label} update for ${state} is not numeric.`);
    });
  });
  Object.entries(model?.derived || {}).forEach(([k, expr]) => {
    if (!isIdentifier(k)) errors.push(`Derived variable ${k} is not a valid identifier.`);
    try { compileExpr(expr || '0'); } catch (err) { errors.push(`Derived variable ${k} has invalid expression syntax: ${err.message}`); }
    validateExpressionSymbols(expr || '0', known, `Derived variable ${k}`, errors);
  });
  return { ok: !errors.length, errors, warnings };
}
function validateCurrentModel() {
  if (currentPreset?.engine === 'ctmc') return validateCTMCModel(currentModel);
  return { ok: true, errors: [], warnings: [] };
}
function showValidation(prefix = 'Model ready.') {
  const status = $('validationStatus');
  const v = validateCurrentModel();
  status.classList.toggle('bad', !v.ok);
  if (!v.ok) status.textContent = 'Invalid model: ' + v.errors.join(' ');
  else if (v.warnings.length) status.textContent = `${prefix} Warning: ${v.warnings.join(' ')}`;
  else status.textContent = prefix;
  return v;
}
function plotLayout(title, xaxis, yaxis) { return { title: { text: title, font: { size: 14 } }, margin: { l: 52, r: 22, t: 44, b: 46 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'Inter, system-ui, sans-serif' }, xaxis: { title: xaxis, zeroline: false }, yaxis: { title: yaxis, zeroline: false }, legend: { orientation: 'h', y: -0.24 } }; }
function renderPlot(id, traces, title, xaxis, yaxis) { const el=$(id); if (!el) return; if (!window.Plotly){ el.innerHTML='<div class="diagnostics empty">Plotly is not loaded.</div>'; return; } if(!traces || !traces.length){ el.innerHTML='<div class="diagnostics empty">No data available for this plot.</div>'; return; } try{ if(el.querySelector('.diagnostics')) el.innerHTML=''; Plotly.purge(el); Plotly.react(el, traces, plotLayout(title, xaxis, yaxis), { responsive: true, displaylogo: false }).then(()=>{ el.classList.add('plot-ready'); try{ Plotly.Plots.resize(el); }catch{} }).catch(err=>{ el.innerHTML='<div class="diagnostics empty">Plot error: '+escapeHtml(err.message||err)+'</div>'; }); }catch(err){ el.innerHTML='<div class="diagnostics empty">Plot error: '+escapeHtml(err.message||err)+'</div>'; } }
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
    insight: 'This reduced model is a browser-scale lab-scale version of the thesis progression from CFSE data to stochastic master-equation thinking.',
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
    model: { params: { X0: 1, mu: 0.04, sigma: 0.35 } }, settings: { tEnd: 20, runs: 1000, plotVariable: 'X' }
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
    insight: 'Noise is not always damage. The plotted quality score is a pedagogical threshold-crossing precision proxy, not a full spectral SNR estimate.',
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
let jsonDirty = false;
const CORE_STOCH = ['birth-death', 'sir', 'gene-expression', 'michaelis-menten-ssa'];

function initTheme() {
  const saved = localStorage.getItem('chilperic-theme') || 'aurora';
  document.documentElement.dataset.theme = saved;
  if ($('themeBtn')) $('themeBtn').value = saved;
  $('themeBtn')?.addEventListener('change', e => { document.documentElement.dataset.theme = e.target.value; localStorage.setItem('chilperic-theme', e.target.value); });
}
function initTabs() {
  document.querySelectorAll('.stoch2-tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  document.querySelectorAll('#resultTabs .tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#resultTabs .tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === btn.dataset.panel));
    setTimeout(() => ['leftPlot','rightPlot'].forEach(id => { try { Plotly.Plots.resize(id); } catch {} }), 50);
  }));
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
  const core = CORE_STOCH.map(id => PRESETS.find(p => p.id === id)).filter(Boolean);
  const additional = PRESETS.filter(p => !CORE_STOCH.includes(p.id) && (filter === 'all' || p.family === filter));
  const button = p => `
    <button class="stoch2-model-button ${currentPreset?.id === p.id ? 'active' : ''}" data-id="${p.id}" type="button">
      <b>${p.title}</b><span>${CORE_STOCH.includes(p.id) ? 'editable event model' : p.family}</span>
    </button>`;
  $('modelLibrary').innerHTML = `
    <div class="stoch2-library-section">
      <div class="small-title">Core templates</div>
      <div class="stoch2-core-deck">${core.map(button).join('')}<button class="stoch2-model-button stoch2-custom-chip ${currentPreset?.id === 'custom-ctmc' ? 'active' : ''}" data-custom="ctmc" type="button"><b>Blank CTMC model</b><span>editable event model</span></button></div>
    </div>
    <details class="stoch2-additional-models">
      <summary>Additional stochastic examples</summary>
      <div class="stoch2-model-list">${additional.map(button).join('') || '<p class="note">No additional examples match this filter.</p>'}</div>
    </details>`;
  document.querySelectorAll('.stoch2-model-button[data-id]').forEach(btn => btn.addEventListener('click', () => loadPreset(btn.dataset.id, true)));
  document.querySelectorAll('.stoch2-model-button[data-custom]').forEach(btn => btn.addEventListener('click', () => loadCustomCTMC(null, 'Blank CTMC model', true)));
}
function loadPreset(id, updateHash = false) {
  currentPreset = PRESETS.find(p => p.id === id) || PRESETS[0];
  currentModel = clone(currentPreset.model);
  jsonDirty = false;
  currentSettings = { runs: currentPreset.settings?.runs || 200, seed: 12345, tEnd: currentPreset.settings?.tEnd || currentModel.params?.tEnd || 100, grid: 241, maxEvents: 50000, plotVariable: currentPreset.settings?.plotVariable || firstVariable(currentModel), showMeanField: true };
  if (updateHash) history.replaceState(null, '', `?example=${encodeURIComponent(currentPreset.id)}`);
  renderLibrary();
  renderAll();
  runCurrent();
}
function hasUnsavedCustomWork() {
  if (currentPreset?.id !== 'custom-ctmc') return false;
  try { return JSON.stringify(currentModel) !== JSON.stringify(blankCTMCModel()); } catch { return true; }
}
function saveLastCustomModel() {
  if (currentPreset?.id !== 'custom-ctmc') return;
  try { localStorage.setItem('chilperic-stochastic-last-custom', JSON.stringify({ model: currentModel, settings: currentSettings })); } catch {}
}
function loadCustomCTMC(model = null, title = 'Blank CTMC model', updateHash = true, options = {}) {
  if (!options.skipConfirm && !model && hasUnsavedCustomWork()) {
    saveLastCustomModel();
    if (!confirm('Replace your current custom model with a new blank model? The current model was saved locally as the last custom model, but export JSON if you need a durable copy.')) return;
  }
  currentPreset = customPreset('ctmc', title);
  currentModel = clone(model || blankCTMCModel());
  jsonDirty = false;
  currentSettings = { runs: 200, seed: 12345, tEnd: 100, grid: 241, maxEvents: 50000, plotVariable: firstVariable(currentModel), showMeanField: true };
  if (updateHash) history.replaceState(null, '', '?example=custom-ctmc');
  renderLibrary();
  renderAll();
  showValidation(model ? 'Editable CTMC copy ready.' : 'Blank CTMC model ready.');
  runCurrent();
}
function customizeCurrentCTMC() {
  if (currentPreset?.engine !== 'ctmc') return;
  loadCustomCTMC(clone(currentModel), `Custom copy of ${currentPreset.title}`, true, { skipConfirm: true });
}
function restoreLastCustomModel() {
  try {
    const saved = JSON.parse(localStorage.getItem('chilperic-stochastic-last-custom') || 'null');
    if (saved?.model) {
      loadCustomCTMC(saved.model, 'Restored blank CTMC model', true, { skipConfirm: true });
      if (saved.settings) currentSettings = { ...currentSettings, ...saved.settings, plotVariable: firstVariable(saved.model) };
      renderAll();
    }
  } catch (err) { showValidation('No restorable custom model found.'); }
}
function firstVariable(model) { const derived = Object.keys(model?.derived || {}); return derived[0] || model?.states?.[0]?.name || 'X'; }
function modelVariables(model) { return [...(model.states || []).map(s => s.name), ...Object.keys(model.derived || {})]; }
function renderAll() {
  $('modelFamily').textContent = currentPreset.family;
  $('modelTitle').textContent = currentPreset.title;
  $('modelConcept').textContent = currentPreset.concept;
  $('modelBadges').innerHTML = '';
  $('modelBadges').classList.add('hidden');
  $('compareBox').innerHTML = `<div><b>Deterministic reading</b><p>${currentPreset.compare[0]}</p></div><div><b>Stochastic reading</b><p>${currentPreset.compare[1]}</p></div>`;
  renderParameterEditor();
  renderStructuredEditor();
  renderJsonEditor();
  renderSettings();
  renderGuide();
  showValidation('Schema ready.');
  updateExportPreview();
}
function renderParameterEditor() {
  const params = currentModel.params || {};
  $('parameterEditor').innerHTML = Object.keys(params).map(k => `<label><span>${escapeHtml(k)}</span><input data-param="${escapeHtml(k)}" type="number" step="any" value="${escapeHtml(params[k])}"></label>`).join('') || '<p class="note">No numeric parameters for this model.</p>';
  document.querySelectorAll('[data-param]').forEach(input => input.addEventListener('change', () => { currentModel.params[input.dataset.param] = Number(input.value); syncAfterEdit(); }));
}
function renderStructuredEditor() {
  const box = $('structuredEditor');
  if (currentPreset.engine === 'ctmc') {
    const states = currentModel.states || [];
    const params = currentModel.params || {};
    const events = currentModel.events || [];
    const derived = currentModel.derived || {};
    box.innerHTML = `
      <div class="editor-toolbar">
        <button id="addState" class="ghost" type="button">＋ State</button>
        <button id="addParam" class="ghost" type="button">＋ Parameter</button>
        <button id="addEvent" class="ghost" type="button">＋ Event</button>
        <button id="addDerived" class="ghost" type="button">＋ Derived variable</button>
      </div>
      <div class="small-title">States and initial values</div>
      <div class="stoch2-table stoch2-table-actions">
        <div class="stoch2-tr head"><span>state</span><span>initial</span><span></span></div>
        ${states.map((st,i)=>`<div class="stoch2-tr"><input data-state-name="${i}" value="${escapeHtml(st.name)}"><input data-state-init="${i}" type="number" step="any" value="${escapeHtml(st.initial)}"><button class="mini-danger" data-remove-state="${i}" type="button">Remove</button></div>`).join('')}
      </div>
      <div class="small-title">Parameters</div>
      <div class="stoch2-table stoch2-table-actions">
        <div class="stoch2-tr head"><span>parameter</span><span>value</span><span></span></div>
        ${Object.entries(params).map(([k,v],i)=>`<div class="stoch2-tr"><input data-param-name="${i}" value="${escapeHtml(k)}"><input data-param-value="${escapeHtml(k)}" type="number" step="any" value="${escapeHtml(v)}"><button class="mini-danger" data-remove-param="${escapeHtml(k)}" type="button">Remove</button></div>`).join('')}
      </div>
      <div class="small-title">Events / reactions</div>
      <div class="stoch2-event-list">
        ${events.map((ev,i)=>`<details class="event-row" open><summary>${escapeHtml(ev.name || 'event ' + (i + 1))}</summary><label><span>name</span><input data-event-name="${i}" value="${escapeHtml(ev.name)}"></label><label><span>propensity</span><input data-event-prop="${i}" value="${escapeHtml(ev.propensity)}" placeholder="e.g. beta*S*I/N"></label><div class="delta-editor"><span>state updates</span><div>${states.map(st=>`<label><b>${escapeHtml(st.name)}</b><input data-event-delta="${i}" data-update-state="${escapeHtml(st.name)}" type="number" step="1" value="${escapeHtml((ev.updates || {})[st.name] || 0)}"></label>`).join('')}</div></div><button class="mini-danger" data-remove-event="${i}" type="button">Remove event</button></details>`).join('')}
      </div>
      <div class="small-title">Reaction preview</div>
      <div id="reactionPreview" class="reaction-preview"></div>
      <div class="small-title">Derived variables for plotting</div>
      <div class="stoch2-table stoch2-table-actions">
        <div class="stoch2-tr head"><span>name</span><span>expression</span><span></span></div>
        ${Object.entries(derived).map(([k,v],i)=>`<div class="stoch2-tr"><input data-derived-name="${i}" value="${escapeHtml(k)}"><input data-derived-expr="${escapeHtml(k)}" value="${escapeHtml(v)}"><button class="mini-danger" data-remove-derived="${escapeHtml(k)}" type="button">Remove</button></div>`).join('')}
      </div>`;
    $('addState')?.addEventListener('click', addState);
    $('addParam')?.addEventListener('click', addParam);
    $('addEvent')?.addEventListener('click', addEvent);
    $('addDerived')?.addEventListener('click', addDerived);
    renderReactionPreview();
  } else {
    box.innerHTML = '<p class="note">This family uses a specialized simulator. Edit parameters above, run, and inspect the fixed plot workspace. Use a CTMC template when you need editable state/event rules.</p>';
  }
  box.querySelectorAll('input').forEach(inp => inp.addEventListener('change', structuredChanged));
  box.querySelectorAll('[data-event-prop]').forEach(inp => inp.addEventListener('input', e => {
    const i = Number(e.target.dataset.eventProp);
    currentModel.events[i].propensity = e.target.value.trim();
    renderReactionPreview();
    showValidation('Editing propensity.');
    updateExportPreview();
  }));
  box.querySelectorAll('[data-remove-state]').forEach(btn => btn.addEventListener('click', () => removeState(Number(btn.dataset.removeState))));
  box.querySelectorAll('[data-remove-param]').forEach(btn => btn.addEventListener('click', () => removeParam(btn.dataset.removeParam)));
  box.querySelectorAll('[data-remove-event]').forEach(btn => btn.addEventListener('click', () => removeEvent(Number(btn.dataset.removeEvent))));
  box.querySelectorAll('[data-remove-derived]').forEach(btn => btn.addEventListener('click', () => removeDerived(btn.dataset.removeDerived)));
}
function uniqueName(base, used) { let name = base, i = 1; while (used.has(name)) name = `${base}${i++}`; return name; }
function addState() {
  currentModel.states ||= [];
  const name = uniqueName('X', new Set(currentModel.states.map(s => s.name)));
  currentModel.states.push({ name, initial: 0 });
  syncAfterStructuralEdit('State added.');
}
function addParam() {
  currentModel.params ||= {};
  const name = uniqueName('k', new Set(Object.keys(currentModel.params)));
  currentModel.params[name] = 1;
  syncAfterStructuralEdit('Parameter added.');
}
function addEvent() {
  currentModel.events ||= [];
  const first = currentModel.states?.[0]?.name || 'X';
  currentModel.events.push({ name: uniqueName('event', new Set(currentModel.events.map(e => e.name))), propensity: '1', updates: { [first]: 1 } });
  syncAfterStructuralEdit('Event added.');
}
function addDerived() {
  currentModel.derived ||= {};
  const first = currentModel.states?.[0]?.name || 'X';
  const name = uniqueName('total', new Set(Object.keys(currentModel.derived)));
  currentModel.derived[name] = first;
  syncAfterStructuralEdit('Derived variable added.');
}
function removeState(i) {
  if ((currentModel.states || []).length <= 1) { showValidation('Keep at least one state.'); return; }
  const [removed] = currentModel.states.splice(i, 1);
  if (removed) {
    (currentModel.events || []).forEach(ev => { if (ev.updates) delete ev.updates[removed.name]; });
    if (currentModel.derived) delete currentModel.derived[removed.name];
  }
  syncAfterStructuralEdit('State removed.');
}
function removeParam(k) { if (currentModel.params) delete currentModel.params[k]; syncAfterStructuralEdit('Parameter removed.'); }
function removeEvent(i) { currentModel.events?.splice(i, 1); syncAfterStructuralEdit('Event removed.'); }
function removeDerived(k) { if (currentModel.derived) delete currentModel.derived[k]; syncAfterStructuralEdit('Derived variable removed.'); }
function renameObjectKey(obj, oldKey, newKey) {
  if (!obj || oldKey === newKey) return;
  const next = {};
  Object.keys(obj).forEach(k => { next[k === oldKey ? newKey : k] = obj[k]; });
  Object.keys(obj).forEach(k => delete obj[k]);
  Object.assign(obj, next);
}
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function replaceSymbol(expr, oldName, newName) {
  if (!expr || !oldName || !newName || oldName === newName) return expr;
  return String(expr).replace(new RegExp(`\\b${escapeRegExp(oldName)}\\b`, 'g'), newName);
}
function eventUpdateText(ev, states) {
  const updates = ev.updates || {};
  const terms = states.map(st => {
    const d = Number(updates[st.name] || 0);
    if (!d) return st.name;
    return `${st.name}${d > 0 ? ' + ' + d : ' − ' + Math.abs(d)}`;
  });
  return terms.join(', ');
}
function renderReactionPreview() {
  const target = $('reactionPreview');
  if (!target || currentPreset?.engine !== 'ctmc') return;
  const states = currentModel.states || [];
  const lines = (currentModel.events || []).map(ev => {
    const changed = Object.keys(ev.updates || {}).length ? eventUpdateText(ev, states) : 'no state change';
    return `<div><b>${escapeHtml(ev.name || 'event')}</b>: <code>${escapeHtml(states.map(s => s.name).join(', ') || 'state')}</code> → <code>${escapeHtml(changed)}</code> at rate <code>${escapeHtml(ev.propensity || '0')}</code></div>`;
  }).join('');
  target.innerHTML = lines || '<p class="note">No events yet.</p>';
}
function structuredChanged(e) {
  const t = e.target;
  if (t.dataset.stateName !== undefined) {
    const i = Number(t.dataset.stateName); const old = currentModel.states[i].name; const next = t.value.trim();
    currentModel.states[i].name = next;
    (currentModel.events || []).forEach(ev => {
      renameObjectKey(ev.updates, old, next);
      ev.propensity = replaceSymbol(ev.propensity, old, next);
    });
    if (currentModel.derived) Object.keys(currentModel.derived).forEach(k => { currentModel.derived[k] = replaceSymbol(currentModel.derived[k], old, next); });
    if (currentSettings?.plotVariable === old) currentSettings.plotVariable = next;
  }
  if (t.dataset.stateInit !== undefined) currentModel.states[Number(t.dataset.stateInit)].initial = Number(t.value);
  if (t.dataset.paramName !== undefined) {
    const old = Object.keys(currentModel.params || {})[Number(t.dataset.paramName)]; const next = t.value.trim();
    if (old && next && old !== next) {
      currentModel.params[next] = currentModel.params[old]; delete currentModel.params[old];
      (currentModel.events || []).forEach(ev => { ev.propensity = replaceSymbol(ev.propensity, old, next); });
      if (currentModel.derived) Object.keys(currentModel.derived).forEach(k => { currentModel.derived[k] = replaceSymbol(currentModel.derived[k], old, next); });
    }
  }
  if (t.dataset.paramValue !== undefined) currentModel.params[t.dataset.paramValue] = Number(t.value);
  if (t.dataset.eventName !== undefined) currentModel.events[Number(t.dataset.eventName)].name = t.value.trim();
  if (t.dataset.eventProp !== undefined) currentModel.events[Number(t.dataset.eventProp)].propensity = t.value.trim();
  if (t.dataset.eventDelta !== undefined) {
    const i = Number(t.dataset.eventDelta);
    const state = t.dataset.updateState;
    currentModel.events[i].updates ||= {};
    const delta = Number(t.value);
    if (Number.isFinite(delta) && delta !== 0) currentModel.events[i].updates[state] = delta;
    else delete currentModel.events[i].updates[state];
  }
  if (t.dataset.derivedName !== undefined) {
    const old = Object.keys(currentModel.derived || {})[Number(t.dataset.derivedName)]; const next = t.value.trim();
    if (old && next && old !== next) { currentModel.derived[next] = currentModel.derived[old]; delete currentModel.derived[old]; if (currentSettings?.plotVariable === old) currentSettings.plotVariable = next; }
  }
  if (t.dataset.derivedExpr !== undefined) currentModel.derived[t.dataset.derivedExpr] = t.value.trim();
  syncAfterStructuralEdit('Model updated.');
}
function syncAfterStructuralEdit(message = 'Model updated.') {
  saveLastCustomModel();
  renderParameterEditor(); renderStructuredEditor(); renderJsonEditor(); populatePlotVariable(); showValidation(message); updateExportPreview(); maybeAutoRun();
}
function renderJsonEditor(force = false) {
  const editor = $('jsonEditor');
  if (!force && jsonDirty) {
    $('validationStatus').textContent = 'JSON has unsaved changes — click Apply JSON before editing other fields.';
    $('validationStatus').classList.add('bad');
    return;
  }
  editor.value = JSON.stringify({ engine: currentPreset.engine, model: currentModel }, null, 2);
  jsonDirty = false;
}
function applyJson() {
  try {
    const parsed = normalizeFullSchema(JSON.parse($('jsonEditor').value));
    currentPreset = customPreset(parsed.engine, parsed.title || 'Custom stochastic model');
    currentPreset.family = parsed.family || 'Custom model';
    currentModel = parsed.model;
    currentSettings = { ...(currentSettings || {}), runs: currentSettings?.runs || 200, seed: currentSettings?.seed || 12345, tEnd: currentSettings?.tEnd || currentModel.params?.tEnd || 100, grid: currentSettings?.grid || 241, maxEvents: currentSettings?.maxEvents || 50000, plotVariable: firstVariable(currentModel), showMeanField: true };
    jsonDirty = false; renderLibrary(); renderAll(); renderJsonEditor(true); showValidation('JSON applied.'); maybeAutoRun();
  } catch (err) { $('validationStatus').textContent = 'Invalid JSON: ' + err.message; $('validationStatus').classList.add('bad'); }
}
function syncAfterEdit() { saveLastCustomModel(); renderJsonEditor(); populatePlotVariable(); showValidation('Model updated.'); updateExportPreview(); maybeAutoRun(); }
function renderSettings() {
  $('runsInput').value = currentSettings.runs;
  $('seedInput').value = currentSettings.seed;
  $('tEndInput').value = currentSettings.tEnd;
  $('gridInput').value = currentSettings.grid;
  $('maxEventsInput').value = currentSettings.maxEvents;
  $('meanFieldToggle').checked = currentSettings.showMeanField && currentPreset.engine === 'ctmc';
  $('meanFieldToggle').disabled = currentPreset.engine !== 'ctmc';
  $('meanFieldToggle').closest('label')?.classList.toggle('hidden', currentPreset.engine !== 'ctmc');
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
  currentSettings.showMeanField = currentPreset.engine === 'ctmc' && $('meanFieldToggle').checked;
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
  const source = String(expr || '0').replace(/\bMath\./g, '');
  let compiled;
  if (window.math?.parse) compiled = math.parse(source).compile();
  else throw new Error('Math.js is required for expression evaluation.');
  return ctx => {
    const scope = { ...ctx, E: Math.E, PI: Math.PI, pi: Math.PI, e: Math.E };
    const value = compiled.evaluate(scope);
    const n = Number(value);
    return Math.max(0, Number.isFinite(n) ? n : 0);
  };
}
function evalAnyExpr(expr, ctx) {
  const source = String(expr || '0').replace(/\bMath\./g, '');
  if (!window.math?.parse) return 0;
  const value = math.parse(source).compile().evaluate({ ...ctx, E: Math.E, PI: Math.PI, pi: Math.PI, e: Math.E });
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function stateObjectFrom(states) { const s = {}; states.forEach(v => { s[v.name] = Number(v.initial) || 0; }); return s; }
function valueOfVar(state, model, variable) {
  if (state[variable] !== undefined) return state[variable];
  if (model.derived?.[variable]) { try { return evalAnyExpr(model.derived[variable], { ...state, ...(model.params || {}) }); } catch { return 0; } }
  return 0;
}

function eventIsEnabled(ev, st) {
  for (const [k, delta] of Object.entries(ev.updates || {})) {
    if ((Number(st[k]) || 0) + Number(delta) < -1e-12) return false;
  }
  return true;
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
    const props = events.map(e => eventIsEnabled(e, st) ? e.fn(ctx) : 0);
    const a0 = sum(props);
    if (!(a0 > 0)) break;
    t += -Math.log(Math.max(rng(), 1e-12)) / a0;
    if (t > settings.tEnd) break;
    let u = rng() * a0, chosen = 0;
    for (let i = 0; i < props.length; i++) { u -= props[i]; if (u <= 0) { chosen = i; break; } }
    const ev = events[chosen];
    if (!eventIsEnabled(ev, st)) continue;
    for (const [k, delta] of Object.entries(ev.updates || {})) {
      const next = (Number(st[k]) || 0) + Number(delta);
      st[k] = Math.abs(next) < 1e-12 ? 0 : next;
    }
    eventCounts[ev.name] += 1; steps += 1; fillUntil(t);
  }
  fillUntil(settings.tEnd + 1e-9);
  return { x: tGrid, y, finalState: st, final: y[y.length - 1], events: eventCounts, steps, truncated: steps >= settings.maxEvents };
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
  return { engine: 'ctmc', x: ens.x, paths: ens.paths, finals: ens.finals, meanField: mf, eventMean, metrics: { runs: ens.paths.length, 'mean final': mean(ens.finals), 'variance final': variance(ens.finals), 'P(final=0)': extinction, 'mean events': mean(ens.extra.map(e => e.steps)), 'paths at maxEvents': ens.extra.filter(e => e.truncated).length }, tracesA: traces, tracesB: [{ type: 'bar', x: h.x, y: h.y, name: 'final distribution' }], titleA: `${settings.plotVariable}: stochastic paths and mean`, titleB: `Final ${settings.plotVariable} distribution`, xA: 'time', yA: settings.plotVariable, xB: `final ${settings.plotVariable}`, yB: 'runs' };
}

function runBranching(model, settings) {
  const p = model.params, runs = settings.runs, generations = Math.floor(p.generations), rngSeed = settings.seed; const x = Array.from({ length: generations + 1 }, (_, i) => i), paths = [], finals = [], extinctGen = [];
  for (let r = 0; r < runs; r++) { const rng = mulberry32(rngSeed + r * 17); let z = Math.floor(p.z0); const y = [z]; let extinct = z <= 0 ? 0 : null; for (let g = 1; g <= generations; g++) { let nz = 0; for (let i = 0; i < z && nz < 1e6; i++) nz += poisson(p.lambda, rng); z = nz; if (z === 0 && extinct === null) extinct = g; y.push(z); } paths.push(y); finals.push(z); extinctGen.push(extinct ?? generations); }
  const meanPath = x.map((_, i) => mean(paths.map(y => y[i]))); const h = hist(finals); return { metrics: { runs, 'P(extinction)': finals.filter(v => v === 0).length / runs, 'mean final population': mean(finals), 'median final population': quantile(finals, .5), 'mean extinction generation': mean(extinctGen) }, tracesA: [...paths.slice(0, 16).map((y,i)=>traceLine('tree '+(i+1), x, y, {opacity:.35, line:{width:1}})), traceLine('mean', x, meanPath, {line:{width:3}}), traceLine('deterministic m^n', x, x.map(g => p.z0 * p.lambda ** g), {line:{dash:'dash', width:3}})], tracesB: [{ type: 'bar', x: h.x, y: h.y, name: 'final population' }], titleA: 'Population over generations', titleB: 'Final population distribution', xA: 'generation', yA: 'population', xB: 'final population', yB: 'runs' };
}
function runGambler(model, settings) { const p = model.params, runs = settings.runs, paths=[], finals=[], times=[], success=[]; const maxSteps = Math.floor(p.maxSteps), x=Array.from({length:maxSteps+1},(_,i)=>i); for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*31);let c=p.capital,y=[c],t=0;while(t<maxSteps&&c>0&&c<p.target){c += rng()<p.pwin?1:-1;t++;y.push(c);} while(y.length<x.length)y.push(c);paths.push(y);finals.push(c);times.push(t);success.push(c>=p.target?1:0);} const h=hist(times); return {metrics:{runs,'P(ruin)':finals.filter(v=>v<=0).length/runs,'P(success)':mean(success),'mean hitting time':mean(times),'mean final capital':mean(finals)}, tracesA:paths.slice(0,18).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.45,line:{width:1}})), tracesB:[{type:'bar',x:h.x,y:h.y,name:'hitting time'}], titleA:'Capital paths', titleB:'Hitting-time distribution', xA:'step', yA:'capital', xB:'steps', yB:'runs'}; }
function runEhrenfest(model, settings){const p=model.params,runs=settings.runs,steps=Math.floor(p.steps),x=Array.from({length:steps+1},(_,i)=>i),paths=[],finals=[];for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*43);let a=Math.floor(p.initialA),y=[a];for(let t=0;t<steps;t++){ if(rng()<a/p.balls)a--;else a++; y.push(a);} paths.push(y); finals.push(a);} const meanPath=x.map((_,i)=>mean(paths.map(y=>y[i]))), h=hist(finals,30); return {metrics:{runs,'mean final urn A':mean(finals),'variance final':variance(finals),'equilibrium A':p.balls/2}, tracesA:[...paths.slice(0,12).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.35,line:{width:1}})),traceLine('mean',x,meanPath,{line:{width:3}}),traceLine('equilibrium',x,x.map(()=>p.balls/2),{line:{dash:'dash'}})], tracesB:[{type:'bar',x:h.x,y:h.y,name:'final A'}], titleA:'Urn A over time', titleB:'Final urn-A distribution', xA:'step', yA:'balls in A', xB:'balls in A', yB:'runs'};}
function runWrightFisher(model, settings){const p=model.params,runs=settings.runs,g=Math.floor(p.generations),x=Array.from({length:g+1},(_,i)=>i),paths=[],finals=[],absTimes=[];for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*53);let freq=p.p0,y=[freq],abs=null;for(let i=1;i<=g;i++){let w=freq*(1+p.selection);let pp=w/(w+1-freq);let copies=binom(2*p.N,pp,rng);freq=copies/(2*p.N); if(abs===null && (freq===0||freq===1))abs=i;y.push(freq);}paths.push(y);finals.push(freq);absTimes.push(abs??g);} const meanPath=x.map((_,i)=>mean(paths.map(y=>y[i]))), h=hist(finals,25);return {metrics:{runs,'P(fixation)':finals.filter(v=>v>=1).length/runs,'P(loss)':finals.filter(v=>v<=0).length/runs,'mean final frequency':mean(finals),'mean absorption time':mean(absTimes)}, tracesA:[...paths.slice(0,16).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.35,line:{width:1}})),traceLine('mean',x,meanPath,{line:{width:3}}),traceLine('neutral deterministic',x,x.map(()=>p.p0),{line:{dash:'dash'}})], tracesB:[{type:'bar',x:h.x,y:h.y,name:'final p'}],titleA:'Allele-frequency paths',titleB:'Final allele-frequency distribution',xA:'generation',yA:'allele frequency',xB:'final p',yB:'runs'};}
function runGBM(model, settings){const p=model.params,runs=settings.runs,n=settings.grid,tEnd=settings.tEnd||p.tEnd||20,dt=tEnd/(n-1),x=grid(tEnd,n),paths=[],finals=[];for(let r=0;r<runs;r++){const rng=mulberry32(settings.seed+r*61);let val=p.X0,y=[val];for(let i=1;i<n;i++){val*=Math.exp((p.mu-.5*p.sigma*p.sigma)*dt+p.sigma*Math.sqrt(dt)*randn(rng));y.push(val);}paths.push(y);finals.push(val);}const meanPath=x.map((_,i)=>mean(paths.map(y=>y[i]))), medianPath=x.map((_,i)=>quantile(paths.map(y=>y[i]),.5)), h=hist(finals);return {metrics:{runs,'mean final':mean(finals),'median final':quantile(finals,.5),'theoretical mean':p.X0*Math.exp(p.mu*tEnd),'typical growth exponent':p.mu-.5*p.sigma*p.sigma}, tracesA:[...paths.slice(0,18).map((y,i)=>traceLine('path '+(i+1),x,y,{opacity:.3,line:{width:1}})),traceLine('mean',x,meanPath,{line:{width:3}}),traceLine('median',x,medianPath,{line:{dash:'dash',width:3}})], tracesB:[{type:'bar',x:h.x,y:h.y,name:'final X'}],titleA:'GBM paths: mean vs median',titleB:'Final value distribution',xA:'time',yA:'X',xB:'final X',yB:'runs'};}
function runParrondo(model, settings){const p=model.params,runs=settings.runs,steps=Math.floor(p.steps),x=Array.from({length:steps+1},(_,i)=>i);function play(kind,rng){let c=p.capital,y=[c];for(let i=0;i<steps;i++){let pr=p.pA;if(kind==='B')pr=(c%p.M===0)?p.pBad:p.pGood;if(kind==='mix')pr=(rng()<p.mix)?p.pA:((c%p.M===0)?p.pBad:p.pGood);c+=rng()<pr?1:-1;y.push(c);}return y;}const kinds=['A','B','mix'];const traces=[],metrics={runs};kinds.forEach(kind=>{const finals=[],sample=[];for(let r=0;r<runs;r++){const y=play(kind,mulberry32(settings.seed+r*71+(kind==='B'?1000:kind==='mix'?2000:0)));if(r<4)sample.push(y);finals.push(y[y.length-1]);}metrics['mean final '+kind]=mean(finals);sample.forEach((y,i)=>traces.push(traceLine(kind+' path '+(i+1),x,y,{opacity:.45,line:{width:1}})));traces.push(traceLine(kind+' mean final line', [0,steps], [mean(finals),mean(finals)], {line:{dash:kind==='mix'?'solid':'dot'}}));});metrics['theoretical mixed drift/step']=parrondoStationaryDrift(p);return {metrics,tracesA:traces,tracesB:[{type:'bar',x:['A','B','mixed'],y:[metrics['mean final A'],metrics['mean final B'],metrics['mean final mix']],name:'mean final capital'}],titleA:'Representative capital paths',titleB:'Mean final capital by strategy',xA:'step',yA:'capital',xB:'strategy',yB:'mean final capital'};}

function parrondoStationaryDrift(p) {
  const M = Math.max(2, Math.floor(p.M || 3));
  const mix = clamp(Number(p.mix), 0, 1);
  const probs = Array.from({ length: M }, (_, r) => {
    const pB = r === 0 ? p.pBad : p.pGood;
    return mix * p.pA + (1 - mix) * pB;
  });
  let dist = Array(M).fill(1 / M);
  for (let iter = 0; iter < 1200; iter++) {
    const next = Array(M).fill(0);
    for (let r = 0; r < M; r++) {
      next[(r + 1) % M] += dist[r] * probs[r];
      next[(r - 1 + M) % M] += dist[r] * (1 - probs[r]);
    }
    dist = next;
  }
  return sum(dist.map((w, r) => w * (2 * probs[r] - 1)));
}
function runResonance(model, settings){const p=model.params,n=Math.floor(p.points),x=Array.from({length:n},(_,i)=>i/n*p.cycles*2*Math.PI),rng=mulberry32(settings.seed);const signal=x.map(t=>p.amplitude*Math.sin(t));const noisy=signal.map(s=>s+p.noise*randn(rng));const response=noisy.map(v=>v>p.threshold?1:0);const scanN=20, microRuns=40, scanPoints=Math.min(n,300);const noiseScan=Array.from({length:scanN},(_,i)=>i*0.09);const quality=noiseScan.map(no=>{let hits=0,correct=0;for(let r=0;r<microRuns;r++){const rr=mulberry32(settings.seed+r*97+Math.floor(no*1000));for(let j=0;j<scanPoints;j++){const i=Math.floor(j*(n-1)/Math.max(1,scanPoints-1));const ideal=signal[i]>.55*p.amplitude?1:0;const out=(signal[i]+no*randn(rr)>p.threshold)?1:0;hits+=out; if(out&&ideal)correct++;}}return hits?correct/hits:0;});return {metrics:{'crossing fraction':mean(response),'best scanned noise':noiseScan[quality.indexOf(Math.max(...quality))],'current noise':p.noise,'pedagogical precision score':Math.max(...quality)},tracesA:[traceLine('weak signal',x,signal),traceLine('signal + noise',x,noisy,{opacity:.55}),traceLine('threshold',x,x.map(()=>p.threshold),{line:{dash:'dash'}}),traceLine('response',x,response.map(v=>v*p.threshold),{line:{width:3}})],tracesB:[traceLine('response quality',noiseScan,quality)],titleA:'Threshold response to weak periodic signal',titleB:'Noise scan',xA:'phase/time',yA:'signal',xB:'noise amplitude',yB:'quality'};}

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
  const btn = $('runModel');
  if (btn?.disabled) return;
  readSettings();
  const validation = validateCurrentModel();
  if (!validation.ok) { showValidation('Fix the model before running.'); $('runStatus').textContent = 'Model validation failed.'; $('runProgress').style.width = '0%'; return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  $('runStatus').textContent = 'Running…'; $('runProgress').style.width = '35%';
  window.setTimeout(() => {
    try {
      const started = performance.now(); lastResult = computeResult(); lastResult.runtimeMs = performance.now() - started;
      $('runProgress').style.width = '100%'; $('runStatus').textContent = `Done in ${fmt(lastResult.runtimeMs)} ms.`; renderResult(); updateExportPreview();
    } catch (err) { $('runStatus').textContent = 'Error: ' + err.message; $('runProgress').style.width = '0%'; console.error(err); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '▶ Run ensemble'; } }
  }, 20);
}
function renderResult() {
  const m = { ...(lastResult.metrics || {}), 'runtime ms': lastResult.runtimeMs };
  $('summaryGrid').innerHTML = Object.entries(m).map(([k, v]) => `<div><span>${k}</span><b>${fmt(v)}</b></div>`).join('');
  $('insightBox').textContent = currentPreset.insight;
  if ($('topStatus')) $('topStatus').textContent = 'Done';
  if ($('runtimeValue')) $('runtimeValue').textContent = fmt(lastResult.runtimeMs) + ' ms';
  if ($('runsValue')) $('runsValue').textContent = fmt(lastResult.metrics?.runs ?? currentSettings?.runs ?? '—');
  if ($('meanFinalValue')) $('meanFinalValue').textContent = fmt(lastResult.metrics?.['mean final'] ?? lastResult.metrics?.['mean final population'] ?? lastResult.metrics?.['mean final frequency'] ?? '—');
  if ($('metricRuns')) $('metricRuns').textContent = fmt(lastResult.metrics?.runs ?? currentSettings?.runs ?? '—');
  if ($('metricRuntime')) $('metricRuntime').textContent = fmt(lastResult.runtimeMs) + ' ms';
  if ($('metricVariable')) $('metricVariable').textContent = currentSettings?.plotVariable || '—';
  if ($('metricEngine')) $('metricEngine').textContent = currentPreset?.engine || '—';
  populateStochasticPlotTypes();
  renderSelectedPlots();
  renderMeanFieldBox();
  renderStochasticWarnings();
}
function renderStochasticWarnings() {
  const box = $('stochWarningBox');
  if (!box || !lastResult) return;
  const truncated = Number(lastResult.metrics?.['paths at maxEvents'] || 0);
  const parts = [];
  if (currentPreset?.engine === 'ctmc') parts.push('CTMC events that would create negative state counts are blocked before firing, not clamped after firing.');
  if (truncated > 0) parts.push(`${truncated} path(s) reached maxEvents; increase max events or shorten the horizon before trusting tail statistics.`);
  if (lastResult.meanField) parts.push('Mean-field overlay is a deterministic large-count approximation. It can fail near extinction, low copy numbers, or strong nonlinear propensities.');
  box.textContent = parts.join(' ') || 'No stochastic warnings for this run.';
}

function populateStochasticPlotTypes() {
  const left = $('stochLeftPlotType'), right = $('stochRightPlotType');
  if (!left || !right || !lastResult) return;
  const leftVal = left.value || 'ensemble';
  const rightVal = right.value || 'diagnostic';
  const leftOpts = [
    ['ensemble', 'Ensemble paths'],
    ['mean', 'Mean trajectory'],
    ['single', 'Single path'],
    ['default', 'Model default']
  ];
  if (lastResult.meanField) leftOpts.splice(2, 0, ['mean-field', 'Mean + mean-field']);
  const rightOpts = [
    ['diagnostic', 'Distribution / diagnostic'],
    ['metrics', 'Metrics bar chart']
  ];
  left.innerHTML = leftOpts.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  right.innerHTML = rightOpts.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  left.value = leftOpts.some(o => o[0] === leftVal) ? leftVal : 'ensemble';
  right.value = rightOpts.some(o => o[0] === rightVal) ? rightVal : 'diagnostic';
}
function renderSelectedPlots() {
  if (!lastResult) return;
  const leftType = $('stochLeftPlotType')?.value || 'ensemble';
  const rightType = $('stochRightPlotType')?.value || 'diagnostic';
  const left = buildLeftPlot(leftType);
  const right = buildRightPlot(rightType);
  $('plotALabel').textContent = left.title;
  $('plotBLabel').textContent = right.title;
  renderPlot('leftPlot', left.traces, left.title, left.xLabel, left.yLabel);
  renderPlot('rightPlot', right.traces, right.title, right.xLabel, right.yLabel);
}
function buildLeftPlot(type) {
  const x = lastResult.x || [];
  const paths = lastResult.paths || [];
  if (type === 'single' && paths.length) {
    return { traces: [traceLine('run 1', x, paths[0], { line: { width: 2 } })], title: 'Single stochastic path', xLabel: lastResult.xA || '', yLabel: lastResult.yA || '' };
  }
  if (type === 'mean' && paths.length) {
    const y = x.map((_, i) => mean(paths.map(p => p[i])));
    return { traces: [traceLine('ensemble mean', x, y, { line: { width: 3 } })], title: 'Ensemble mean', xLabel: lastResult.xA || '', yLabel: lastResult.yA || '' };
  }
  if (type === 'mean-field' && paths.length && lastResult.meanField) {
    const y = x.map((_, i) => mean(paths.map(p => p[i])));
    return { traces: [traceLine('ensemble mean', x, y, { line: { width: 3 } }), traceLine('mean-field', lastResult.meanField.x, lastResult.meanField.y, { line: { dash: 'dash', width: 3 } })], title: 'Mean trajectory and mean-field', xLabel: lastResult.xA || '', yLabel: lastResult.yA || '' };
  }
  if (type === 'ensemble' && paths.length) {
    const traces = paths.slice(0, 24).map((y,i)=>traceLine('run '+(i+1), x, y, { opacity:.35, line:{width:1} }));
    const y = x.map((_, i) => mean(paths.map(p => p[i])));
    traces.push(traceLine('mean', x, y, { line: { width: 3 } }));
    if (lastResult.meanField) traces.push(traceLine('mean-field', lastResult.meanField.x, lastResult.meanField.y, { line: { dash: 'dash', width: 3 } }));
    return { traces, title: 'Stochastic ensemble', xLabel: lastResult.xA || '', yLabel: lastResult.yA || '' };
  }
  return { traces: lastResult.tracesA || [], title: lastResult.titleA || 'Main plot', xLabel: lastResult.xA || '', yLabel: lastResult.yA || '' };
}
function buildRightPlot(type) {
  if (['ensemble','mean','single','mean-field'].includes(type)) return buildLeftPlot(type);
  if (type === 'metrics') {
    const entries = Object.entries(lastResult.metrics || {}).filter(([,v]) => Number.isFinite(Number(v))).slice(0, 12);
    return { traces: [{ type:'bar', x: entries.map(e=>e[0]), y: entries.map(e=>Number(e[1])), name:'metrics' }], title: 'Run metrics', xLabel: 'metric', yLabel: 'value' };
  }
  return { traces: lastResult.tracesB || [], title: lastResult.titleB || 'Diagnostic', xLabel: lastResult.xB || '', yLabel: lastResult.yB || '' };
}
function renderMeanFieldBox() {
  const mf = lastResult?.meanField;
  $('meanFieldBox').innerHTML = mf ? `<h3>Mean-field overlay</h3><p>The dashed curve is generated automatically from the CTMC stoichiometry: drift = sum of event updates multiplied by propensities. This is a deterministic large-copy-number approximation, not a replacement for finite-event simulation. It may fail for extinction, low copy numbers, or strongly nonlinear propensities.</p>` : `<h3>Mean-field overlay</h3><p>This model family uses a specialized stochastic engine. A closed deterministic approximation is either model-specific or not shown in this browser lab.</p>`;
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
function resultToLongCsv() {
  if (!lastResult) return '';
  const rows = [['dataset','run','x','variable','value','extra'].join(',')];
  if (lastResult.paths && lastResult.x) {
    const variable = currentSettings?.plotVariable || 'value';
    lastResult.paths.forEach((path, r) => lastResult.x.forEach((x, i) => rows.push(['stochastic', r + 1, x, variable, path[i], currentPreset?.id || ''].map(csvEscape).join(','))));
  }
  Object.entries(lastResult.metrics || {}).forEach(([k, v]) => rows.push(['metrics','', '', k, v, currentPreset?.id || ''].map(csvEscape).join(',')));
  return rows.join('\n');
}
function stochasticPlotDataExport() {
  const pack = {preset: currentPreset?.id, engine: currentPreset?.engine, model: currentModel, settings: currentSettings, summary: lastResult?.metrics || null, result: lastResult || null, plots: {}, exportedAt: new Date().toISOString()};
  ['leftPlot','rightPlot'].forEach(id => { const el = $(id); if (el && el.data) pack.plots[id] = {data: el.data, layout: el.layout}; });
  return pack;
}
function pythonStarter() {
  const modelJson = JSON.stringify(currentModel, null, 2);
  const settingsJson = JSON.stringify(currentSettings, null, 2);
  if (currentPreset.engine !== 'ctmc') {
    return `# Stochastic Lab export starter
# Model: ${currentPreset.title}
# Engine: ${currentPreset.engine}

model = ${modelJson}
settings = ${settingsJson}

# This specialized engine is implemented in the browser lab.
# Exported JSON preserves the parameters and settings for reimplementation.
`;
  }
  return `# Runnable CTMC / Gillespie export from Foko Lab
# Model: ${currentPreset.title}

import math
import json
import numpy as np

model = ${modelJson}
settings = ${settingsJson}

def _safe_eval(expr, state, params):
    allowed = {
        'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
        'exp': math.exp, 'log': math.log, 'sqrt': math.sqrt,
        'abs': abs, 'min': min, 'max': max, 'pow': pow,
        'PI': math.pi, 'pi': math.pi, 'E': math.e, 'e': math.e,
    }
    scope = dict(allowed)
    scope.update(params)
    scope.update(state)
    return max(0.0, float(eval(expr, {'__builtins__': {}}, scope)))

def value_of(state, variable, model):
    if variable in state:
        return state[variable]
    expr = model.get('derived', {}).get(variable)
    if expr:
        return _safe_eval(expr, state, model.get('params', {}))
    return 0.0

def gillespie(model, settings, seed=0):
    rng = np.random.default_rng(seed)
    state = {s['name']: float(s.get('initial', 0)) for s in model['states']}
    params = {k: float(v) for k, v in model.get('params', {}).items()}
    t_end = float(settings.get('tEnd', 100))
    max_events = int(settings.get('maxEvents', 50000))
    plot_var = settings.get('plotVariable') or model['states'][0]['name']
    grid = np.linspace(0.0, t_end, int(settings.get('grid', 241)))
    y = np.zeros_like(grid)
    t = 0.0
    idx = 0
    events_taken = 0

    def fill_until(time):
        nonlocal idx
        while idx < len(grid) and grid[idx] <= time:
            y[idx] = value_of(state, plot_var, model)
            idx += 1

    fill_until(0.0)
    while t < t_end and events_taken < max_events:
        def event_enabled(ev):
            for name, delta in ev.get('updates', {}).items():
                if state.get(name, 0.0) + float(delta) < -1e-12:
                    return False
            return True
        propensities = np.array([
            _safe_eval(ev['propensity'], state, params) if event_enabled(ev) else 0.0
            for ev in model.get('events', [])
        ], dtype=float)
        a0 = propensities.sum()
        if not a0 > 0:
            break
        t += rng.exponential(1.0 / a0)
        if t > t_end:
            break
        chosen = int(rng.choice(len(propensities), p=propensities / a0))
        ev = model['events'][chosen]
        if not event_enabled(ev):
            continue
        for name, delta in ev.get('updates', {}).items():
            val = state.get(name, 0.0) + float(delta)
            state[name] = 0.0 if abs(val) < 1e-12 else val
        events_taken += 1
        fill_until(t)
    fill_until(t_end + 1e-12)
    return grid, y, state, events_taken

def ensemble(model, settings):
    runs = int(settings.get('runs', 200))
    seed = int(settings.get('seed', 12345))
    paths = []
    finals = []
    for r in range(runs):
        x, y, state, events_taken = gillespie(model, settings, seed + 9973*r)
        paths.append(y)
        finals.append(y[-1])
    paths = np.vstack(paths)
    return x, paths, np.array(finals)

if __name__ == '__main__':
    x, paths, finals = ensemble(model, settings)
    print('runs:', paths.shape[0])
    print('mean final:', finals.mean())
    print('variance final:', finals.var())
`;
}

function populatePlotTypeSelects() {
  const leftOpts = [
    ['ensemble', 'Ensemble paths'],
    ['mean', 'Mean trajectory'],
    ['single', 'Single path'],
    ['mean-field', 'Mean + mean-field'],
    ['diagnostic', 'Distribution / diagnostic'],
    ['metrics', 'Metrics chart']
  ];
  const rightOpts = [
    ['diagnostic', 'Distribution / diagnostic'],
    ['ensemble', 'Ensemble paths'],
    ['mean', 'Mean trajectory'],
    ['single', 'Single path'],
    ['mean-field', 'Mean + mean-field'],
    ['metrics', 'Metrics chart']
  ];
  const fill = (id, opts, fallback) => {
    const el = $(id);
    if (!el) return;
    const previous = el.value || fallback;
    el.innerHTML = opts.map(([v, label]) => `<option value="${v}">${label}</option>`).join('');
    el.value = opts.some(([v]) => v === previous) ? previous : fallback;
  };
  fill('stochLeftPlotType', leftOpts, 'ensemble');
  fill('stochRightPlotType', rightOpts, 'diagnostic');
}

function bindEvents() {
  $('applyJson').addEventListener('click', applyJson);
  $('jsonEditor').addEventListener('input', () => { jsonDirty = true; $('validationStatus').textContent = 'JSON has unsaved changes — click Apply JSON to use them.'; $('validationStatus').classList.remove('bad'); });
  $('newCustomModel')?.addEventListener('click', () => loadCustomCTMC(null, 'Blank CTMC model', true));
  $('newBlankModel')?.addEventListener('click', () => loadCustomCTMC(null, 'Blank CTMC model', false));
  $('resetModel').addEventListener('click', () => currentPreset.id === 'custom-ctmc' ? loadCustomCTMC(blankCTMCModel(), currentPreset.title, false, { skipConfirm: true }) : loadPreset(currentPreset.id, false));
  $('runModel').addEventListener('click', runCurrent);
  $('stochLeftPlotType')?.addEventListener('change', renderSelectedPlots);
  $('stochRightPlotType')?.addEventListener('change', renderSelectedPlots);
  $('stochExportPng')?.addEventListener('click', () => safeDownloadPlot('leftPlot', 'png', 'primary'));
  $('stochExportSvg')?.addEventListener('click', () => safeDownloadPlot('leftPlot', 'svg', 'primary'));
  $('stochExportPngRight')?.addEventListener('click', () => safeDownloadPlot('rightPlot', 'png', 'secondary'));
  $('stochExportSvgRight')?.addEventListener('click', () => safeDownloadPlot('rightPlot', 'svg', 'secondary'));
  ['runsInput','seedInput','tEndInput','gridInput','maxEventsInput','plotVariable','meanFieldToggle'].forEach(id => $(id).addEventListener('change', () => { readSettings(); updateExportPreview(); maybeAutoRun(); }));
  $('copySummary').addEventListener('click', () => navigator.clipboard?.writeText(JSON.stringify(lastResult?.metrics || {}, null, 2)));
  $('downloadModel').addEventListener('click', () => downloadText(`${currentPreset.id}-model.json`, JSON.stringify({ engine: currentPreset.engine, model: currentModel, settings: currentSettings }, null, 2), 'application/json'));
  $('downloadCsv').addEventListener('click', () => downloadText(`${currentPreset.id}-trajectories-wide.csv`, resultToCsv(), 'text/csv'));
  $('downloadLongCsv')?.addEventListener('click', () => downloadText(`${currentPreset.id}-trajectories-long.csv`, resultToLongCsv(), 'text/csv'));
  $('downloadPlotJson')?.addEventListener('click', () => downloadText(`${currentPreset.id}-plot-data.json`, JSON.stringify(stochasticPlotDataExport(), null, 2), 'application/json'));
  $('downloadSummary').addEventListener('click', () => downloadText(`${currentPreset.id}-summary.json`, JSON.stringify(lastResult?.metrics || {}, null, 2), 'application/json'));
  $('copyPython').addEventListener('click', () => { $('exportPreview').value = pythonStarter(); navigator.clipboard?.writeText(pythonStarter()); });
}
function safeDownloadPlot(id, format, label) {
  const el = $(id);
  if (el && el.data) Plotly.downloadImage(id, {format, filename:`${currentPreset?.id || 'stochastic'}-${label}`});
  else if ($('runStatus')) $('runStatus').textContent = 'Run a model before exporting a plot.';
}
function boot() {
  initTheme(); initTabs(); initLibrary(); populatePlotTypeSelects(); bindEvents();
  const alias = {gillespie:'birth-death', galton:'galton', wright:'wright-fisher', ratchet:'ratchet'};
  const params = new URLSearchParams(location.search);
  const raw = params.get('example') || location.hash.replace('#', '');
  const picked = alias[raw] || raw;
  if (picked === 'custom-ctmc') loadCustomCTMC(null, 'Blank CTMC model', false, { skipConfirm: true });
  else loadPreset(PRESETS.some(p => p.id === picked) ? picked : 'birth-death', false);
}
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCurrent(); } });
document.addEventListener('DOMContentLoaded', boot);
