/* Foko Lab Agent Lab custom-rule sandbox (v24)
   Runs user-provided local rules away from the UI thread. It is still a browser
   prototype sandbox, not a security boundary against hostile code. The main
   thread terminates the worker on timeout. */
'use strict';

let compiled = null;
let compiledCode = '';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rngFactory(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function idx(x, y, n) { return ((y + n) % n) * n + ((x + n) % n); }
function gridIds(x, y, n, topology) {
  const dirs = topology === 'von_neumann'
    ? [[1,0],[-1,0],[0,1],[0,-1]]
    : [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  return dirs.map(([dx, dy]) => idx(x + dx, y + dy, n));
}
function unique(xs) { return [...new Set(xs.filter(Number.isFinite))]; }
function neighborhoodIds(x, y, payload) {
  const id = idx(x, y, payload.n);
  const topo = payload.topology || 'moore';
  const layers = payload.networkLayers || {};
  if ((topo === 'random_graph' || topo === 'small_world') && payload.graph && payload.graph[id] && payload.graph[id].length) return payload.graph[id];
  if (topo === 'multilayer_social') return unique([...(layers.spatial?.[id] || []), ...(layers.social?.[id] || [])]);
  if (topo === 'multilayer_transport') return unique([...(layers.spatial?.[id] || []), ...(layers.social?.[id] || []), ...(layers.transport?.[id] || [])]);
  return gridIds(x, y, payload.n, topo);
}
function layerDegrees(id, layers) {
  return {
    spatial: (layers.spatial?.[id] || []).length,
    social: (layers.social?.[id] || []).length,
    transport: (layers.transport?.[id] || []).length
  };
}
function countNeighbors(x, y, base, payload) {
  const ids = neighborhoodIds(x, y, payload);
  const values = ids.map(i => base[i]);
  const byState = {};
  for (const v of values) byState[v] = (byState[v] || 0) + 1;
  return {
    values,
    ids,
    byState,
    empty: byState[0] || 0,
    a: byState[1] || 0,
    b: byState[2] || 0,
    c: byState[3] || 0,
    d: byState[4] || 0,
    e: byState[5] || 0,
    f: byState[6] || 0,
    g: byState[7] || 0,
    alive: values.filter(v => v > 0).length,
    degree: values.length,
    layers: layerDegrees(idx(x, y, payload.n), payload.networkLayers || {})
  };
}
function eventBag() {
  return {births:0,deaths:0,infections:0,recoveries:0,mutations:0,customChanges:0,transitions01:0,transitions12:0,transitions23:0,transitions34:0,transitions45:0,transitions56:0,transitions67:0,productsC14:0,productsC16:0,productsC18:0};
}
function trackEvent(oldv, newv, ev) {
  if (newv !== oldv) {
    ev.customChanges++;
    if (!oldv && newv) ev.births++;
    if (oldv && !newv) ev.deaths++;
    const key = 'transitions' + oldv + newv;
    if (Object.prototype.hasOwnProperty.call(ev, key)) ev[key]++;
  }
}
function normalize(res, oldState, oldTrait, maxState) {
  if (res && typeof res === 'object') {
    return {
      state: clamp(Number(res.state ?? res.cell ?? oldState) || 0, 0, maxState) | 0,
      trait: Number.isFinite(Number(res.trait)) ? Number(res.trait) : oldTrait,
      memory: Number.isFinite(Number(res.memory)) ? Number(res.memory) : undefined,
      event: String(res.event || '')
    };
  }
  return { state: clamp(Number(res) || 0, 0, maxState) | 0, trait: oldTrait, event: '' };
}
function compileRule(code) {
  if (!code || String(code).length > 12000) throw new Error('Rule code is empty or too long.');
  compiledCode = String(code);
  // The custom rule is isolated from the UI thread. The main thread will kill this worker on timeout.
  compiled = new Function('cell','neighbors','counts','params','rand','x','y','t','trait','memory','dt','"use strict";\n' + compiledCode);
  return true;
}
function runStep(payload) {
  if (!compiled || payload.code !== compiledCode) compileRule(payload.code || 'return cell;');
  const n = payload.n;
  const cells = (payload.cells || []).slice();
  const base = (payload.cells || []).slice();
  const traits = (payload.traits || new Array(cells.length).fill(0)).slice();
  const memory = (payload.memory || new Array(cells.length).fill(0)).slice();
  const ev = eventBag();
  const rand = rngFactory(payload.seed || 1);
  const ids = [...Array(n * n).keys()];
  if (payload.timeMode === 'discrete_async') {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  const maxState = Number.isFinite(Number(payload.maxState)) ? Number(payload.maxState) : 3;
  for (const id of ids) {
    const x = id % n, y = Math.floor(id / n);
    const cn = countNeighbors(x, y, payload.timeMode === 'discrete_async' ? cells : base, payload);
    const old = base[id];
    const oldTrait = traits[id] || 0;
    const raw = compiled(old, cn.values, cn, payload.params || {}, rand, x, y, payload.t || 0, oldTrait, memory[id] || 0, payload.dt || 1);
    const out = normalize(raw, old, oldTrait, maxState);
    cells[id] = out.state;
    traits[id] = out.trait;
    if (out.memory !== undefined) memory[id] = out.memory;
    if (out.event === 'infection') ev.infections++;
    if (out.event === 'recovery') ev.recoveries++;
    if (out.event === 'mutation') ev.mutations++;
    if (out.event === 'birth') ev.births++;
    if (out.event === 'death') ev.deaths++;
    if (out.event === 'C14') ev.productsC14++;
    if (out.event === 'C16') ev.productsC16++;
    if (out.event === 'C18') ev.productsC18++;
    trackEvent(old, out.state, ev);
  }
  return { cells, traits, memory, events: ev };
}

self.onmessage = ev => {
  const msg = ev.data || {};
  try {
    if (msg.type === 'compile') {
      compileRule(msg.code || 'return cell;');
      self.postMessage({ requestId: msg.requestId, ok: true });
      return;
    }
    if (msg.type === 'step') {
      const result = runStep(msg);
      self.postMessage({ requestId: msg.requestId, ok: true, ...result });
      return;
    }
    throw new Error('Unknown worker request.');
  } catch (err) {
    self.postMessage({ requestId: msg.requestId, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
