/* Shared, transactional model editing helpers. Views never own separate models. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FokoModelAuthoring = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  function review(raw, deps) {
    const { Project, Compute, math, Data } = deps; let model;
    try { model = Project.normalizeModel(raw); }
    catch (e) { return { ok: false, errors: [{ field: 'model', message: e.message }] }; }
    const errors = [];
    if (model.t1 <= model.t0) errors.push({ field: 'time', message: 'End time must be after start time.' });
    model.eqs.forEach((eq, i) => {
      try { Compute.compile({ ...model, eqs: [eq] }, math); }
      catch (e) { errors.push({ field: `equation-${i}`, message: `${model.vars[i]}: ${e.message}` }); }
    });
    (model.observables || []).forEach((o, i) => {
      try { Compute.compile({ ...model, eqs: [o.expression] }, math); }
      catch (e) { errors.push({ field: `observation-${i}`, message: `${o.id}: ${e.message}` }); }
    });
    if (!errors.length && Data) Data.compileObservables(model, Compute, math);
    return { ok: !errors.length, model, errors, notice: 'Syntax and numerical fields checked. Unit labels are recorded, not dimensionally verified.' };
  }
  function differences(a, b, path = '') {
    if (JSON.stringify(a) === JSON.stringify(b)) return [];
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
      return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => differences(a[k], b[k], path ? path + '.' + k : k));
    }
    return [{ field: path || 'experiment', before: a === undefined ? null : clone(a), after: b === undefined ? null : clone(b) }];
  }
  function experimentSnapshot(model, data) { return { model: clone(model), data: clone(data) }; }
  function gateAttachment(record, gate, interpretation, deps) {
    if (!['verify', 'infer', 'compare', 'release'].includes(gate)) throw new Error('Unknown evidence gate.');
    if (!record?.snapshot?.model || !record.result || typeof record.id !== 'string') throw new Error('Attach a complete run, not a result label.');
    return { schema: 'foko.programme-evidence/1', id: `${record.id}-${gate}`, gate,
      run: clone(record), recordedAt: new Date().toISOString(), interpretation: String(interpretation || ''),
      evidenceLevel: record.source === 'computed here' ? 'executed' : 'imported; not independently reproduced',
      snapshotFingerprint: deps.Project.fingerprint(record.snapshot), review: null,
      notice: 'Attached evidence is not a passed gate, a competency score, or biological validation.' };
  }
  return Object.freeze({ review, differences, experimentSnapshot, gateAttachment });
});
