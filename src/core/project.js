/* Foko Lab project contract — dependency-free, browser and Node compatible. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoProjectCore = api;
}(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const SCHEMA = 'foko.project/1';
  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const clone = value => JSON.parse(JSON.stringify(value));
  function finite(value, label) { const number = Number(value); if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`); return number; }
  function identifier(value, label) { const text = String(value || '').trim(); if (!IDENT.test(text)) throw new Error(`${label} must be a valid identifier.`); return text; }
  function parameter(value, name) {
    const row = Array.isArray(value) ? value : [value && value.value, value && value.min, value && value.max];
    const nominal = finite(row[0], `${name} value`), minimum = finite(row[1] == null ? nominal : row[1], `${name} minimum`), maximum = finite(row[2] == null ? nominal : row[2], `${name} maximum`);
    if (minimum > nominal || nominal > maximum) throw new Error(`${name} must satisfy minimum ≤ value ≤ maximum.`);
    return [nominal, minimum, maximum];
  }
  function normalizeModel(raw) {
    const input = clone(raw || {});
    const vars = (input.vars || []).map((value, index) => identifier(value, `State ${index + 1}`));
    if (!vars.length) throw new Error('A model needs at least one state.');
    if (new Set(vars).size !== vars.length) throw new Error('State identifiers must be unique.');
    const eqs = (input.eqs || input.equations || []).map(value => String(value == null ? '' : value).trim());
    if (eqs.length !== vars.length || eqs.some(value => !value)) throw new Error('Every state needs one non-empty right-hand side.');
    const y0 = (input.y0 || []).map((value, index) => finite(value, `Initial value for ${vars[index] || index + 1}`));
    if (y0.length !== vars.length) throw new Error('Every state needs one initial value.');
    const params = {};
    Object.keys(input.params || {}).forEach(name => { const id = identifier(name, 'Parameter'); params[id] = parameter(input.params[name], id); });
    const overlaps = vars.filter(name => Object.prototype.hasOwnProperty.call(params, name));
    if (overlaps.length) throw new Error(`Names cannot be both states and parameters: ${overlaps.join(', ')}.`);
    const t0 = finite(input.t0 == null ? 0 : input.t0, 'Start time'), t1 = finite(input.t1 == null ? 20 : input.t1, 'End time');
    if (t0 === t1) throw new Error('Start and end time must differ.');
    const points = Math.floor(finite(input.points == null ? 500 : input.points, 'Output points'));
    if (points < 20 || points > 20000) throw new Error('Output points must be between 20 and 20,000.');
    return {
      name: String(input.name || 'Untitled ODE model').trim() || 'Untitled ODE model',
      kind: 'ode', vars, eqs, y0, params, t0, t1, points,
      method: String(input.method || 'rk45').toLowerCase(),
      rtol: finite(input.rtol == null ? 1e-6 : input.rtol, 'Relative tolerance'),
      atol: finite(input.atol == null ? 1e-9 : input.atol, 'Absolute tolerance'),
      maxStep: input.maxStep == null || input.maxStep === '' || input.maxStep === 'auto' ? 'auto' : finite(input.maxStep, 'Maximum step'),
      initialStep: input.initialStep == null || input.initialStep === '' || input.initialStep === 'auto' ? 'auto' : finite(input.initialStep, 'Initial step'),
      description: String(input.description || input.narrative || ''),
      question: String(input.question || ''),
      assumptions: Array.isArray(input.assumptions) ? input.assumptions.map(String) : [],
      outputVar: vars.includes(input.outputVar) ? input.outputVar : vars[0],
      outputMetric: ['final', 'max', 'min', 'mean', 'range', 'integral'].includes(input.outputMetric) ? input.outputMetric : 'final'
    };
  }
  function create(raw) {
    const input = raw || {}, now = new Date().toISOString();
    return {
      schema: SCHEMA, version: 1,
      id: String(input.id || `project-${Date.now().toString(36)}`),
      name: String(input.name || input.model && input.model.name || 'Untitled project'),
      domain: String(input.domain || 'General dynamical systems'),
      description: String(input.description || ''),
      model: normalizeModel(input.model || input),
      experiments: Array.isArray(input.experiments) ? clone(input.experiments) : [],
      runs: Array.isArray(input.runs) ? clone(input.runs) : [],
      createdAt: String(input.createdAt || now), updatedAt: now
    };
  }
  function normalize(raw) {
    if (raw && raw.schema === SCHEMA) return create(raw);
    if (raw && raw.model) return create(raw);
    return create({ model: raw });
  }
  function toModelIR(projectLike) {
    const project = normalize(projectLike), model = project.model;
    const equations = {}; model.vars.forEach((name, index) => { equations[name] = model.eqs[index]; });
    return { schema: 'foko.model-ir/1', kind: 'direct-ode', name: model.name, description: model.description, states: model.vars.map((id, index) => ({ id, initial: model.y0[index] })), parameters: clone(model.params), equations, time: { start: model.t0, end: model.t1, points: model.points }, method: model.method };
  }
  function fromModelIR(ir, lowerer) {
    if (!lowerer || typeof lowerer.lower !== 'function') throw new Error('A Foko Model IR lowerer is required.');
    const lowered = lowerer.lower(ir);
    return create({ name: lowered.model.name || ir.name, description: lowered.model.narrative || ir.description, model: lowered.model });
  }
  function appendRun(projectLike, run) {
    const project = normalize(projectLike);
    project.runs.push(Object.assign({ id: `run-${project.runs.length + 1}`, createdAt: new Date().toISOString() }, clone(run || {})));
    project.updatedAt = new Date().toISOString();
    return project;
  }
  return Object.freeze({ SCHEMA, create, normalize, normalizeModel, toModelIR, fromModelIR, appendRun });
}));
