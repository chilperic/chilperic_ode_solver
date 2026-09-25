/* Foko Lab v72.16 Agent reference core.
 * Pure, deterministic browser-scale agent simulations with explicit seeds,
 * update semantics, finite-ensemble summaries, and spatial diagnostics.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoAgentReference = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error((label || 'value') + ' must be finite.');
    return number;
  }
  function integer(value, label, min, max) {
    const number = finite(value, label);
    if (!Number.isInteger(number)) throw new Error((label || 'value') + ' must be an integer.');
    if (number < min || number > max) throw new Error((label || 'value') + ' must be between ' + min + ' and ' + max + '.');
    return number;
  }
  function choice(value, label, allowed, fallback) {
    if (value == null || value === '') return fallback;
    if (!allowed.includes(value)) throw new Error((label || 'value') + ' must be one of: ' + allowed.join(', ') + '.');
    return value;
  }
  function probability(value, label) {
    const number = finite(value, label);
    if (number < 0 || number > 1) throw new Error((label || 'probability') + ' must be in [0, 1].');
    return number;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function mulberry32(seed) {
    let a = (Number(seed) >>> 0) || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function deriveSeed(seed, index) {
    let x = ((Number(seed) >>> 0) ^ Math.imul(index + 1, 0x9E3779B1)) >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x85EBCA6B) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35) >>> 0;
    return (x ^ x >>> 16) >>> 0;
  }
  function stableStringify(value) {
    if (value == null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + stableStringify(value[key]); }).join(',') + '}';
  }
  function configHash(config) {
    const canonical = clone(config || {});
    delete canonical.initialFractionInputSum;
    delete canonical.initialFractionsWereNormalized;
    const text = stableStringify(canonical); let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  const MODEL_META = {
    tcell: {
      title: 'T-cell activation and proliferation',
      states: ['empty', 'quiescent', 'activated', 'dead'],
      colors: ['#f8fbfd', '#8ec5ff', '#0bb7a6', '#f97316'],
      events: ['activation', 'division', 'quiescent death', 'activated death', 'clearance'],
      params: ['activation', 'division', 'qDeath', 'aDeath', 'clearance'],
      defaultFractions: [0.10, 0.78, 0.12, 0],
      endpointLabel: 'net occupied-cell expansion'
    },
    sir: {
      title: 'Spatial SIR contact process',
      states: ['susceptible', 'infectious', 'recovered', 'empty'],
      colors: ['#8ec5ff', '#ef4444', '#0bb7a6', '#f8fbfd'],
      events: ['infection', 'recovery'],
      params: ['beta', 'gamma'],
      defaultFractions: [0.88, 0.04, 0, 0.08],
      endpointLabel: 'finite-horizon attack fraction'
    },
    voter: {
      title: 'Two-state voter dynamics',
      states: ['opinion A', 'opinion B'],
      colors: ['#155eef', '#f97316'],
      events: ['A adopts B', 'B adopts A'],
      params: ['copyProbability'],
      defaultFractions: [0.5, 0.5],
      endpointLabel: 'consensus indicator'
    },
    segregation: {
      title: 'Schelling-style relocation model',
      states: ['empty', 'group A', 'group B'],
      colors: ['#f8fbfd', '#155eef', '#f97316'],
      events: ['A relocation', 'B relocation'],
      params: ['similarityThreshold', 'moveProbability'],
      defaultFractions: [0.18, 0.41, 0.41],
      endpointLabel: 'satisfied occupied fraction'
    },
    predator_prey: {
      title: 'Lattice predator–prey process',
      states: ['empty', 'prey', 'predator'],
      colors: ['#f8fbfd', '#0bb7a6', '#b42318'],
      events: ['prey birth', 'predation', 'predator birth', 'predator death'],
      params: ['preyBirth', 'predatorBirth', 'predatorDeath'],
      defaultFractions: [0.18, 0.67, 0.15],
      endpointLabel: 'coexistence indicator'
    },
    fadns_particle: {
      title: 'Fatty-acid de novo synthesis particle abstraction',
      states: ['empty', 'acetyl-CoA', 'malonyl-CoA', 'elongating FAS complex', 'C14:0', 'C16:0', 'C18:0', 'CoA-bound FAS'],
      colors: ['#f8fbfd', '#2563eb', '#7c3aed', '#0f766e', '#f59e0b', '#ea580c', '#b42318', '#64748b'],
      events: ['substrate supply', 'condensation', 'elongation', 'C14 termination', 'C16 termination', 'C18 termination', 'product release', 'CoA inhibition', 'CoA release'],
      params: ['substrateSupply', 'condensation', 'elongation', 'terminate14', 'terminate16', 'terminate18', 'productRelease', 'coaInhibition', 'coaRelease'],
      defaultFractions: [0.55, 0.16, 0.16, 0.06, 0.02, 0.025, 0.015, 0.01],
      endpointLabel: 'C14/C16/C18 product composition'
    },
    cell_cycle: {
      title: 'T-cell generation and attrition process',
      states: ['empty', 'generation 0', 'generation 1', 'generation 2+', 'dead'],
      colors: ['#f8fbfd', '#8ec5ff', '#2f80ed', '#0f766e', '#f97316'],
      events: ['activation', 'first division', 'later division', 'death', 'clearance'],
      params: ['activation', 'division0', 'divisionLater', 'death', 'clearance'],
      defaultFractions: [0.12, 0.78, 0.08, 0.02, 0],
      endpointLabel: 'generation-weighted expansion'
    },
    forest_fire: {
      title: 'Forest-fire spread and recovery process',
      states: ['empty', 'tree', 'burning', 'ash'],
      colors: ['#f8fbfd', '#16a34a', '#dc2626', '#64748b'],
      events: ['tree growth', 'ignition', 'fire spread', 'burnout', 'ash recovery'],
      params: ['growth', 'lightning', 'spread', 'burnout', 'recovery'],
      defaultFractions: [0.16, 0.80, 0.01, 0.03],
      endpointLabel: 'burned and recovered fractions'
    },
    prisoner_dilemma: {
      title: 'Spatial prisoner’s dilemma',
      states: ['cooperator', 'defector'],
      colors: ['#0f766e', '#b42318'],
      events: ['cooperator adopts defection', 'defector adopts cooperation'],
      params: ['temptation', 'imitation'],
      defaultFractions: [0.72, 0.28],
      endpointLabel: 'cooperator fraction'
    },
    biofilm: {
      title: 'Biofilm growth abstraction',
      states: ['empty', 'nutrient', 'active biomass', 'inactive biomass'],
      colors: ['#f8fbfd', '#60a5fa', '#16a34a', '#64748b'],
      events: ['nutrient replenishment', 'attachment', 'biomass growth', 'inactivation', 'detachment', 'reactivation'],
      params: ['nutrientSupply', 'attachment', 'growth', 'inactivation', 'detachment', 'reactivation'],
      defaultFractions: [0.24, 0.62, 0.10, 0.04],
      endpointLabel: 'active biomass fraction'
    },
    custom: {
      title: 'Custom local transition model',
      states: ['empty', 'state A', 'state B'],
      colors: ['#f8fbfd', '#155eef', '#f97316'],
      events: ['A to B', 'B to A'],
      params: ['pAB', 'pBA'],
      defaultFractions: [0.10, 0.45, 0.45],
      endpointLabel: 'finite-horizon state composition'
    }
  };

  const CUSTOM_RULE_KINDS = ['spontaneous', 'neighbor-contact', 'neighbor-threshold'];
  function validateCustomModel(raw) {
    const source = clone(raw || {});
    const title = String(source.title || 'Custom local transition model').trim().slice(0, 120);
    const states = Array.isArray(source.states) ? source.states.map(function (state, index) {
      const name = typeof state === 'string' ? state : state && state.name;
      const color = typeof state === 'object' && state && state.color ? state.color : null;
      return { name: String(name || ('state ' + index)).trim().slice(0, 80), color: color };
    }) : [];
    if (states.length < 2 || states.length > 8) throw new Error('Custom Agent models require between 2 and 8 states.');
    if (new Set(states.map(function (state) { return state.name; })).size !== states.length) throw new Error('Custom Agent state names must be unique.');
    const fallbackColors = ['#f8fbfd','#155eef','#f97316','#0bb7a6','#b42318','#7c3aed','#ca8a04','#0891b2'];
    const colors = states.map(function (state, index) {
      const value = state.color || (Array.isArray(source.colors) ? source.colors[index] : null) || fallbackColors[index];
      if (!/^#[0-9a-f]{6}$/i.test(String(value))) throw new Error('Custom Agent colors must use six-digit hexadecimal notation.');
      return String(value);
    });
    const parameters = source.parameters && typeof source.parameters === 'object' && !Array.isArray(source.parameters) ? source.parameters : {};
    const params = {};
    Object.keys(parameters).sort().forEach(function (key) {
      if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(key)) throw new Error('Invalid custom Agent parameter name: ' + key + '.');
      params[key] = probability(parameters[key], key);
    });
    const transitions = Array.isArray(source.transitions) ? source.transitions.map(function (rule, index) {
      if (!rule || typeof rule !== 'object') throw new Error('Custom transition ' + (index + 1) + ' must be an object.');
      const from = integer(rule.from, 'custom transition from', 0, states.length - 1);
      const to = integer(rule.to, 'custom transition to', 0, states.length - 1);
      if (from === to) throw new Error('Custom transition ' + (index + 1) + ' must change state.');
      const kind = choice(rule.kind, 'custom transition kind', CUSTOM_RULE_KINDS, 'spontaneous');
      const parameter = rule.parameter == null || rule.parameter === '' ? null : String(rule.parameter);
      if (parameter && !(parameter in params)) throw new Error('Custom transition ' + (index + 1) + ' references unknown parameter ' + parameter + '.');
      const fixedProbability = parameter ? null : probability(rule.probability == null ? 0 : rule.probability, 'custom transition probability');
      const neighborState = kind === 'spontaneous' ? null : integer(rule.neighborState, 'custom neighbor state', 0, states.length - 1);
      const minNeighbors = kind === 'neighbor-threshold' ? integer(rule.minNeighbors == null ? 1 : rule.minNeighbors, 'custom minimum neighbours', 1, 8) : null;
      return { from: from, to: to, kind: kind, parameter: parameter, probability: fixedProbability, neighborState: neighborState, minNeighbors: minNeighbors, event: String(rule.event || (states[from].name + ' → ' + states[to].name)).slice(0, 100) };
    }) : [];
    if (!transitions.length) throw new Error('Custom Agent models require at least one transition rule.');
    const defaultFractions = normaliseFractions(source.defaultFractions || Array(states.length).fill(1 / states.length), states.length);
    return { title: title, states: states.map(function (state) { return state.name; }), colors: colors, events: Array.from(new Set(transitions.map(function (rule) { return rule.event; }))), params: Object.keys(params), parameters: params, transitions: transitions, defaultFractions: defaultFractions, endpointLabel: String(source.endpointLabel || 'finite-horizon state composition').slice(0, 120), emptyState: source.emptyState == null ? states.findIndex(function (state) { return state.name.toLowerCase() === 'empty'; }) : integer(source.emptyState, 'custom empty state', -1, states.length - 1) };
  }
  function metaForConfig(config) {
    return config && config.model === 'custom' ? config.customModel : MODEL_META[config.model];
  }

  function normaliseFractions(values, n) {
    const fractions = Array.from({ length: n }, function (_, i) {
      return Math.max(0, finite(values && values[i] != null ? values[i] : 0, 'initial fraction'));
    });
    const total = fractions.reduce(function (a, b) { return a + b; }, 0);
    if (!(total > 0)) throw new Error('At least one initial fraction must be positive.');
    return fractions.map(function (value) { return value / total; });
  }

  function validateConfig(raw) {
    const config = clone(raw || {});
    if (!MODEL_META[config.model]) throw new Error('Unknown agent model: ' + config.model);
    if (config.model === 'custom') config.customModel = validateCustomModel(config.customModel);
    const meta = metaForConfig(config);
    config.size = integer(config.size == null ? 32 : config.size, 'grid size', 8, 80);
    config.steps = integer(config.steps == null ? 100 : config.steps, 'steps', 1, 1200);
    config.runs = integer(config.runs == null ? 20 : config.runs, 'runs', 1, 200);
    config.seed = integer(config.seed == null ? 12345 : config.seed, 'seed', 0, 4294967295);
    config.recordEvery = integer(config.recordEvery == null ? 1 : config.recordEvery, 'record interval', 1, Math.max(1, config.steps));
    config.neighborhood = choice(config.neighborhood, 'neighborhood', ['von-neumann', 'moore'], 'von-neumann');
    config.boundary = choice(config.boundary, 'boundary', ['toroidal', 'fixed'], 'toroidal');
    config.updateSchedule = choice(config.updateSchedule, 'update schedule', ['random-with-replacement', 'shuffled-sweep'], 'random-with-replacement');
    config.initialization = choice(config.initialization, 'initialization', ['random', 'split', 'central-patch'], 'random');
    if (!config.params || typeof config.params !== 'object' || Array.isArray(config.params)) config.params = config.model === 'custom' ? clone(meta.parameters) : null;
    if (!config.params) throw new Error('Model parameters must be supplied as an object.');
    meta.params.forEach(function (key) {
      if (!(key in config.params)) throw new Error('Missing required model parameter: ' + key + '.');
      if (config.model === 'prisoner_dilemma' && key === 'temptation') {
        config.params[key] = finite(config.params[key], key);
        if (config.params[key] < 1 || config.params[key] > 2.5) throw new Error('temptation must be between 1 and 2.5.');
      } else config.params[key] = probability(config.params[key], key);
    });
    if (config.model === 'tcell' && config.params.activation + config.params.qDeath > 1 + 1e-12) {
      throw new Error('activation + qDeath must not exceed 1 because they are competing quiescent-cell outcomes.');
    }
    if (config.model === 'fadns_particle' && config.params.terminate14 + config.params.terminate16 + config.params.terminate18 > 1 + 1e-12) {
      throw new Error('terminate14 + terminate16 + terminate18 must not exceed 1 because they are competing elongating-complex outcomes.');
    }
    config.snapshotCount = integer(config.snapshotCount == null ? 24 : config.snapshotCount, 'snapshot count', 3, 80);
    config.captureSnapshots = config.captureSnapshots === true;
    config.initialMode = choice(config.initialMode, 'initial population mode', ['counts', 'fractions'], Array.isArray(config.initialCounts) ? 'counts' : 'fractions');
    const capacity = config.size * config.size;
    if (config.initialMode === 'counts') {
      if (!Array.isArray(config.initialCounts) || config.initialCounts.length !== meta.states.length) throw new Error('Initial counts must contain exactly ' + meta.states.length + ' integer values.');
      config.initialCounts = config.initialCounts.map(function (value, index) { return integer(value, 'initial count for ' + meta.states[index], 0, capacity); });
      const countSum = config.initialCounts.reduce(function (sum, value) { return sum + value; }, 0);
      if (countSum !== capacity) throw new Error('Initial counts must sum exactly to the lattice capacity (' + capacity + ' cells); received ' + countSum + '.');
      config.initialFractions = config.initialCounts.map(function (value) { return value / capacity; });
      config.initialFractionInputSum = 1;
      config.initialFractionsWereNormalized = false;
    } else {
      const rawFractions = config.initialFractions == null ? meta.defaultFractions : config.initialFractions;
      if (!Array.isArray(rawFractions) || rawFractions.length !== meta.states.length) throw new Error('Initial fractions must contain exactly ' + meta.states.length + ' values for ' + config.model + '.');
      const rawSum = rawFractions.reduce(function (sum, value) { return sum + Math.max(0, finite(value, 'initial fraction')); }, 0);
      const priorNormalised = config.initialFractionsWereNormalized === true;
      config.initialFractionInputSum = priorNormalised && Number.isFinite(config.initialFractionInputSum) ? Number(config.initialFractionInputSum) : rawSum;
      config.initialFractionsWereNormalized = priorNormalised || Math.abs(rawSum - 1) > 1e-10;
      config.initialFractions = normaliseFractions(rawFractions, meta.states.length);
      const bag = exactStateBag(config.initialFractions, capacity);
      config.initialCounts = meta.states.map(function (_, state) { return bag.reduce(function (sum, value) { return sum + (value === state ? 1 : 0); }, 0); });
    }
    const operations = config.size * config.size * config.steps * config.runs;
    if (operations > 40000000) throw new Error('Requested grid × steps × runs exceeds the browser safety budget (40 million update attempts). Reduce size, steps, or runs.');
    return config;
  }

  function neighbours(index, size, mode, boundary) {
    const row = Math.floor(index / size); const col = index % size;
    const offsets = mode === 'moore'
      ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
      : [[-1,0],[0,-1],[0,1],[1,0]];
    const out = [];
    offsets.forEach(function (offset) {
      let r = row + offset[0]; let c = col + offset[1];
      if (boundary === 'toroidal') {
        r = (r + size) % size; c = (c + size) % size;
      } else if (r < 0 || c < 0 || r >= size || c >= size) return;
      out.push(r * size + c);
    });
    return out;
  }
  function buildNeighbourCache(config, mode) {
    const neighborhood = mode || config.neighborhood;
    return Array.from({ length: config.size * config.size }, function (_, index) {
      return neighbours(index, config.size, neighborhood, config.boundary);
    });
  }
  function shuffle(array, random) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1)); const temp = array[i]; array[i] = array[j]; array[j] = temp;
    }
    return array;
  }
  function exactStateBag(fractions, count) {
    const raw = fractions.map(function (fraction) { return fraction * count; });
    const counts = raw.map(Math.floor); let remaining = count - counts.reduce(function (a, b) { return a + b; }, 0);
    const order = raw.map(function (value, index) { return { index: index, remainder: value - Math.floor(value) }; })
      .sort(function (a, b) { return b.remainder - a.remainder || a.index - b.index; });
    for (let i = 0; i < remaining; i += 1) counts[order[i % order.length].index] += 1;
    const bag = [];
    counts.forEach(function (n, state) { for (let i = 0; i < n; i += 1) bag.push(state); });
    return bag;
  }
  function initialiseGrid(config, random) {
    const count = config.size * config.size; const bag = [];
    config.initialCounts.forEach(function (n, state) { for (let i = 0; i < n; i += 1) bag.push(state); });
    const grid = new Int16Array(count);
    if (config.initialization === 'random') {
      shuffle(bag, random); for (let i = 0; i < count; i += 1) grid[i] = bag[i]; return grid;
    }
    if (config.initialization === 'split') {
      for (let i = 0; i < count; i += 1) grid[i] = bag[i]; return grid;
    }
    const indices = Array.from({ length: count }, function (_, index) { return index; });
    const centre = (config.size - 1) / 2;
    indices.sort(function (a, b) {
      const ar = Math.floor(a / config.size) - centre; const ac = (a % config.size) - centre;
      const br = Math.floor(b / config.size) - centre; const bc = (b % config.size) - centre;
      return (ar * ar + ac * ac) - (br * br + bc * bc) || a - b;
    });
    const stateCounts = config.initialFractions.map(function (fraction, state) {
      return { state: state, count: bag.filter(function (value) { return value === state; }).length, fraction: fraction };
    }).sort(function (a, b) { return a.fraction - b.fraction || a.state - b.state; });
    let cursor = 0;
    stateCounts.forEach(function (entry) {
      for (let k = 0; k < entry.count; k += 1) grid[indices[cursor++]] = entry.state;
    });
    return grid;
  }

  function choose(array, random) { return array.length ? array[Math.floor(random() * array.length)] : -1; }
  function addEvent(eventCounts, name, amount) { eventCounts[name] = (eventCounts[name] || 0) + (amount == null ? 1 : amount); }

  function updateTcell(grid, index, config, random, eventCounts, cache) {
    const p = config.params; const state = grid[index]; const ns = cache[index];
    if (state === 1) {
      const u = random();
      if (u < p.activation) { grid[index] = 2; addEvent(eventCounts, 'activation'); }
      else if (u < p.activation + p.qDeath) { grid[index] = 3; addEvent(eventCounts, 'quiescent death'); }
    } else if (state === 2) {
      if (random() < p.aDeath) { grid[index] = 3; addEvent(eventCounts, 'activated death'); return; }
      if (random() < p.division) {
        const empty = ns.filter(function (j) { return grid[j] === 0; }); const target = choose(empty, random);
        if (target >= 0) { grid[target] = 2; addEvent(eventCounts, 'division'); }
      }
    } else if (state === 3 && random() < p.clearance) { grid[index] = 0; addEvent(eventCounts, 'clearance'); }
  }

  function updateSir(grid, index, config, random, eventCounts, cache) {
    const state = grid[index]; const p = config.params;
    if (state === 0) {
      const infected = cache[index].reduce(function (sum, j) { return sum + (grid[j] === 1 ? 1 : 0); }, 0);
      if (infected && random() < 1 - Math.pow(1 - p.beta, infected)) { grid[index] = 1; addEvent(eventCounts, 'infection'); }
    } else if (state === 1 && random() < p.gamma) { grid[index] = 2; addEvent(eventCounts, 'recovery'); }
  }

  function updateVoter(grid, index, config, random, eventCounts, cache) {
    if (random() >= config.params.copyProbability) return;
    const target = choose(cache[index], random);
    if (target < 0 || grid[target] === grid[index]) return;
    const old = grid[index]; grid[index] = grid[target];
    addEvent(eventCounts, old === 0 ? 'A adopts B' : 'B adopts A');
  }

  function segregationContext(grid) {
    const emptyIndices = [];
    const emptyPosition = new Int32Array(grid.length); emptyPosition.fill(-1);
    for (let index = 0; index < grid.length; index += 1) if (grid[index] === 0) {
      emptyPosition[index] = emptyIndices.length; emptyIndices.push(index);
    }
    return { emptyIndices: emptyIndices, emptyPosition: emptyPosition };
  }

  function updateSegregation(grid, index, config, random, eventCounts, cache, context) {
    const state = grid[index]; if (state === 0) return;
    const ns = cache[index].filter(function (j) { return grid[j] !== 0; });
    if (!ns.length) return;
    const same = ns.reduce(function (sum, j) { return sum + (grid[j] === state ? 1 : 0); }, 0) / ns.length;
    if (same >= config.params.similarityThreshold || random() >= config.params.moveProbability) return;
    const pool = context && context.emptyIndices;
    if (!pool || !pool.length) return;
    const position = Math.floor(random() * pool.length); const target = pool[position];
    grid[target] = state; grid[index] = 0;
    context.emptyPosition[target] = -1; context.emptyPosition[index] = position; pool[position] = index;
    addEvent(eventCounts, state === 1 ? 'A relocation' : 'B relocation');
  }

  function updatePredatorPrey(grid, index, config, random, eventCounts, cache) {
    const state = grid[index]; const p = config.params; const ns = cache[index];
    if (state === 1) {
      if (random() < p.preyBirth) {
        const empty = ns.filter(function (j) { return grid[j] === 0; }); const target = choose(empty, random);
        if (target >= 0) { grid[target] = 1; addEvent(eventCounts, 'prey birth'); }
      }
    } else if (state === 2) {
      if (random() < p.predatorDeath) { grid[index] = 0; addEvent(eventCounts, 'predator death'); return; }
      const prey = ns.filter(function (j) { return grid[j] === 1; }); const target = choose(prey, random);
      if (target >= 0) {
        grid[target] = 2; addEvent(eventCounts, 'predation');
        if (random() < p.predatorBirth) { grid[index] = 2; addEvent(eventCounts, 'predator birth'); }
        else grid[index] = 0;
      }
    }
  }

  function updateFadnsParticle(grid, index, config, random, eventCounts, cache) {
    const state = grid[index]; const p = config.params; const ns = cache[index];
    if (state === 0) {
      if (random() < p.substrateSupply) { grid[index] = random() < 0.5 ? 1 : 2; addEvent(eventCounts, 'substrate supply'); }
      return;
    }
    if (state === 1 || state === 2) {
      const partnerState = state === 1 ? 2 : 1;
      const partners = ns.filter(function (j) { return grid[j] === partnerState; });
      const partner = choose(partners, random);
      if (partner >= 0 && random() < p.condensation) {
        grid[index] = 3; grid[partner] = 0; addEvent(eventCounts, 'condensation');
      }
      return;
    }
    if (state === 3) {
      const u = random();
      if (u < p.terminate14) { grid[index] = 4; addEvent(eventCounts, 'C14 termination'); return; }
      if (u < p.terminate14 + p.terminate16) { grid[index] = 5; addEvent(eventCounts, 'C16 termination'); return; }
      if (u < p.terminate14 + p.terminate16 + p.terminate18) { grid[index] = 6; addEvent(eventCounts, 'C18 termination'); return; }
      if (random() < p.coaInhibition) { grid[index] = 7; addEvent(eventCounts, 'CoA inhibition'); return; }
      if (random() < p.elongation) addEvent(eventCounts, 'elongation');
      return;
    }
    if (state >= 4 && state <= 6 && random() < p.productRelease) { grid[index] = 0; addEvent(eventCounts, 'product release'); return; }
    if (state === 7 && random() < p.coaRelease) { grid[index] = 0; addEvent(eventCounts, 'CoA release'); }
  }

  function updateCellCycle(grid, index, config, random, eventCounts, cache) {
    const state = grid[index]; const p = config.params; const ns = cache[index];
    if (state === 1 && random() < p.activation) { grid[index] = 2; addEvent(eventCounts, 'activation'); return; }
    if (state >= 1 && state <= 3) {
      if (random() < p.death) { grid[index] = 4; addEvent(eventCounts, 'death'); return; }
      const division = state === 1 ? p.division0 : p.divisionLater;
      if (random() < division) {
        const empty = ns.filter(function (j) { return grid[j] === 0; }); const target = choose(empty, random);
        if (target >= 0) {
          const next = Math.min(3, state + 1); grid[index] = next; grid[target] = next;
          addEvent(eventCounts, state === 1 ? 'first division' : 'later division');
        }
      }
      return;
    }
    if (state === 4 && random() < p.clearance) { grid[index] = 0; addEvent(eventCounts, 'clearance'); }
  }

  function updateForestFire(grid, index, config, random, eventCounts, cache) {
    const state = grid[index]; const p = config.params;
    if (state === 0 && random() < p.growth) { grid[index] = 1; addEvent(eventCounts, 'tree growth'); return; }
    if (state === 1) {
      const burning = cache[index].reduce(function (sum, j) { return sum + (grid[j] === 2 ? 1 : 0); }, 0);
      if (burning && random() < 1 - Math.pow(1 - p.spread, burning)) { grid[index] = 2; addEvent(eventCounts, 'fire spread'); return; }
      if (random() < p.lightning) { grid[index] = 2; addEvent(eventCounts, 'ignition'); }
      return;
    }
    if (state === 2 && random() < p.burnout) { grid[index] = 3; addEvent(eventCounts, 'burnout'); return; }
    if (state === 3 && random() < p.recovery) { grid[index] = 0; addEvent(eventCounts, 'ash recovery'); }
  }

  function prisonerPayoff(grid, index, config, cache) {
    const temptation = config.params.temptation;
    const strategy = grid[index];
    return cache[index].reduce(function (score, neighbour) {
      const other = grid[neighbour];
      if (strategy === 0 && other === 0) return score + 1;
      if (strategy === 1 && other === 0) return score + temptation;
      return score;
    }, 0);
  }
  function updatePrisonerDilemma(grid, index, config, random, eventCounts, cache) {
    if (random() >= config.params.imitation) return;
    const neighbour = choose(cache[index], random); if (neighbour < 0 || grid[neighbour] === grid[index]) return;
    const own = prisonerPayoff(grid, index, config, cache), other = prisonerPayoff(grid, neighbour, config, cache);
    if (other <= own) return;
    const old = grid[index]; grid[index] = grid[neighbour];
    addEvent(eventCounts, old === 0 ? 'cooperator adopts defection' : 'defector adopts cooperation');
  }

  function updateBiofilm(grid, index, config, random, eventCounts, cache) {
    const state = grid[index], p = config.params, ns = cache[index];
    if (state === 0) {
      if (random() < p.nutrientSupply) { grid[index] = 1; addEvent(eventCounts, 'nutrient replenishment'); }
      return;
    }
    if (state === 1) {
      const active = ns.filter(function (j) { return grid[j] === 2; });
      if (active.length && random() < 1 - Math.pow(1 - p.attachment, active.length)) { grid[index] = 2; addEvent(eventCounts, 'attachment'); }
      return;
    }
    if (state === 2) {
      if (random() < p.inactivation) { grid[index] = 3; addEvent(eventCounts, 'inactivation'); return; }
      const nutrient = ns.filter(function (j) { return grid[j] === 1; }); const target = choose(nutrient, random);
      if (target >= 0 && random() < p.growth) { grid[target] = 2; addEvent(eventCounts, 'biomass growth'); }
      return;
    }
    if (state === 3) {
      const u = random();
      if (u < p.detachment) { grid[index] = 0; addEvent(eventCounts, 'detachment'); }
      else if (u < p.detachment + p.reactivation) { grid[index] = 2; addEvent(eventCounts, 'reactivation'); }
    }
  }

  function customRuleProbability(rule, grid, index, config, cache) {
    const base = rule.parameter ? config.params[rule.parameter] : rule.probability;
    if (rule.kind === 'spontaneous') return base;
    const n = cache[index].reduce(function (sum, neighbor) { return sum + (grid[neighbor] === rule.neighborState ? 1 : 0); }, 0);
    if (rule.kind === 'neighbor-contact') return 1 - Math.pow(1 - base, n);
    return n >= rule.minNeighbors ? base : 0;
  }
  function updateCustom(grid, index, config, random, eventCounts, cache) {
    const state = grid[index];
    const rules = config.customModel.transitions.filter(function (rule) { return rule.from === state; });
    for (let i = 0; i < rules.length; i += 1) {
      const rule = rules[i]; const p = customRuleProbability(rule, grid, index, config, cache);
      if (random() < p) { grid[index] = rule.to; addEvent(eventCounts, rule.event); return; }
    }
  }

  const UPDATERS = { tcell: updateTcell, sir: updateSir, voter: updateVoter, segregation: updateSegregation, predator_prey: updatePredatorPrey, fadns_particle: updateFadnsParticle, cell_cycle: updateCellCycle, forest_fire: updateForestFire, prisoner_dilemma: updatePrisonerDilemma, biofilm: updateBiofilm, custom: updateCustom };

  function counts(grid, nStates) {
    const out = Array(nStates).fill(0);
    for (let i = 0; i < grid.length; i += 1) out[grid[i]] += 1;
    return out;
  }
  function entropy(countVector) {
    const total = countVector.reduce(function (a, b) { return a + b; }, 0); let h = 0;
    if (!total) return 0;
    countVector.forEach(function (count) { if (count > 0) { const p = count / total; h -= p * Math.log(p); } });
    return h;
  }
  function spatialAgreement(grid, config, cache) {
    let same = 0; let pairs = 0;
    const meta = metaForConfig(config); const emptyIndex = config.model === 'custom' ? meta.emptyState : meta.states.indexOf('empty'); const pairCache = cache || buildNeighbourCache(config, 'von-neumann');
    for (let i = 0; i < grid.length; i += 1) {
      const state = grid[i];
      pairCache[i].forEach(function (j) {
        if (j <= i) return;
        if (emptyIndex >= 0 && (state === emptyIndex || grid[j] === emptyIndex)) return;
        pairs += 1; if (grid[j] === state) same += 1;
      });
    }
    return pairs ? same / pairs : null;
  }
  function categoricalAutocorrelation(grid, config, cache) {
    const agreement = spatialAgreement(grid, config, cache);
    if (agreement == null) return null;
    const meta = metaForConfig(config);
    const emptyIndex = config.model === 'custom' ? meta.emptyState : meta.states.indexOf('empty');
    const stateCounts = counts(grid, meta.states.length);
    const occupied = stateCounts.reduce(function (sum, value, index) { return sum + (index === emptyIndex ? 0 : value); }, 0);
    if (occupied <= 1) return null;
    let expected = 0;
    stateCounts.forEach(function (value, index) {
      if (index === emptyIndex) return;
      const proportion = value / occupied;
      expected += proportion * proportion;
    });
    if (expected >= 1 - 1e-12) return 0;
    return (agreement - expected) / (1 - expected);
  }

  function diversityNormalised(countVector) {
    const occupied = countVector.filter(function (value) { return value > 0; }).length;
    if (occupied <= 1) return 0;
    return entropy(countVector) / Math.log(countVector.length);
  }
  function clusterSummary(grid, config, cache) {
    const meta = metaForConfig(config); const emptyIndex = config.model === 'custom' ? meta.emptyState : meta.states.indexOf('empty'); const adjacency = cache || buildNeighbourCache(config, 'von-neumann');
    const visited = new Uint8Array(grid.length); const sizes = [];
    for (let start = 0; start < grid.length; start += 1) {
      if (visited[start] || (emptyIndex >= 0 && grid[start] === emptyIndex)) continue;
      const state = grid[start]; const queue = [start]; visited[start] = 1; let size = 0;
      while (queue.length) {
        const node = queue.pop(); size += 1;
        adjacency[node].forEach(function (next) {
          if (!visited[next] && grid[next] === state) { visited[next] = 1; queue.push(next); }
        });
      }
      sizes.push(size);
    }
    const occupied = sizes.reduce(function (a, b) { return a + b; }, 0);
    const largest = sizes.length ? Math.max.apply(null, sizes) : 0;
    return {
      clusterCount: sizes.length,
      largestCluster: largest,
      largestClusterFraction: occupied ? largest / occupied : 0,
      meanClusterSize: sizes.length ? occupied / sizes.length : 0,
      sizes: sizes.sort(function (a, b) { return b - a; })
    };
  }
  function segregationSatisfaction(grid, config, cache) {
    let satisfied = 0; let evaluated = 0;
    for (let i = 0; i < grid.length; i += 1) {
      const state = grid[i]; if (state === 0) continue;
      const occupiedNeighbours = cache[i].filter(function (j) { return grid[j] !== 0; });
      if (!occupiedNeighbours.length) continue;
      const same = occupiedNeighbours.reduce(function (sum, j) { return sum + (grid[j] === state ? 1 : 0); }, 0) / occupiedNeighbours.length;
      evaluated += 1; if (same >= config.params.similarityThreshold) satisfied += 1;
    }
    return evaluated ? satisfied / evaluated : null;
  }
  function terminalState(model, finalCounts) {
    if (model === 'voter') {
      if (finalCounts[0] === 0) return { absorbed: true, label: 'consensus B' };
      if (finalCounts[1] === 0) return { absorbed: true, label: 'consensus A' };
      return { absorbed: false, label: 'mixed' };
    }
    if (model === 'sir') return { absorbed: finalCounts[1] === 0, label: finalCounts[1] === 0 ? 'infection extinct' : 'infectious remaining' };
    if (model === 'predator_prey') {
      if (finalCounts[2] === 0) return { absorbed: true, label: 'predator extinct' };
      if (finalCounts[1] === 0) return { absorbed: true, label: 'prey extinct' };
      return { absorbed: false, label: 'coexistence at horizon' };
    }
    if (model === 'forest_fire') return { absorbed: finalCounts[2] === 0, label: finalCounts[2] === 0 ? 'no burning sites' : 'active fire at horizon' };
    if (model === 'prisoner_dilemma') { if (finalCounts[0] === 0) return { absorbed: true, label: 'all defectors' }; if (finalCounts[1] === 0) return { absorbed: true, label: 'all cooperators' }; return { absorbed: false, label: 'mixed strategies' }; }
    if (model === 'biofilm') return { absorbed: finalCounts[2] + finalCounts[3] === 0, label: finalCounts[2] + finalCounts[3] === 0 ? 'biomass absent' : 'biomass present' };
    if (model === 'fadns_particle') return { absorbed: false, label: 'finite-horizon product mixture' };
    if (model === 'cell_cycle') return { absorbed: finalCounts[1] + finalCounts[2] + finalCounts[3] === 0, label: finalCounts[1] + finalCounts[2] + finalCounts[3] === 0 ? 'living cells extinct' : 'living cells present' };
    if (model === 'custom') return { absorbed: false, label: 'custom finite-horizon state' };
    return { absorbed: false, label: 'finite-horizon state' };
  }
  function endpointDiagnostics(config, initialCounts, finalCounts, eventTotals, cache, grid) {
    const total = finalCounts.reduce(function (a, b) { return a + b; }, 0); const out = {};
    if (config.model === 'tcell') {
      const initialOccupied = total - initialCounts[0]; const finalOccupied = total - finalCounts[0];
      out.netExpansion = initialOccupied ? finalOccupied / initialOccupied : null;
      out.activatedFraction = finalOccupied ? finalCounts[2] / finalOccupied : null;
      out.cumulativeDivisions = eventTotals.division || 0;
    } else if (config.model === 'sir') {
      out.attackFraction = initialCounts[0] ? Math.min(1, (eventTotals.infection || 0) / initialCounts[0]) : null;
      out.peakInfectiousAvailable = true;
      out.finalRecoveredFraction = finalCounts[2] / total;
    } else if (config.model === 'voter') {
      out.consensus = finalCounts[0] === 0 || finalCounts[1] === 0 ? 1 : 0;
      out.finalOpinionAFraction = finalCounts[0] / total;
    } else if (config.model === 'segregation') {
      out.satisfiedFraction = segregationSatisfaction(grid, config, cache);
      out.relocations = (eventTotals['A relocation'] || 0) + (eventTotals['B relocation'] || 0);
    } else if (config.model === 'predator_prey') {
      out.coexistence = finalCounts[1] > 0 && finalCounts[2] > 0 ? 1 : 0;
      out.predatorFraction = finalCounts[2] / total;
      out.preyFraction = finalCounts[1] / total;
    } else if (config.model === 'fadns_particle') {
      const products = finalCounts[4] + finalCounts[5] + finalCounts[6];
      out.totalProductFraction = products / total;
      out.C14Fraction = products ? finalCounts[4] / products : 0;
      out.C16Fraction = products ? finalCounts[5] / products : 0;
      out.C18Fraction = products ? finalCounts[6] / products : 0;
      out.coaBoundFraction = finalCounts[7] / total;
    } else if (config.model === 'cell_cycle') {
      const living = finalCounts[1] + finalCounts[2] + finalCounts[3];
      const initialLiving = initialCounts[1] + initialCounts[2] + initialCounts[3];
      out.netExpansion = initialLiving ? living / initialLiving : null;
      out.generationWeightedMean = living ? (finalCounts[2] + 2 * finalCounts[3]) / living : 0;
      out.deadFraction = finalCounts[4] / total;
    } else if (config.model === 'prisoner_dilemma') {
      out.cooperatorFraction = finalCounts[0] / total;
      out.consensus = finalCounts[0] === 0 || finalCounts[1] === 0 ? 1 : 0;
    } else if (config.model === 'biofilm') {
      out.activeBiomassFraction = finalCounts[2] / total;
      out.totalBiomassFraction = (finalCounts[2] + finalCounts[3]) / total;
      out.nutrientFraction = finalCounts[1] / total;
    } else if (config.model === 'forest_fire') {
      out.burningFraction = finalCounts[2] / total;
      out.ashFraction = finalCounts[3] / total;
      out.treeFraction = finalCounts[1] / total;
    }
    return out;
  }
  function mergeEvents(target, source) {
    Object.keys(source).forEach(function (key) { addEvent(target, key, source[key]); });
  }

  function createSimulationRunner(rawConfig, suppliedSeed) {
    const config = validateConfig(rawConfig);
    const seed = suppliedSeed == null ? config.seed : suppliedSeed >>> 0;
    const random = mulberry32(seed);
    const meta = metaForConfig(config);
    const grid = initialiseGrid(config, random);
    const initialGrid = Array.from(grid);
    const initialCounts = counts(grid, meta.states.length);
    const cache = buildNeighbourCache(config);
    const pairCache = config.neighborhood === 'von-neumann' ? cache : buildNeighbourCache(config, 'von-neumann');
    const times = [0];
    const series = [initialCounts.slice()];
    const eventSeries = [];
    const eventTotals = {};
    let pendingEvents = {};
    const snapshotSteps = Array.from({ length: config.snapshotCount }, function (_, i) {
      return Math.round(i * config.steps / (config.snapshotCount - 1));
    });
    const snapshots = config.captureSnapshots ? [{ step: 0, grid: initialGrid.slice() }] : [];
    const initialClusters = clusterSummary(grid, config, pairCache);
    const spatialSeries = [{
      step: 0,
      agreement: spatialAgreement(grid, config, pairCache),
      autocorrelation: categoricalAutocorrelation(grid, config, pairCache),
      diversity: diversityNormalised(initialCounts),
      occupiedFraction: initialCounts.reduce(function (sum, value, index) {
        const emptyIndex = config.model === 'custom' ? meta.emptyState : meta.states.indexOf('empty');
        return sum + (index === emptyIndex ? 0 : value);
      }, 0) / grid.length,
      clusterCount: initialClusters.clusterCount,
      largestClusterFraction: initialClusters.largestClusterFraction
    }];
    const updater = UPDATERS[config.model];
    const context = config.model === 'segregation' ? segregationContext(grid) : null;
    const attemptsPerStep = grid.length;
    const order = Array.from({ length: attemptsPerStep }, function (_, i) { return i; });
    const initialTerminal = terminalState(config.model, initialCounts);
    let absorptionStep = initialTerminal.absorbed ? 0 : null;
    let peakInfectious = config.model === 'sir' ? initialCounts[1] : null;
    let peakInfectiousStep = 0;
    let currentStep = 0;
    let currentCounts = initialCounts.slice();
    let completedResult = null;

    function spatialFrame() {
      const clustersNow = clusterSummary(grid, config, pairCache);
      const emptyIndexNow = config.model === 'custom' ? meta.emptyState : meta.states.indexOf('empty');
      const occupiedNow = currentCounts.reduce(function (sum, value, index) {
        return sum + (index === emptyIndexNow ? 0 : value);
      }, 0);
      return {
        step: currentStep,
        agreement: spatialAgreement(grid, config, pairCache),
        autocorrelation: categoricalAutocorrelation(grid, config, pairCache),
        diversity: diversityNormalised(currentCounts),
        occupiedFraction: occupiedNow / grid.length,
        clusterCount: clustersNow.clusterCount,
        largestClusterFraction: clustersNow.largestClusterFraction
      };
    }

    function frame() {
      return {
        step: currentStep,
        totalSteps: config.steps,
        grid: Array.from(grid),
        counts: currentCounts.slice(),
        eventTotals: clone(eventTotals),
        spatial: spatialFrame()
      };
    }

    function advance(stepCount) {
      if (completedResult) return frame();
      const requested = Math.max(1, Math.floor(Number(stepCount) || 1));
      const target = Math.min(config.steps, currentStep + requested);
      while (currentStep < target) {
        const step = currentStep + 1;
        const events = {};
        if (config.updateSchedule === 'shuffled-sweep') {
          shuffle(order, random);
          for (let attempt = 0; attempt < attemptsPerStep; attempt += 1) {
            updater(grid, order[attempt], config, random, events, cache, context);
          }
        } else {
          for (let attempt = 0; attempt < attemptsPerStep; attempt += 1) {
            updater(grid, Math.floor(random() * grid.length), config, random, events, cache, context);
          }
        }
        mergeEvents(eventTotals, events);
        mergeEvents(pendingEvents, events);
        currentCounts = counts(grid, meta.states.length);
        if (config.model === 'sir' && currentCounts[1] > peakInfectious) {
          peakInfectious = currentCounts[1];
          peakInfectiousStep = step;
        }
        if (absorptionStep == null && terminalState(config.model, currentCounts).absorbed) absorptionStep = step;
        if (step % config.recordEvery === 0 || step === config.steps) {
          times.push(step);
          series.push(currentCounts.slice());
          eventSeries.push({ step: step, counts: clone(pendingEvents) });
          pendingEvents = {};
          const spatial = spatialFrameForStep(step);
          spatialSeries.push(spatial);
        }
        if (config.captureSnapshots && snapshotSteps.includes(step) && !snapshots.some(function (snapshot) { return snapshot.step === step; })) {
          snapshots.push({ step: step, grid: Array.from(grid) });
        }
        currentStep = step;
      }
      return frame();
    }

    function spatialFrameForStep(step) {
      const clustersNow = clusterSummary(grid, config, pairCache);
      const emptyIndexNow = config.model === 'custom' ? meta.emptyState : meta.states.indexOf('empty');
      const occupiedNow = currentCounts.reduce(function (sum, value, index) {
        return sum + (index === emptyIndexNow ? 0 : value);
      }, 0);
      return {
        step: step,
        agreement: spatialAgreement(grid, config, pairCache),
        autocorrelation: categoricalAutocorrelation(grid, config, pairCache),
        diversity: diversityNormalised(currentCounts),
        occupiedFraction: occupiedNow / grid.length,
        clusterCount: clustersNow.clusterCount,
        largestClusterFraction: clustersNow.largestClusterFraction
      };
    }

    function result() {
      if (currentStep < config.steps) throw new Error('Agent simulation is incomplete at step ' + currentStep + ' of ' + config.steps + '.');
      if (completedResult) return completedResult;
      const finalCounts = currentCounts.slice();
      const agreement = spatialAgreement(grid, config, pairCache);
      const clusters = clusterSummary(grid, config, pairCache);
      const terminal = terminalState(config.model, finalCounts);
      const modelDiagnostics = endpointDiagnostics(config, initialCounts, finalCounts, eventTotals, cache, grid);
      if (config.model === 'sir') {
        modelDiagnostics.peakInfectious = peakInfectious;
        modelDiagnostics.peakInfectiousStep = peakInfectiousStep;
      }
      completedResult = {
        config: config,
        seed: seed,
        states: meta.states.slice(),
        colors: meta.colors.slice(),
        times: times,
        counts: series,
        eventSeries: eventSeries,
        eventTotals: eventTotals,
        initialGrid: initialGrid,
        finalGrid: Array.from(grid),
        snapshots: snapshots.sort(function (a, b) { return a.step - b.step; }),
        spatialSeries: spatialSeries,
        initialCounts: initialCounts,
        finalCounts: finalCounts,
        absorptionStep: absorptionStep,
        terminal: terminal,
        modelDiagnostics: modelDiagnostics,
        metrics: {
          entropy: entropy(finalCounts),
          normalizedDiversity: diversityNormalised(finalCounts),
          spatialAgreement: agreement,
          categoricalAutocorrelation: categoricalAutocorrelation(grid, config, pairCache),
          interfaceDensity: agreement == null ? null : 1 - agreement,
          occupied: finalCounts.reduce(function (sum, value, index) {
            const emptyIndex = config.model === 'custom' ? meta.emptyState : meta.states.indexOf('empty');
            return sum + (index === emptyIndex ? 0 : value);
          }, 0),
          clusterCount: clusters.clusterCount,
          largestCluster: clusters.largestCluster,
          largestClusterFraction: clusters.largestClusterFraction,
          meanClusterSize: clusters.meanClusterSize
        },
        clusters: clusters
      };
      return completedResult;
    }

    return {
      config: config,
      seed: seed,
      states: meta.states.slice(),
      colors: meta.colors.slice(),
      get step() { return currentStep; },
      get done() { return currentStep >= config.steps; },
      advance: advance,
      frame: frame,
      result: result
    };
  }

  function simulate(rawConfig, suppliedSeed, observer) {
    const runner = createSimulationRunner(rawConfig, suppliedSeed);
    const hooks = observer && typeof observer === 'object' ? observer : null;
    const liveEvery = hooks ? Math.max(1, Math.floor(Number(hooks.liveEvery) || runner.config.recordEvery)) : runner.config.steps;
    if (hooks && typeof hooks.onFrame === 'function') hooks.onFrame(runner.frame());
    while (!runner.done) {
      runner.advance(liveEvery);
      if (hooks && typeof hooks.onFrame === 'function') hooks.onFrame(runner.frame());
    }
    return runner.result();
  }

  function quantile(values, q) {
    const sorted = values.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; });
    if (!sorted.length) return null;
    const pos = (sorted.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function mean(values) { return values.length ? values.reduce(function (a, b) { return a + b; }, 0) / values.length : null; }
  function sampleSd(values) {
    if (values.length < 2) return 0; const m = mean(values);
    return Math.sqrt(values.reduce(function (sum, value) { return sum + Math.pow(value - m, 2); }, 0) / (values.length - 1));
  }
  function summarizeValues(values) {
    const clean = values.filter(function (value) { return value != null && Number.isFinite(value); });
    return { mean: mean(clean), sd: sampleSd(clean), mcse: clean.length ? sampleSd(clean) / Math.sqrt(clean.length) : null, q05: quantile(clean, 0.05), q50: quantile(clean, 0.5), q95: quantile(clean, 0.95), values: clean };
  }

  function wilsonInterval(successes, total, z) {
    const n = Number(total); const k = Number(successes); const critical = z == null ? 1.959963984540054 : Number(z);
    if (!Number.isFinite(n) || !Number.isFinite(k) || n <= 0 || k < 0 || k > n) return { low: null, high: null };
    const p = k / n; const z2 = critical * critical; const denominator = 1 + z2 / n;
    const centre = (p + z2 / (2 * n)) / denominator;
    const half = critical * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / denominator;
    return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
  }

  function summarizeRuns(rawConfig, runs) {
    const config = validateConfig(rawConfig);
    if (!Array.isArray(runs) || !runs.length) throw new Error('At least one completed Agent run is required.');
    const first = runs[0]; const nTimes = first.times.length; const nStates = first.states.length;
    runs.forEach(function (run, index) {
      if (!run || run.times.length !== nTimes || run.states.length !== nStates) throw new Error('Run ' + index + ' is incompatible with the ensemble grid.');
    });
    const meanSeries = Array.from({ length: nTimes }, function () { return Array(nStates).fill(0); });
    const q05 = Array.from({ length: nTimes }, function () { return Array(nStates).fill(0); });
    const q95 = Array.from({ length: nTimes }, function () { return Array(nStates).fill(0); });
    for (let t = 0; t < nTimes; t += 1) for (let s = 0; s < nStates; s += 1) {
      const values = runs.map(function (run) { return run.counts[t][s]; });
      meanSeries[t][s] = mean(values); q05[t][s] = quantile(values, 0.05); q95[t][s] = quantile(values, 0.95);
    }
    const finalByState = Array.from({ length: nStates }, function (_, s) { return runs.map(function (run) { return run.finalCounts[s]; }); });
    const spatialTimes = first.spatialSeries.map(function (row) { return row.step; });
    const spatialMetrics = {};
    ['agreement', 'autocorrelation', 'diversity', 'occupiedFraction', 'clusterCount', 'largestClusterFraction'].forEach(function (name) {
      spatialMetrics[name] = {
        mean: spatialTimes.map(function (_, index) { return mean(runs.map(function (run) { return run.spatialSeries[index][name]; }).filter(Number.isFinite)); }),
        q05: spatialTimes.map(function (_, index) { return quantile(runs.map(function (run) { return run.spatialSeries[index][name]; }).filter(Number.isFinite), 0.05); }),
        q95: spatialTimes.map(function (_, index) { return quantile(runs.map(function (run) { return run.spatialSeries[index][name]; }).filter(Number.isFinite), 0.95); })
      };
    });
    const metricNames = ['entropy', 'normalizedDiversity', 'spatialAgreement', 'categoricalAutocorrelation', 'interfaceDensity', 'occupied', 'clusterCount', 'largestClusterFraction', 'meanClusterSize']; const metrics = {};
    metricNames.forEach(function (name) { metrics[name] = summarizeValues(runs.map(function (run) { return run.metrics[name]; })); });
    const endpointKeys = Array.from(new Set(runs.flatMap(function (run) { return Object.keys(run.modelDiagnostics || {}); }))); const endpoints = {};
    endpointKeys.forEach(function (key) { endpoints[key] = summarizeValues(runs.map(function (run) { return run.modelDiagnostics && run.modelDiagnostics[key]; })); });
    const terminalCounts = {}; runs.forEach(function (run) { terminalCounts[run.terminal.label] = (terminalCounts[run.terminal.label] || 0) + 1; });
    const terminalOutcomes = Object.keys(terminalCounts).sort().map(function (label) {
      const count = terminalCounts[label]; const proportion = count / runs.length;
      return { label: label, count: count, proportion: proportion, mcse: Math.sqrt(proportion * (1 - proportion) / runs.length), wilson95: wilsonInterval(count, runs.length) };
    });
    const absorbed = runs.filter(function (run) { return run.terminal.absorbed; }); const absorptionSteps = runs.map(function (run) { return run.absorptionStep; }).filter(Number.isFinite);
    const absorbedFraction = absorbed.length / runs.length;
    const finalProportions = finalByState.map(function (values) { return summarizeValues(values.map(function (value) { return value / (config.size * config.size); })); });
    return {
      config: config,
      states: first.states,
      colors: first.colors,
      times: first.times,
      representative: first,
      runs: runs.map(function (run) {
        return { seed: run.seed, finalCounts: run.finalCounts, eventTotals: run.eventTotals, metrics: run.metrics, modelDiagnostics: run.modelDiagnostics, absorptionStep: run.absorptionStep, terminal: run.terminal };
      }),
      ensemble: {
        mean: meanSeries, q05: q05, q95: q95, finalByState: finalByState, finalProportions: finalProportions,
        spatial: { times: spatialTimes, agreement: spatialMetrics.agreement, autocorrelation: spatialMetrics.autocorrelation, diversity: spatialMetrics.diversity, occupiedFraction: spatialMetrics.occupiedFraction, clusterCount: spatialMetrics.clusterCount, largestClusterFraction: spatialMetrics.largestClusterFraction },
        metrics: metrics, endpoints: endpoints,
        absorption: { fraction: absorbedFraction, count: absorbed.length, mcse: Math.sqrt(absorbedFraction * (1 - absorbedFraction) / runs.length), wilson95: wilsonInterval(absorbed.length, runs.length), stepSummary: summarizeValues(absorptionSteps), terminalCounts: terminalCounts, terminalOutcomes: terminalOutcomes }
      },
      provenance: {
        algorithm: 'random-sequential lattice updates',
        updateSchedule: config.updateSchedule,
        initialization: config.initialization,
        updateAttemptsPerStep: config.size * config.size,
        seeds: runs.map(function (run) { return run.seed; }),
        masterSeed: config.seed,
        boundary: config.boundary,
        neighborhood: config.neighborhood,
        configHash: configHash(config),
        ensembleRuns: runs.length,
        siteUpdateSemantics: 'in-place asynchronous site updates',
        initialFractionInputSum: config.initialFractionInputSum,
        initialFractionsWereNormalized: config.initialFractionsWereNormalized,
        initialMode: config.initialMode,
        initialCounts: config.initialCounts.slice(),
        customRuleSemantics: config.model === 'custom' ? 'ordered first-success local transition rules' : null,
        relocationTargetSampling: config.model === 'segregation' ? 'uniform over the current empty-site pool' : null
      }
    };
  }

  function simulateEnsemble(rawConfig) {
    const config = validateConfig(rawConfig); const runs = [];
    for (let r = 0; r < config.runs; r += 1) {
      const runConfig = Object.assign({}, config, { captureSnapshots: r === 0 });
      runs.push(simulate(runConfig, deriveSeed(config.seed, r)));
    }
    return summarizeRuns(config, runs);
  }

  return {
    MODEL_META: clone(MODEL_META),
    validateCustomModel: validateCustomModel,
    validateConfig: validateConfig,
    createSimulationRunner: createSimulationRunner,
    simulate: simulate,
    simulateEnsemble: simulateEnsemble,
    summarizeRuns: summarizeRuns,
    mulberry32: mulberry32,
    deriveSeed: deriveSeed,
    configHash: configHash,
    entropy: entropy,
    spatialAgreement: spatialAgreement,
    categoricalAutocorrelation: categoricalAutocorrelation,
    clusterSummary: clusterSummary,
    quantile: quantile,
    summarizeValues: summarizeValues,
    wilsonInterval: wilsonInterval
  };
}));
